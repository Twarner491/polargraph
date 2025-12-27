/**
 * Polargraph Web Interface
 */

// Home Assistant webhook URL - set by build_static.py for remote mode
// When building static site, this gets overwritten with actual webhook URL
// For local mode (plotter.local), leave as empty string
var POLARGRAPH_WEBHOOK_URL = "";

// Check if we're in client-side mode (static site or server unreachable)
// In static deployment, we detect by checking if we're on the static domain or if webhook is set
let CLIENT_SIDE_MODE = !!POLARGRAPH_WEBHOOK_URL || window.location.hostname === 'plotter.onethreenine.net' || window.location.protocol === 'file:';

const state = {
    connected: false,
    plotting: false,
    paused: false,
    motorsEnabled: true,
    jogDistance: 10,
    currentImagePath: null,
    currentImageElement: null,  // For client-side conversion
    preview: null,
    currentGcode: [],  // Store generated G-code for client-side mode
    zoom: 1,
    minZoom: 0.2,
    maxZoom: 5,
    previewOffsetX: 0,
    previewOffsetY: 0,
    previewScale: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    gondola: { x: 0, y: 0, z: 90 },
    openPanel: null,
    mode: 'generate', // 'generate' or 'upload'
    // Menu drag state
    menuDragging: false,
    menuStartX: 0,
    menuStartY: 0,
    menuOffsetX: 0,
    menuOffsetY: 0
};

// Socket.IO connection
// Only connect to socket.io if not in client-side mode
const socket = CLIENT_SIDE_MODE ? null : io();

// DOM Elements
const elements = {
    // Status
    statusDot: document.getElementById('statusDot'),
    statusLabel: document.getElementById('statusLabel'),
    
    // Navigation
    navItems: document.querySelectorAll('.nav-item'),
    sidePanel: document.getElementById('sidePanel'),
    
    // Menu
    createMenu: document.getElementById('createMenu'),
    menuDragHandle: document.getElementById('menuDragHandle'),
    
    // Mode Toggle
    modeGenerate: document.getElementById('modeGenerate'),
    modeUpload: document.getElementById('modeUpload'),
    menuContent: document.getElementById('menuContent'),
    menuFooter: document.getElementById('menuFooter'),
    
    // Generate
    generatorSelect: document.getElementById('generatorSelect'),
    generatorOptions: document.getElementById('generatorOptions'),
    generateBtn: document.getElementById('generateBtn'),
    
    // Upload/Convert
    uploadZone: document.getElementById('uploadZone'),
    fileInput: document.getElementById('fileInput'),
    convertSection: document.getElementById('convertSection'),
    convertPreview: document.getElementById('convertPreview'),
    converterSelect: document.getElementById('converterSelect'),
    converterOptions: document.getElementById('converterOptions'),
    convertBtn: document.getElementById('convertBtn'),
    
    // Export
    exportGcode: document.getElementById('exportGcode'),
    exportSvg: document.getElementById('exportSvg'),

    // Canvas
    workspaceContainer: document.getElementById('workspaceContainer'),
    workspaceTransform: document.getElementById('workspaceTransform'),
    previewCanvas: document.getElementById('previewCanvas'),
    cursorPos: document.getElementById('cursorPos'),
    statLines: document.getElementById('statLines'),
    zoomLevel: document.getElementById('zoomLevel'),
    zoomIn: document.getElementById('zoomIn'),
    zoomOut: document.getElementById('zoomOut'),
    zoomFit: document.getElementById('zoomFit'),

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
    
    // Console
    consoleOutput: document.getElementById('consoleOutput'),
    gcodeInput: document.getElementById('gcodeInput'),
    sendGcode: document.getElementById('sendGcode')
};

