/**
 * Polargraph Web Interface - Main Application JavaScript
 */

// Global state
const state = {
    connected: false,
    plotting: false,
    paused: false,
    motorsEnabled: true,
    jogDistance: 10,
    currentImagePath: null,
    preview: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    // Preview transform (separate from canvas pan/zoom)
    previewOffsetX: 0,
    previewOffsetY: 0,
    previewScale: 1,
    // Drag state
    isDragging: false,
    isResizing: false,
    dragStartX: 0,
    dragStartY: 0,
    dragMode: null,  // 'move', 'scale'
    // Gondola position for visualization
    gondola: { x: 0, y: 0, z: 90 }
};

// Socket.IO connection
const socket = io();

// DOM Elements
const elements = {
    // Status
    statusIndicator: document.getElementById('statusIndicator'),
    statusText: document.getElementById('statusText'),
    
    // Connection
    portSelect: document.getElementById('portSelect'),
    refreshPorts: document.getElementById('refreshPorts'),
    connectBtn: document.getElementById('connectBtn'),
    
    // Controls
    homeBtn: document.getElementById('homeBtn'),
    motorsBtn: document.getElementById('motorsBtn'),
    penUpBtn: document.getElementById('penUpBtn'),
    penDownBtn: document.getElementById('penDownBtn'),
    emergencyStop: document.getElementById('emergencyStop'),
    
    // Plot
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    plotStatus: document.getElementById('plotStatus'),
    rewindBtn: document.getElementById('rewindBtn'),
    playBtn: document.getElementById('playBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    stepBtn: document.getElementById('stepBtn'),
    
    // Canvas
    previewCanvas: document.getElementById('previewCanvas'),
    cursorPos: document.getElementById('cursorPos'),
    statLines: document.getElementById('statLines'),
    statDraw: document.getElementById('statDraw'),
    statTravel: document.getElementById('statTravel'),
    zoomIn: document.getElementById('zoomIn'),
    zoomOut: document.getElementById('zoomOut'),
    zoomFit: document.getElementById('zoomFit'),
    
    // File
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    exportGcode: document.getElementById('exportGcode'),
    exportSvg: document.getElementById('exportSvg'),
    
    // Generate
    generatorSelect: document.getElementById('generatorSelect'),
    generatorOptions: document.getElementById('generatorOptions'),
    generateBtn: document.getElementById('generateBtn'),
    
    // Convert
    convertPreview: document.getElementById('convertPreview'),
    converterSelect: document.getElementById('converterSelect'),
    converterOptions: document.getElementById('converterOptions'),
    convertBtn: document.getElementById('convertBtn'),
    
    // Console
    consoleOutput: document.getElementById('consoleOutput'),
    gcodeInput: document.getElementById('gcodeInput'),
    sendGcode: document.getElementById('sendGcode'),
    clearConsole: document.getElementById('clearConsole')
};

// Canvas context
const canvas = elements.previewCanvas;
const ctx = canvas.getContext('2d');

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initEventListeners();
    loadPorts();
    loadGenerators();
    loadConverters();
    loadSettings();
});

function initCanvas() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Mouse events for preview manipulation
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseUp);
    canvas.addEventListener('wheel', onCanvasWheel);
    
    drawCanvas();
}

function onCanvasMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    state.dragStartX = e.clientX - rect.left;
    state.dragStartY = e.clientY - rect.top;
    
    if (e.shiftKey) {
        // Shift+drag = scale
        state.dragMode = 'scale';
        state.isResizing = true;
    } else {
        // Normal drag = move
        state.dragMode = 'move';
        state.isDragging = true;
    }
    canvas.style.cursor = state.dragMode === 'scale' ? 'nwse-resize' : 'grabbing';
}

function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update cursor position display
    const worldPos = screenToWorld(x, y);
    elements.cursorPos.textContent = `X: ${worldPos.x.toFixed(1)} Y: ${worldPos.y.toFixed(1)}`;
    
    if (state.isDragging && state.dragMode === 'move') {
        const dx = x - state.dragStartX;
        const dy = y - state.dragStartY;
        state.previewOffsetX += dx / getCanvasScale();
        state.previewOffsetY -= dy / getCanvasScale();  // Invert Y
        state.dragStartX = x;
        state.dragStartY = y;
        drawCanvas();
    } else if (state.isResizing && state.dragMode === 'scale') {
        const dy = state.dragStartY - y;  // Up = bigger
        const scaleFactor = 1 + dy * 0.005;
        state.previewScale = Math.max(0.1, Math.min(5, state.previewScale * scaleFactor));
        state.dragStartY = y;
        drawCanvas();
    }
}

function onCanvasMouseUp() {
    state.isDragging = false;
    state.isResizing = false;
    state.dragMode = null;
    canvas.style.cursor = 'crosshair';
}

function onCanvasWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    if (e.shiftKey) {
        // Shift+scroll = resize preview
        state.previewScale = Math.max(0.1, Math.min(5, state.previewScale * delta));
    } else {
        // Normal scroll = zoom canvas
        state.zoom = Math.max(0.1, Math.min(10, state.zoom * delta));
    }
    drawCanvas();
}

function getCanvasScale() {
    // Calculate the scale factor from world to screen
    const workWidth = window.plotterSettings?.work_width || 841;
    const workHeight = window.plotterSettings?.work_height || 1189;
    const scaleX = canvas.width / workWidth;
    const scaleY = canvas.height / workHeight;
    return Math.min(scaleX, scaleY) * 0.9 * state.zoom;
}

function screenToWorld(screenX, screenY) {
    const workWidth = window.plotterSettings?.work_width || 841;
    const workHeight = window.plotterSettings?.work_height || 1189;
    const scale = getCanvasScale();
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    
    return {
        x: (screenX - offsetX) / scale,
        y: -(screenY - offsetY) / scale  // Invert Y
    };
}

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height - 72; // Subtract toolbar and stats height
    drawCanvas();
}

function initEventListeners() {
    // Connection
    elements.refreshPorts.addEventListener('click', loadPorts);
    elements.connectBtn.addEventListener('click', toggleConnection);
    
    // Controls
    elements.homeBtn.addEventListener('click', () => sendCommand('/api/home', 'POST'));
    elements.motorsBtn.addEventListener('click', toggleMotors);
    elements.penUpBtn.addEventListener('click', () => sendCommand('/api/pen', 'POST', { action: 'up' }));
    elements.penDownBtn.addEventListener('click', () => sendCommand('/api/pen', 'POST', { action: 'down' }));
    elements.emergencyStop.addEventListener('click', emergencyStop);
    
    // Jog
    document.querySelectorAll('.jog-btn').forEach(btn => {
        btn.addEventListener('click', () => jog(btn.dataset.dir));
    });
    
    document.querySelectorAll('.jog-distance .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.jog-distance .btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.jogDistance = parseInt(btn.dataset.distance);
        });
    });
    
    // Plot controls
    elements.rewindBtn.addEventListener('click', () => sendCommand('/api/plot/rewind', 'POST'));
    elements.playBtn.addEventListener('click', startPlot);
    elements.pauseBtn.addEventListener('click', pausePlot);
    elements.stepBtn.addEventListener('click', () => sendCommand('/api/plot/step', 'POST'));
    
    // Canvas zoom
    elements.zoomIn.addEventListener('click', () => { state.zoom *= 1.2; drawCanvas(); });
    elements.zoomOut.addEventListener('click', () => { state.zoom /= 1.2; drawCanvas(); });
    elements.zoomFit.addEventListener('click', () => { state.zoom = 1; state.panX = 0; state.panY = 0; drawCanvas(); });
    
    // Preview manipulation
    document.getElementById('resetPreview')?.addEventListener('click', resetPreviewTransform);
    document.getElementById('applyTransform')?.addEventListener('click', applyPreviewTransform);
    
    // File upload
    elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
    elements.uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadZone.classList.add('dragover');
    });
    elements.uploadZone.addEventListener('dragleave', () => {
        elements.uploadZone.classList.remove('dragover');
    });
    elements.uploadZone.addEventListener('drop', handleFileDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Export
    elements.exportGcode.addEventListener('click', exportGcode);
    elements.exportSvg.addEventListener('click', exportSvg);
    
    // Generate
    elements.generatorSelect.addEventListener('change', updateGeneratorOptions);
    elements.generateBtn.addEventListener('click', generatePattern);
    
    // Convert
    elements.converterSelect.addEventListener('change', updateConverterOptions);
    elements.convertBtn.addEventListener('click', convertImage);
    
    // Console
    elements.sendGcode.addEventListener('click', sendGcodeCommand);
    elements.gcodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendGcodeCommand();
    });
    elements.clearConsole.addEventListener('click', () => {
        elements.consoleOutput.innerHTML = '';
    });
    
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
    
    // Settings
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('clearUploads')?.addEventListener('click', clearUploads);
}