// Canvas context
const canvas = elements.previewCanvas;
const ctx = canvas ? canvas.getContext('2d') : null;
console.log('Canvas init:', canvas ? 'found' : 'NOT FOUND', 'ctx:', ctx ? 'ok' : 'FAILED');

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initEventListeners();
    
    if (CLIENT_SIDE_MODE) {
        // In client-side mode, use local data instead of server calls
        initClientSideMode();
    } else {
        loadPorts();
        loadGenerators();
        loadConverters();
        loadSettings();
        checkConnectionStatus();
    }
    
    setMode('generate');
});

function initClientSideMode() {
    console.log('Running in client-side mode');
    
    // Populate generators from PatternGenerator
    const generators = Object.entries(PatternGenerator.GENERATORS).map(([id, v]) => ({ id, ...v }));
    populateGeneratorSelect(generators);
    
    // Populate converters from ImageConverter  
    const converters = Object.entries(ImageConverter.CONVERTERS).map(([id, v]) => ({ id, ...v }));
    populateConverterSelect(converters);
    
    // Use default settings
    state.settings = { ...DEFAULT_SETTINGS };
    
    // Update UI for remote mode
    elements.statusLabel.textContent = 'Remote';
    elements.statusDot.className = 'status-dot remote';
    
    // Hide connect button in client-side mode
    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) connectBtn.style.display = 'none';
    
    logConsole('Remote mode: Generation happens in browser', 'msg-info');
}

function initCanvas() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Mouse events for canvas
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    canvas.addEventListener('mousemove', onCanvasMouseMove);
    canvas.addEventListener('mouseup', onCanvasMouseUp);
    canvas.addEventListener('mouseleave', onCanvasMouseUp);
    
    // Zoom controls
    elements.workspaceContainer.addEventListener('wheel', onContainerWheel);
    
    drawCanvas();
}

function resizeCanvas() {
    // Get the paper element dimensions
    const paper = document.querySelector('.paper-sheet');
    if (paper) {
        const baseWidth = paper.offsetWidth;
        const baseHeight = paper.offsetHeight;
        const dpr = window.devicePixelRatio;
        
        canvas.width = baseWidth * dpr;
        canvas.height = baseHeight * dpr;
        canvas.style.width = baseWidth + 'px';
        canvas.style.height = baseHeight + 'px';
    }
    drawCanvas();
}

function initEventListeners() {
    // Navigation (Machine/Console/Settings)
    elements.navItems.forEach(item => {
        item.addEventListener('click', () => togglePanel(item.dataset.panel));
    });

    // Menu dragging
    elements.menuDragHandle.addEventListener('mousedown', onMenuDragStart);
    document.addEventListener('mousemove', onMenuDrag);
    document.addEventListener('mouseup', onMenuDragEnd);
    
    // Position menu initially over left edge of frame
    positionMenuOverFrame();
    window.addEventListener('resize', positionMenuOverFrame);

    // Mode toggle
    elements.modeGenerate.addEventListener('click', () => setMode('generate'));
    elements.modeUpload.addEventListener('click', () => setMode('upload'));

    // Connection
    elements.refreshPorts.addEventListener('click', loadPorts);
    elements.connectBtn.addEventListener('click', toggleConnection);
    
    // Controls
    elements.homeBtn.addEventListener('click', () => {
        logConsole('Home', 'msg-out');
        sendCommand('/api/home', 'POST');
    });
    elements.motorsBtn.addEventListener('click', toggleMotors);
    elements.penUpBtn.addEventListener('click', () => {
        logConsole('Pen Up', 'msg-out');
        sendCommand('/api/pen', 'POST', { action: 'up' });
    });
    elements.penDownBtn.addEventListener('click', () => {
        logConsole('Pen Down', 'msg-out');
        sendCommand('/api/pen', 'POST', { action: 'down' });
    });
    elements.emergencyStop.addEventListener('click', emergencyStop);
    
    // Jog
    document.querySelectorAll('.jog-btn').forEach(btn => {
        btn.addEventListener('click', () => jog(btn.dataset.dir));
    });
    
    document.querySelectorAll('.dist-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.dist-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.jogDistance = parseInt(e.currentTarget.dataset.distance);
        });
    });
    
    // Plot controls
    elements.rewindBtn.addEventListener('click', () => {
        logConsole('Rewind', 'msg-out');
        sendCommand('/api/plot/rewind', 'POST');
    });
    elements.playBtn.addEventListener('click', startPlot);
    elements.pauseBtn.addEventListener('click', pausePlot);
    elements.stepBtn.addEventListener('click', () => {
        logConsole('Step', 'msg-out');
        sendCommand('/api/plot/step', 'POST');
    });
    
    // Zoom controls
    elements.zoomIn.addEventListener('click', () => setZoom(state.zoom * 1.25));
    elements.zoomOut.addEventListener('click', () => setZoom(state.zoom / 1.25));
    elements.zoomFit.addEventListener('click', () => setZoom(1));
    
    // File upload - main drop zone
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
    
    // File upload - convert preview as replacement drop zone
    elements.convertPreview.addEventListener('click', () => elements.fileInput.click());
    elements.convertPreview.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.convertPreview.classList.add('dragover');
    });
    elements.convertPreview.addEventListener('dragleave', () => {
        elements.convertPreview.classList.remove('dragover');
    });
    elements.convertPreview.addEventListener('drop', handleFileDrop);
    
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
    
    // Settings
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('clearUploads').addEventListener('click', clearUploads);
}