async function clearUploads() {
    const result = await sendCommand('/api/clear_uploads', 'POST');
    if (result.success) {
        logConsole('Uploads cleared', 'msg-in');
        // Clear the convert preview
        if (elements.convertPreview) {
            elements.convertPreview.innerHTML = '<p style="color: #9ca3af;">Upload an image to convert</p>';
        }
        state.currentImagePath = null;
    }
}

// ============================================================================
// Socket Events
// ============================================================================

socket.on('connect', () => {
    logConsole('Connected to server', 'msg-in');
});

socket.on('serial_message', (data) => {
    const msg = data.message;
    if (msg.startsWith('TX:')) {
        logConsole(msg.substring(4), 'msg-out');
    } else if (msg.startsWith('ERROR:')) {
        logConsole(msg, 'msg-error');
    } else {
        logConsole(msg, 'msg-in');
    }
});

socket.on('progress', (data) => {
    updateProgress(data.current, data.total, data.percent);
    
    // Update gondola position for visualization
    if (data.gondola) {
        state.gondola = data.gondola;
        drawCanvas();
    }
});

socket.on('plot_complete', (data) => {
    state.plotting = false;
    state.paused = false;
    updatePlotButtons();
    logConsole(data.message, 'msg-in');
});

// ============================================================================
// API Functions
// ============================================================================

async function sendCommand(url, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);
        
        const response = await fetch(url, options);
        return await response.json();
    } catch (error) {
        logConsole(`Error: ${error.message}`, 'msg-error');
        return { success: false, error: error.message };
    }
}

async function loadPorts() {
    const result = await sendCommand('/api/ports');
    if (result.ports) {
        elements.portSelect.innerHTML = '<option value="">Select port...</option>';
        result.ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port;
            option.textContent = port;
            elements.portSelect.appendChild(option);
        });
    }
}

async function toggleConnection() {
    if (state.connected) {
        await sendCommand('/api/disconnect', 'POST');
        setConnectionStatus(false);
    } else {
        const port = elements.portSelect.value;
        if (!port) {
            alert('Please select a port');
            return;
        }
        const result = await sendCommand('/api/connect', 'POST', { port });
        if (result.success) {
            setConnectionStatus(true);
        } else {
            logConsole(`Connection failed: ${result.error}`, 'msg-error');
        }
    }
}

function setConnectionStatus(connected) {
    state.connected = connected;
    elements.statusIndicator.classList.toggle('connected', connected);
    elements.statusText.textContent = connected ? 'Connected' : 'Disconnected';
    elements.connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
    
    // Enable/disable controls
    const controls = [elements.homeBtn, elements.motorsBtn, elements.penUpBtn, 
                      elements.penDownBtn, elements.emergencyStop];
    controls.forEach(btn => btn.disabled = !connected);
    
    document.querySelectorAll('.jog-btn').forEach(btn => btn.disabled = !connected);
}

async function toggleMotors() {
    state.motorsEnabled = !state.motorsEnabled;
    await sendCommand('/api/motors', 'POST', { enable: state.motorsEnabled });
    elements.motorsBtn.classList.toggle('active', state.motorsEnabled);
}

async function emergencyStop() {
    await sendCommand('/api/emergency_stop', 'POST');
    state.plotting = false;
    state.paused = false;
    updatePlotButtons();
    logConsole('EMERGENCY STOP', 'msg-error');
}

function jog(direction) {
    if (!state.connected) {
        logConsole('Not connected - cannot jog', 'msg-error');
        return;
    }
    
    const d = state.jogDistance;
    let x = 0, y = 0;
    
    switch (direction) {
        case 'up': y = d; break;
        case 'down': y = -d; break;
        case 'left': x = -d; break;
        case 'right': x = d; break;
        case 'up-left': x = -d; y = d; break;
        case 'up-right': x = d; y = d; break;
        case 'down-left': x = -d; y = -d; break;
        case 'down-right': x = d; y = -d; break;
        case 'center': 
            logConsole(`Jog to center`, 'msg-out');
            sendCommand('/api/goto', 'POST', { x: 0, y: 0 });
            return;
    }
    
    logConsole(`Jog ${direction}: X=${x} Y=${y}`, 'msg-out');
    sendCommand('/api/jog', 'POST', { x, y });
}

// ============================================================================
// Plot Functions
// ============================================================================

async function startPlot() {
    if (state.paused) {
        await sendCommand('/api/plot/resume', 'POST');
    } else {
        await sendCommand('/api/plot/start', 'POST');
    }
    state.plotting = true;
    state.paused = false;
    updatePlotButtons();
}