// ============================================================================
// Mode Toggle
// ============================================================================

function setMode(mode) {
    state.mode = mode;
    
    // Update toggle buttons
    elements.modeGenerate.classList.toggle('active', mode === 'generate');
    elements.modeUpload.classList.toggle('active', mode === 'upload');
    
    // Show/hide content
    document.getElementById('content-generate').classList.toggle('active', mode === 'generate');
    document.getElementById('content-upload').classList.toggle('active', mode === 'upload');
}

// ============================================================================
// Panel Toggle
// ============================================================================

function togglePanel(panelId) {
    const panelContent = document.getElementById(`panel-${panelId}`);
    
    if (state.openPanel === panelId) {
        // Close
        elements.sidePanel.classList.remove('open');
        document.querySelector(`.nav-item[data-panel="${panelId}"]`).classList.remove('active');
        if (panelContent) panelContent.classList.remove('active');
        state.openPanel = null;
    } else {
        // Close previous
        if (state.openPanel) {
            const prevPanel = document.getElementById(`panel-${state.openPanel}`);
            if (prevPanel) prevPanel.classList.remove('active');
            document.querySelector(`.nav-item[data-panel="${state.openPanel}"]`).classList.remove('active');
        }
        // Open new
        elements.sidePanel.classList.add('open');
        if (panelContent) panelContent.classList.add('active');
        document.querySelector(`.nav-item[data-panel="${panelId}"]`).classList.add('active');
        state.openPanel = panelId;
    }
    // Resize canvas after panel transition
    setTimeout(resizeCanvas, 280);
}

// ============================================================================
// Menu Dragging
// ============================================================================

function positionMenuOverFrame() {
    const frame = document.querySelector('.polargraph-frame');
    const menu = elements.createMenu;
    if (!frame || !menu) return;
    
    const frameRect = frame.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const bodyRect = document.querySelector('.body-panel').getBoundingClientRect();
    
    // Position menu further left, mostly outside the frame
    const targetX = frameRect.left - bodyRect.left - menuRect.width * 0.7;
    const targetY = frameRect.top - bodyRect.top + (frameRect.height - menuRect.height) / 2;
    
    menu.style.left = Math.max(16, targetX) + 'px';
    menu.style.top = targetY + 'px';
    menu.style.transform = 'none';
}

function onMenuDragStart(e) {
    state.menuDragging = true;
    const menu = elements.createMenu;
    const rect = menu.getBoundingClientRect();
    const bodyRect = document.querySelector('.body-panel').getBoundingClientRect();
    
    state.menuStartX = e.clientX;
    state.menuStartY = e.clientY;
    state.menuOffsetX = rect.left - bodyRect.left;
    state.menuOffsetY = rect.top - bodyRect.top;
    
    menu.classList.add('dragging');
    e.preventDefault();
}