async function pausePlot() {
    await sendCommand('/api/plot/pause', 'POST');
    state.paused = true;
    updatePlotButtons();
}

function updatePlotButtons() {
    elements.playBtn.disabled = !state.connected || (state.plotting && !state.paused);
    elements.pauseBtn.disabled = !state.plotting || state.paused;
    elements.stepBtn.disabled = !state.connected || state.plotting;
    elements.rewindBtn.disabled = state.plotting;
}

function updateProgress(current, total, percent) {
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = `${percent}% (${current}/${total})`;
    elements.plotStatus.textContent = `Line ${current} of ${total}`;
}

// ============================================================================
// File Functions
// ============================================================================

function handleFileDrop(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) uploadFile(file);
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.type === 'image') {
                // Image needs conversion
                state.currentImagePath = result.filepath;
                elements.convertPreview.innerHTML = `<img src="/uploads/${encodeURIComponent(file.name)}" alt="Preview">`;
                elements.convertBtn.disabled = false;
                
                // Switch to convert tab
                document.querySelector('[data-tab="convert"]').click();
                logConsole(result.message, 'msg-in');
            } else {
                // Vector or G-code loaded
                state.preview = result.preview;
                updatePreview(result.preview);
                elements.plotStatus.textContent = `${result.lines} lines loaded`;
                logConsole(result.message, 'msg-in');
            }
        } else {
            logConsole(`Upload failed: ${result.error}`, 'msg-error');
        }
    } catch (error) {
        logConsole(`Upload error: ${error.message}`, 'msg-error');
    }
}

async function exportGcode() {
    const result = await sendCommand('/api/export/gcode');
    if (result.success) {
        downloadFile('drawing.gcode', result.gcode, 'text/plain');
    }
}

async function exportSvg() {
    const result = await sendCommand('/api/export/svg');
    if (result.success) {
        downloadFile('drawing.svg', result.svg, 'image/svg+xml');
    }
}

function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================================
// Generator Functions
// ============================================================================

async function loadGenerators() {
    const result = await sendCommand('/api/generators');
    if (result.generators) {
        result.generators.forEach(gen => {
            const option = document.createElement('option');
            option.value = gen.id;
            option.textContent = gen.name;
            option.dataset.options = JSON.stringify(gen.options || {});
            elements.generatorSelect.appendChild(option);
        });
        updateGeneratorOptions();
    }
}

function updateGeneratorOptions() {
    const selected = elements.generatorSelect.selectedOptions[0];
    if (!selected) return;
    
    const options = JSON.parse(selected.dataset.options || '{}');
    elements.generatorOptions.innerHTML = '';
    
    Object.entries(options).forEach(([key, config]) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        let input;
        if (config.type === 'bool') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = config.default;
        } else if (config.type === 'string') {
            input = document.createElement('input');
            input.type = 'text';
            input.value = config.default;
            input.className = 'input';
        } else {
            input = document.createElement('input');
            input.type = 'number';
            input.value = config.default;
            if (config.min !== undefined) input.min = config.min;
            if (config.max !== undefined) input.max = config.max;
            input.step = config.type === 'int' ? 1 : 0.1;
            input.className = 'input';
        }
        input.id = `gen_${key}`;
        
        group.appendChild(label);
        group.appendChild(input);
        elements.generatorOptions.appendChild(group);
    });
}

async function generatePattern() {
    const generator = elements.generatorSelect.value;
    const options = {};
    
    elements.generatorOptions.querySelectorAll('input').forEach(input => {
        const key = input.id.replace('gen_', '');
        if (input.type === 'checkbox') {
            options[key] = input.checked;
        } else if (input.type === 'number') {
            options[key] = parseFloat(input.value);
        } else {
            options[key] = input.value;
        }
    });
    
    const result = await sendCommand('/api/generate', 'POST', { generator, options });
    
    if (result.success) {
        state.preview = result.preview;
        updatePreview(result.preview);
        elements.plotStatus.textContent = `${result.lines} lines generated`;
        logConsole(result.message, 'msg-in');
    } else {
        logConsole(`Generate failed: ${result.error}`, 'msg-error');
    }
}

// ============================================================================
// Converter Functions
// ============================================================================

async function loadConverters() {
    const result = await sendCommand('/api/converters');
    if (result.converters) {
        result.converters.forEach(conv => {
            const option = document.createElement('option');
            option.value = conv.id;
            option.textContent = conv.name;
            option.dataset.options = JSON.stringify(conv.options || {});
            elements.converterSelect.appendChild(option);
        });
        updateConverterOptions();
    }
}