function onMenuDrag(e) {
    if (!state.menuDragging) return;
    
    const dx = e.clientX - state.menuStartX;
    const dy = e.clientY - state.menuStartY;
    
    const menu = elements.createMenu;
    menu.style.left = (state.menuOffsetX + dx) + 'px';
    menu.style.top = (state.menuOffsetY + dy) + 'px';
    menu.style.transform = 'none';
}

function onMenuDragEnd() {
    if (!state.menuDragging) return;
    state.menuDragging = false;
    elements.createMenu.classList.remove('dragging');
}

// ============================================================================
// Zoom / Transform
// ============================================================================

function setZoom(zoom) {
    state.zoom = Math.max(state.minZoom, Math.min(state.maxZoom, zoom));
    
    // Frame scales subtly (sqrt for gentle scaling), content zooms fully
    const frameScale = 1 + (state.zoom - 1) * 0.15; // Frame only scales 15% of the zoom
    elements.workspaceTransform.style.transform = `scale(${frameScale})`;
    
    elements.zoomLevel.textContent = Math.round(state.zoom * 100) + '%';
    // Redraw canvas at full zoom level for detail
    drawCanvas();
}

function onContainerWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(state.zoom * delta);
}

// ============================================================================
// Canvas Events
// ============================================================================

function onCanvasMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    state.dragStartX = e.clientX - rect.left;
    state.dragStartY = e.clientY - rect.top;
    
    if (e.shiftKey) {
        state.isDragging = true;
        state.dragMode = 'scale';
    } else {
        state.isDragging = true;
        state.dragMode = 'move';
    }
    canvas.style.cursor = 'grabbing';
}

function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update cursor position
    const worldPos = screenToWorld(x, y);
    elements.cursorPos.textContent = `X: ${worldPos.x.toFixed(1)} Y: ${worldPos.y.toFixed(1)}`;
    
    if (state.isDragging) {
        if (state.dragMode === 'move') {
            const dx = x - state.dragStartX;
            const dy = y - state.dragStartY;
            state.previewOffsetX += dx / getCanvasScale();
            state.previewOffsetY -= dy / getCanvasScale();
            state.dragStartX = x;
            state.dragStartY = y;
            drawCanvas();
        } else if (state.dragMode === 'scale') {
            const dy = state.dragStartY - y;
            const scaleFactor = 1 + dy * 0.005;
            state.previewScale = Math.max(0.1, Math.min(5, state.previewScale * scaleFactor));
            state.dragStartY = y;
            drawCanvas();
        }
    }
}

function onCanvasMouseUp() {
    state.isDragging = false;
    canvas.style.cursor = 'crosshair';
}

function getCanvasScale() {
    const workWidth = 841; // A0 width mm
    const workHeight = 1189; // A0 height mm
    const scaleX = canvas.width / window.devicePixelRatio / workWidth;
    const scaleY = canvas.height / window.devicePixelRatio / workHeight;
    // Apply zoom to the content scale
    return Math.min(scaleX, scaleY) * 0.9 * state.zoom;
}

function screenToWorld(screenX, screenY) {
    const scale = getCanvasScale();
    const cw = canvas.width / window.devicePixelRatio;
    const ch = canvas.height / window.devicePixelRatio;
    return {
        x: (screenX - cw / 2) / scale,
        y: -(screenY - ch / 2) / scale
    };
}

// ============================================================================
// Socket Events (only if socket is available)
// ============================================================================

if (socket) {
    socket.on('connect', () => {
        logConsole('Connected to server', 'msg-in');
        checkConnectionStatus();
    });

    socket.on('disconnect', () => {
        logConsole('Disconnected from server', 'msg-error');
        setConnectionStatus(false);
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
        drawCanvas();
    });
}

// ============================================================================
// API Functions
// ============================================================================