function updateConverterOptions() {
    const selected = elements.converterSelect.selectedOptions[0];
    if (!selected) return;
    
    const options = JSON.parse(selected.dataset.options || '{}');
    elements.converterOptions.innerHTML = '';
    
    Object.entries(options).forEach(([key, config]) => {
        const group = document.createElement('div');
        group.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        let input;
        if (config.type === 'bool') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = config.default;
        } else {
            input = document.createElement('input');
            input.type = 'number';
            input.value = config.default;
            if (config.min !== undefined) input.min = config.min;
            if (config.max !== undefined) input.max = config.max;
            input.step = config.type === 'int' ? 1 : 0.1;
            input.className = 'input';
        }
        input.id = `conv_${key}`;
        
        group.appendChild(label);
        group.appendChild(input);
        elements.converterOptions.appendChild(group);
    });
}

async function convertImage() {
    if (!state.currentImagePath) {
        alert('Please upload an image first');
        return;
    }
    
    const algorithm = elements.converterSelect.value;
    const options = {};
    
    elements.converterOptions.querySelectorAll('input').forEach(input => {
        const key = input.id.replace('conv_', '');
        if (input.type === 'checkbox') {
            options[key] = input.checked;
        } else {
            options[key] = parseFloat(input.value);
        }
    });
    
    const result = await sendCommand('/api/convert_image', 'POST', {
        filepath: state.currentImagePath,
        algorithm,
        options
    });
    
    if (result.success) {
        state.preview = result.preview;
        updatePreview(result.preview);
        elements.plotStatus.textContent = `${result.lines} lines converted`;
        logConsole(result.message, 'msg-in');
    } else {
        logConsole(`Convert failed: ${result.error}`, 'msg-error');
    }
}

// ============================================================================
// Settings Functions
// ============================================================================

async function loadSettings() {
    const result = await sendCommand('/api/settings');
    if (result) {
        document.getElementById('machineWidth').value = result.machine_width || 1219.2;
        document.getElementById('machineHeight').value = result.machine_height || 1524;
        document.getElementById('limitLeft').value = result.limit_left || -420.5;
        document.getElementById('limitRight').value = result.limit_right || 420.5;
        document.getElementById('limitTop').value = result.limit_top || 594.5;
        document.getElementById('limitBottom').value = result.limit_bottom || -594.5;
        document.getElementById('penUpAngle').value = result.pen_angle_up || 90;
        document.getElementById('penDownAngle').value = result.pen_angle_down || 25;
        document.getElementById('feedTravel').value = result.feed_rate_travel || 3000;
        document.getElementById('feedDraw').value = result.feed_rate_draw || 2000;
    }
}

async function saveSettings() {
    const settings = {
        machine_width: parseFloat(document.getElementById('machineWidth').value),
        machine_height: parseFloat(document.getElementById('machineHeight').value),
        limit_left: parseFloat(document.getElementById('limitLeft').value),
        limit_right: parseFloat(document.getElementById('limitRight').value),
        limit_top: parseFloat(document.getElementById('limitTop').value),
        limit_bottom: parseFloat(document.getElementById('limitBottom').value),
        pen_angle_up: parseFloat(document.getElementById('penUpAngle').value),
        pen_angle_down: parseFloat(document.getElementById('penDownAngle').value),
        feed_rate_travel: parseFloat(document.getElementById('feedTravel').value),
        feed_rate_draw: parseFloat(document.getElementById('feedDraw').value)
    };
    
    const result = await sendCommand('/api/settings', 'POST', settings);
    if (result.success) {
        logConsole('Settings saved', 'msg-in');
    }
}

// ============================================================================
// Console Functions
// ============================================================================

function logConsole(message, className = '') {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = message;
    elements.consoleOutput.appendChild(line);
    elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
}

async function sendGcodeCommand() {
    const command = elements.gcodeInput.value.trim();
    if (!command) return;
    
    logConsole(command, 'msg-out');
    await sendCommand('/api/send_gcode', 'POST', { command });
    elements.gcodeInput.value = '';
}

// ============================================================================
// Canvas Functions
// ============================================================================