async function sendCommand(url, method = 'GET', data = null) {
    try {
        // If webhook URL is set, route commands through Home Assistant
        if (POLARGRAPH_WEBHOOK_URL && method === 'POST') {
            return await sendViaWebhook(url, data);
        }
        
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

async function sendViaWebhook(endpoint, data = null) {
    /**
     * Send command via Home Assistant webhook -> MQTT -> plotter.local
     * Maps API endpoints to MQTT commands
     */
    const commandMap = {
        '/api/connect': 'connect',
        '/api/disconnect': 'disconnect',
        '/api/home': 'home',
        '/api/emergency_stop': 'stop',
        '/api/pen': data?.action === 'up' ? 'pen_up' : 'pen_down',
        '/api/motors': data?.enable ? 'motors_on' : 'motors_off',
        '/api/plot/start': 'start',
        '/api/plot/pause': 'pause',
        '/api/plot/resume': 'resume',
        '/api/jog': 'jog',
        '/api/goto': 'goto',
    };
    
    const command = commandMap[endpoint] || endpoint.replace('/api/', '');
    
    try {
        const response = await fetch(POLARGRAPH_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                command: command,
                ...data
            })
        });
        
        if (response.ok) {
            logConsole(`Sent via HA: ${command}`, 'msg-out');
            return { success: true };
        } else {
            throw new Error(`Webhook returned ${response.status}`);
        }
    } catch (error) {
        logConsole(`Webhook error: ${error.message}`, 'msg-error');
        return { success: false, error: error.message };
    }
}

async function checkConnectionStatus() {
    const result = await sendCommand('/api/connection_status');
    if (result.success !== false) {
        setConnectionStatus(result.connected, result.port);
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
            setConnectionStatus(true, port);
        } else {
            logConsole(`Connection failed: ${result.error}`, 'msg-error');
        }
    }
}

function setConnectionStatus(connected, port = null) {
    state.connected = connected;
    elements.statusDot.classList.toggle('connected', connected);
    elements.statusLabel.textContent = connected ? `Connected` : 'Disconnected';
    elements.connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
    
    const controls = [elements.homeBtn, elements.motorsBtn, elements.penUpBtn, 
                      elements.penDownBtn, elements.emergencyStop, elements.playBtn,
                      elements.rewindBtn, elements.stepBtn, elements.pauseBtn];
    controls.forEach(btn => btn.disabled = !connected);
    
    document.querySelectorAll('.jog-btn').forEach(btn => btn.disabled = !connected);
    updatePlotButtons();
}

async function toggleMotors() {
    state.motorsEnabled = !state.motorsEnabled;
    logConsole(`Motors ${state.motorsEnabled ? 'Enable' : 'Disable'}`, 'msg-out');
    await sendCommand('/api/motors', 'POST', { enable: state.motorsEnabled });
    elements.motorsBtn.classList.toggle('active', state.motorsEnabled);
}

async function emergencyStop() {
    await sendCommand('/api/emergency_stop', 'POST');
    state.plotting = false;
    state.paused = false;
    updatePlotButtons();
    logConsole('EMERGENCY STOP', 'msg-error');
    drawCanvas();
}

function jog(direction) {
    if (!state.connected) return;
    
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
            logConsole('Goto center (0, 0)', 'msg-out');
            sendCommand('/api/goto', 'POST', { x: 0, y: 0 });
            return;
    }
    
    logConsole(`Jog X:${x} Y:${y}`, 'msg-out');
    sendCommand('/api/jog', 'POST', { x, y });
}

// ============================================================================
// Plot Functions
// ============================================================================

async function startPlot() {
    if (state.paused) {
        logConsole('Resume Plot', 'msg-out');
        await sendCommand('/api/plot/resume', 'POST');
    } else {
        logConsole('Start Plot', 'msg-out');
        // In client-side mode, send the G-code with the start command
        if (CLIENT_SIDE_MODE && state.currentGcode && state.currentGcode.length > 0) {
            await sendCommand('/api/plot/start', 'POST', { gcode: state.currentGcode });
        } else {
            await sendCommand('/api/plot/start', 'POST');
        }
    }
    state.plotting = true;
    state.paused = false;
    updatePlotButtons();
}

async function pausePlot() {
    if (!state.plotting) return;
    logConsole('Pause Plot', 'msg-out');
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
    elements.progressText.textContent = `${percent}%`;
    elements.plotStatus.textContent = `Line ${current} of ${total}`;
}

// ============================================================================
// File Functions
// ============================================================================

function handleFileDrop(e) {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
    elements.convertPreview.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) uploadFile(file);
}

async function uploadFile(file) {
    // Check if it's an image file
    const isImage = file.type.startsWith('image/');
    
    // In client-side mode, handle images locally
    if (CLIENT_SIDE_MODE && isImage) {
        try {
            const img = await loadImageFromFile(file);
            state.currentImageElement = img;
            state.currentImagePath = file.name;  // Just for display
            
            // Show preview
            const dataUrl = await fileToDataUrl(file);
            elements.convertPreview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
            elements.convertSection.style.display = 'block';
            elements.uploadZone.style.display = 'none';
            elements.convertBtn.disabled = false;
            elements.menuFooter.style.display = 'block';
            logConsole(`Image loaded for client-side conversion`, 'msg-info');
        } catch (error) {
            logConsole(`Image load error: ${error.message}`, 'msg-error');
        }
        return;
    }
    
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
                state.currentImagePath = result.filepath;
                elements.convertPreview.innerHTML = `<img src="/uploads/${encodeURIComponent(file.name)}" alt="Preview">`;
                elements.convertSection.style.display = 'block';
                elements.uploadZone.style.display = 'none'; // Hide drop zone, use preview for replacement
                elements.convertBtn.disabled = false;
            } else {
                state.preview = result.preview;
                updatePreview(result.preview);
                elements.plotStatus.textContent = `${result.lines} lines loaded`;
            }
            elements.menuFooter.style.display = 'block';
        } else {
            logConsole(`Upload failed: ${result.error}`, 'msg-error');
        }
    } catch (error) {
        logConsole(`Upload error: ${error.message}`, 'msg-error');
    }
}

// Helper: Load image from file
function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

// Helper: Convert file to data URL
function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function exportGcode() {
    // In client-side mode, export from local state
    if (CLIENT_SIDE_MODE && state.currentGcode && state.currentGcode.length > 0) {
        downloadFile('drawing.gcode', state.currentGcode.join('\n'), 'text/plain');
        return;
    }
    
    const result = await sendCommand('/api/export/gcode');
    if (result.success) {
        downloadFile('drawing.gcode', result.gcode, 'text/plain');
    }
}

async function exportSvg() {
    // In client-side mode, generate SVG from preview paths
    if (CLIENT_SIDE_MODE && state.preview && state.preview.length > 0) {
        const svg = generateSvgFromPaths(state.preview);
        downloadFile('drawing.svg', svg, 'image/svg+xml');
        return;
    }
    
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

function generateSvgFromPaths(paths) {
    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const path of paths) {
        for (const p of path.points) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }
    }
    
    const width = maxX - minX || 100;
    const height = maxY - minY || 100;
    const margin = 10;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" `;
    svg += `width="${width + 2*margin}mm" height="${height + 2*margin}mm" `;
    svg += `viewBox="${minX - margin} ${-maxY - margin} ${width + 2*margin} ${height + 2*margin}">\n`;
    svg += `  <g stroke="black" fill="none" stroke-width="0.5">\n`;
    
    for (const path of paths) {
        if (path.points.length >= 2) {
            const d = path.points.map((p, i) => 
                `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${(-p.y).toFixed(3)}`
            ).join(' ');
            svg += `    <path d="${d}" />\n`;
        }
    }
    
    svg += `  </g>\n</svg>`;
    return svg;
}

// ============================================================================
// Generator Functions
// ============================================================================

async function loadGenerators() {
    const result = await sendCommand('/api/generators');
    if (result.generators) {
        populateGeneratorSelect(result.generators);
    }
}