function drawCanvas() {
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);
    
    // Transform for zoom and pan
    ctx.save();
    ctx.translate(w / 2 + state.panX, h / 2 + state.panY);
    ctx.scale(state.zoom, -state.zoom); // Flip Y
    
    // Draw work area grid
    drawGrid();
    
    // Draw work area boundary
    drawWorkArea();
    
    // Draw polargraph machine (motors, belts, gondola)
    drawMachine();
    
    // Draw preview paths with preview transform applied
    if (state.preview && state.preview.paths) {
        ctx.save();
        // Apply preview offset and scale
        ctx.translate(state.previewOffsetX, state.previewOffsetY);
        ctx.scale(state.previewScale, state.previewScale);
        drawPaths(state.preview.paths);
        ctx.restore();
    }
    
    // Draw gondola on top
    drawGondola();
    
    ctx.restore();
}

function drawMachine() {
    // Minimal machine visualization - just work area boundary markers
    // No motors, belts, or counterweights for a cleaner look
}

function drawGondola() {
    // Only show gondola indicator while plotting
    if (!state.plotting || !state.gondola) return;
    
    const gx = state.gondola.x || 0;
    const gy = state.gondola.y || 0;
    const penDown = (state.gondola.z || 90) < 50;
    
    // Simple small indicator dot
    const dotSize = 6 / state.zoom;
    
    // Outer ring
    ctx.strokeStyle = penDown ? '#ef4444' : '#3b82f6';
    ctx.lineWidth = 2 / state.zoom;
    ctx.beginPath();
    ctx.arc(gx, gy, dotSize, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner dot (only when pen down)
    if (penDown) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(gx, gy, dotSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawGrid() {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1 / state.zoom;
    
    const gridSize = 50;
    
    for (let x = -500; x <= 500; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -700);
        ctx.lineTo(x, 700);
        ctx.stroke();
    }
    
    for (let y = -700; y <= 700; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-500, y);
        ctx.lineTo(500, y);
        ctx.stroke();
    }
    
    // Axes
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2 / state.zoom;
    
    ctx.beginPath();
    ctx.moveTo(-500, 0);
    ctx.lineTo(500, 0);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, -700);
    ctx.lineTo(0, 700);
    ctx.stroke();
}

function drawWorkArea() {
    // Default A0 work area
    const left = -420.5;
    const right = 420.5;
    const top = 594.5;
    const bottom = -594.5;
    
    ctx.strokeStyle = '#0066cc';
    ctx.lineWidth = 2 / state.zoom;
    ctx.setLineDash([10 / state.zoom, 5 / state.zoom]);
    
    ctx.beginPath();
    ctx.rect(left, bottom, right - left, top - bottom);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Machine attachment points (simplified polargraph)
    ctx.fillStyle = '#6366f1';
    const machineWidth = 609.6; // Half of 48 inches
    
    ctx.beginPath();
    ctx.arc(-machineWidth, 700, 8 / state.zoom, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(machineWidth, 700, 8 / state.zoom, 0, Math.PI * 2);
    ctx.fill();
}

function drawPaths(paths) {
    paths.forEach(path => {
        if (path.points.length < 2) return;
        
        ctx.strokeStyle = path.color || '#1a1a1a';
        ctx.lineWidth = (path.diameter || 0.8) / state.zoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        
        ctx.stroke();
    });
}

function updatePreview(preview) {
    if (!preview) return;
    
    state.preview = preview;
    
    // Update stats
    if (preview.stats) {
        elements.statLines.textContent = preview.stats.lines || 0;
        elements.statDraw.textContent = Math.round(preview.stats.draw_distance || 0);
        elements.statTravel.textContent = Math.round(preview.stats.travel_distance || 0);
    }
    
    drawCanvas();
}

function resetPreviewTransform() {
    state.previewOffsetX = 0;
    state.previewOffsetY = 0;
    state.previewScale = 1;
    drawCanvas();
    logConsole('Preview reset', 'msg-in');
}

async function applyPreviewTransform() {
    if (!state.preview || !state.preview.paths) {
        logConsole('No preview to transform', 'msg-error');
        return;
    }
    
    const result = await sendCommand('/api/transform', 'POST', {
        offsetX: state.previewOffsetX,
        offsetY: state.previewOffsetY,
        scale: state.previewScale
    });
    
    if (result.success) {
        // Update preview with transformed paths
        state.preview = result.preview;
        // Reset transform state since it's now baked in
        state.previewOffsetX = 0;
        state.previewOffsetY = 0;
        state.previewScale = 1;
        drawCanvas();
        logConsole('Transform applied to paths', 'msg-in');
    } else {
        logConsole(`Transform failed: ${result.error}`, 'msg-error');
    }
}