function populateGeneratorSelect(generators) {
    elements.generatorSelect.innerHTML = '';
    generators.forEach(gen => {
        const option = document.createElement('option');
        option.value = gen.id;
        option.textContent = gen.name;
        option.dataset.options = JSON.stringify(gen.options || {});
        elements.generatorSelect.appendChild(option);
    });
    updateGeneratorOptions();
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
        label.textContent = key.replace(/_/g, ' ');
        
        let input;
        if (config.type === 'bool') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = config.default;
        } else if (config.type === 'string') {
            input = document.createElement('input');
            input.type = 'text';
            input.value = config.default;
        } else {
            input = document.createElement('input');
            input.type = 'number';
            input.value = config.default;
            if (config.min !== undefined) input.min = config.min;
            if (config.max !== undefined) input.max = config.max;
            input.step = config.type === 'int' ? 1 : 0.1;
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
    
    // Use client-side generation if in remote mode
    if (CLIENT_SIDE_MODE) {
        try {
            const patternGen = new PatternGenerator();
            const turtle = patternGen.generate(generator, options);
            const gcodeGen = new GCodeGenerator();
            
            state.currentGcode = gcodeGen.turtleToGcode(turtle);
            const paths = turtle.getPaths();
            console.log('Generated paths:', paths.length, 'sample:', paths[0]);
            state.preview = paths;
            updatePreview(paths);
            elements.plotStatus.textContent = `${paths.length} lines generated (client-side)`;
            elements.menuFooter.style.display = 'block';
            logConsole(`Generated ${generator} pattern (client-side)`, 'msg-info');
        } catch (err) {
            console.error('Generate error:', err);
            logConsole(`Generate failed: ${err.message}`, 'msg-error');
        }
        return;
    }
    
    const result = await sendCommand('/api/generate', 'POST', { generator, options });
    
    if (result.success) {
        state.preview = result.preview;
        updatePreview(result.preview);
        elements.plotStatus.textContent = `${result.lines} lines generated`;
        elements.menuFooter.style.display = 'block';
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
        populateConverterSelect(result.converters);
    }
}

function populateConverterSelect(converters) {
    elements.converterSelect.innerHTML = '';
    converters.forEach(conv => {
        const option = document.createElement('option');
        option.value = conv.id;
        option.textContent = conv.name;
        option.dataset.options = JSON.stringify(conv.options || {});
        elements.converterSelect.appendChild(option);
    });
    updateConverterOptions();
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
        label.textContent = key.replace(/_/g, ' ');
        
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
        }
        input.id = `conv_${key}`;
        
        group.appendChild(label);
        group.appendChild(input);
        elements.converterOptions.appendChild(group);
    });
}

async function convertImage() {
    if (!state.currentImagePath && !state.currentImageElement) return;
    
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
    
    // Use client-side conversion if in remote mode
    if (CLIENT_SIDE_MODE && state.currentImageElement) {
        try {
            const imgConverter = new ImageConverter();
            const turtle = await imgConverter.convert(state.currentImageElement, algorithm, options);
            const gcodeGen = new GCodeGenerator();
            
            state.currentGcode = gcodeGen.turtleToGcode(turtle);
            state.preview = turtle.getPaths();
            updatePreview(state.preview);
            elements.plotStatus.textContent = `${turtle.getPaths().length} lines converted (client-side)`;
            elements.menuFooter.style.display = 'block';
            logConsole(`Converted image with ${algorithm} (client-side)`, 'msg-info');
        } catch (err) {
            logConsole(`Convert failed: ${err.message}`, 'msg-error');
        }
        return;
    }
    
    const result = await sendCommand('/api/convert_image', 'POST', {
        filepath: state.currentImagePath,
        algorithm,
        options
    });
    
    if (result.success) {
        state.preview = result.preview;
        updatePreview(result.preview);
        elements.plotStatus.textContent = `${result.lines} lines converted`;
        elements.menuFooter.style.display = 'block';
    } else {
        logConsole(`Convert failed: ${result.error}`, 'msg-error');
    }
}

// ============================================================================
// Settings
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
        document.getElementById('penDownAngle').value = result.pen_angle_down || 40;
        document.getElementById('feedTravel').value = result.feed_rate_travel || 1000;
        document.getElementById('feedDraw').value = result.feed_rate_draw || 500;
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

async function clearUploads() {
    const result = await sendCommand('/api/clear_uploads', 'POST');
    if (result.success) {
        logConsole('Uploads cleared', 'msg-in');
        elements.convertPreview.innerHTML = '';
        elements.convertSection.style.display = 'none';
        elements.uploadZone.style.display = 'block'; // Show drop zone again
        state.currentImagePath = null;
    }
}

// ============================================================================
// Console
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
// Canvas Drawing
// ============================================================================

function drawCanvas() {
    const dpr = window.devicePixelRatio;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = '#fafaf8';
    ctx.fillRect(0, 0, w, h);
    
    // Transform to center origin
    ctx.translate(w / 2, h / 2);
    ctx.scale(1, -1); // Flip Y
    
    const scale = getCanvasScale();
    ctx.scale(scale, scale);
    
    // Draw work area grid
    drawGrid();
    
    // Draw work area boundary
    drawWorkArea();
    
    // Draw preview paths
    // state.preview can be either an array of paths or an object with .paths property
    const paths = Array.isArray(state.preview) ? state.preview : (state.preview?.paths || null);
    console.log('drawCanvas: paths count =', paths ? paths.length : 0, 'first path points:', paths?.[0]?.points?.length);
    if (paths && paths.length > 0) {
        ctx.save();
        ctx.translate(state.previewOffsetX, state.previewOffsetY);
        ctx.scale(state.previewScale, state.previewScale);
        drawPaths(paths);
        ctx.restore();
    }
    
    // Draw gondola indicator
    if (state.plotting) {
        drawGondola();
    }
    
    ctx.restore();
}

function drawGrid() {
    const lineScale = 1 / Math.sqrt(state.zoom);
    
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5 * lineScale;
    
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
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1 * lineScale;
    
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
    const left = -420.5;
    const right = 420.5;
    const top = 594.5;
    const bottom = -594.5;
    
    const lineScale = 1 / Math.sqrt(state.zoom);
    
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 0.5 * lineScale;
    ctx.setLineDash([5 * lineScale, 5 * lineScale]);
    
    ctx.beginPath();
    ctx.rect(left, bottom, right - left, top - bottom);
    ctx.stroke();
    
    ctx.setLineDash([]);
}

function drawPaths(paths) {
    paths.forEach(path => {
        if (path.points.length < 2) return;
        
        ctx.strokeStyle = path.color || '#222';
        // Line width gets thinner as you zoom in for detail visibility
        const baseWidth = (path.diameter || 0.5) * 2;
        ctx.lineWidth = baseWidth / Math.sqrt(state.zoom);
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

function drawGondola() {
    const gx = state.gondola.x || 0;
    const gy = state.gondola.y || 0;
    const penDown = (state.gondola.z || 90) < 50;
    
    const lineScale = 1 / Math.sqrt(state.zoom);
    const dotSize = 4 * lineScale;
    
    ctx.strokeStyle = penDown ? '#c44' : '#48a';
    ctx.lineWidth = 1.5 * lineScale;
    ctx.beginPath();
    ctx.arc(gx, gy, dotSize, 0, Math.PI * 2);
    ctx.stroke();
    
    if (penDown) {
        ctx.fillStyle = '#c44';
        ctx.beginPath();
        ctx.arc(gx, gy, dotSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updatePreview(preview) {
    console.log('updatePreview called with:', preview ? (Array.isArray(preview) ? preview.length + ' paths' : 'object') : 'null');
    if (!preview) return;
    
    state.preview = preview;
    
    if (preview.stats) {
        elements.statLines.textContent = preview.stats.lines || 0;
    }
    
    drawCanvas();
}
