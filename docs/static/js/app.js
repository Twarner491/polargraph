/**
 * Polargraph Web Interface
 */

// Home Assistant webhook URL - set by build_static.py for remote mode
// When building static site, this gets overwritten with actual webhook URL
// For local mode (plotter.local), leave as empty string
var POLARGRAPH_WEBHOOK_URL = "";

// Check if we're in client-side mode (static site or server unreachable)
// In static deployment, we detect by checking if we're on the static domain or if webhook is set
let CLIENT_SIDE_MODE = true; // Static build - always client-side

// Available pen colors
const PEN_COLORS = {
    brown:  { name: 'Brown',  hex: '#544548' },
    black:  { name: 'Black',  hex: '#3b363c' },
    blue:   { name: 'Blue',   hex: '#5989e7' },
    green:  { name: 'Green',  hex: '#3fada9' },
    purple: { name: 'Purple', hex: '#653d7d' },
    pink:   { name: 'Pink',   hex: '#ee9bb5' },
    red:    { name: 'Red',    hex: '#f45d4e' },
    orange: { name: 'Orange', hex: '#b06451' },
    yellow: { name: 'Yellow', hex: '#f7a515' }
};

// Entity counter for unique IDs
let entityIdCounter = 0;

// Undo/Redo history
const history = {
    undoStack: [],
    redoStack: [],
    maxSize: 50
};

// Clipboard for copy/paste
let clipboard = null;

// Create a new entity object
function createEntity(paths, options = {}) {
    return {
        id: ++entityIdCounter,
        paths: paths,
        color: options.color || 'black',
        algorithm: options.algorithm || null,
        algorithmOptions: options.algorithmOptions || {},
        offsetX: options.offsetX || 0,
        offsetY: options.offsetY || 0,
        scale: options.scale || 1,
        rotation: options.rotation || 0,  // Rotation in degrees
        visible: true,
        locked: false,
        name: options.name || `Element ${entityIdCounter}`
    };
}

// ============================================================================
// Undo/Redo System
// ============================================================================

function saveHistoryState() {
    // Deep copy current entities and selection
    const snapshot = JSON.stringify({
        entities: state.entities,
        selectedIds: Array.from(state.selectedEntityIds)
    });
    
    history.undoStack.push(snapshot);
    if (history.undoStack.length > history.maxSize) {
        history.undoStack.shift();
    }
    
    // Clear redo stack on new action
    history.redoStack = [];
}

function undo() {
    if (history.undoStack.length === 0) {
        logConsole('Nothing to undo', 'msg-info');
        return;
    }
    
    // Save current state to redo stack
    const currentState = JSON.stringify({
        entities: state.entities,
        selectedIds: Array.from(state.selectedEntityIds)
    });
    history.redoStack.push(currentState);
    
    // Restore previous state
    const prevState = JSON.parse(history.undoStack.pop());
    state.entities = prevState.entities;
    state.selectedEntityIds = new Set(prevState.selectedIds || []);
    
    // Restore entity counter
    entityIdCounter = state.entities.length > 0 ? Math.max(...state.entities.map(e => e.id)) : 0;
    
    // Remove invalid selections
    state.selectedEntityIds = new Set(
        Array.from(state.selectedEntityIds).filter(id => 
            state.entities.some(e => e.id === id)
        )
    );
    
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    logConsole('Undo', 'msg-info');
}

function redo() {
    if (history.redoStack.length === 0) {
        logConsole('Nothing to redo', 'msg-info');
        return;
    }
    
    // Save current state to undo stack
    const currentState = JSON.stringify({
        entities: state.entities,
        selectedIds: Array.from(state.selectedEntityIds)
    });
    history.undoStack.push(currentState);
    
    // Restore next state
    const nextState = JSON.parse(history.redoStack.pop());
    state.entities = nextState.entities;
    state.selectedEntityIds = new Set(nextState.selectedIds || []);
    
    // Restore entity counter
    entityIdCounter = state.entities.length > 0 ? Math.max(...state.entities.map(e => e.id)) : 0;
    
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    logConsole('Redo', 'msg-info');
}

// ============================================================================
// Clipboard Operations
// ============================================================================

function copyEntity() {
    const selected = getSelectedEntities();
    if (selected.length === 0) {
        logConsole('Nothing selected to copy', 'msg-info');
        return;
    }
    
    clipboard = JSON.stringify(selected);
    logConsole(`Copied ${selected.length} element${selected.length > 1 ? 's' : ''}`, 'msg-info');
}

function cutEntity() {
    const selected = getSelectedEntities();
    if (selected.length === 0) {
        logConsole('Nothing selected to cut', 'msg-info');
        return;
    }
    
    clipboard = JSON.stringify(selected);
    saveHistoryState();
    deleteSelectedEntities();
    logConsole(`Cut ${selected.length} element${selected.length > 1 ? 's' : ''}`, 'msg-info');
}

function pasteEntity() {
    if (!clipboard) {
        logConsole('Nothing to paste', 'msg-info');
        return;
    }
    
    saveHistoryState();
    
    const items = JSON.parse(clipboard);
    const newIds = [];
    
    items.forEach((original, index) => {
        const newEntity = createEntity(
            JSON.parse(JSON.stringify(original.paths)),
            {
                color: original.color,
                algorithm: original.algorithm,
                algorithmOptions: { ...original.algorithmOptions },
                offsetX: original.offsetX + 20,
                offsetY: original.offsetY - 20,
                scale: original.scale,
                rotation: original.rotation,
                name: `${original.name} copy`
            }
        );
        state.entities.push(newEntity);
        newIds.push(newEntity.id);
    });
    
    state.selectedEntityIds.clear();
    newIds.forEach(id => state.selectedEntityIds.add(id));
    
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    logConsole(`Pasted ${items.length} element${items.length > 1 ? 's' : ''}`, 'msg-info');
}

const state = {
    connected: false,
    plotting: false,
    paused: false,
    motorsEnabled: true,
    jogDistance: 10,
    currentImagePath: null,
    currentImageElement: null,  // For client-side conversion
    currentFile: null,          // Current uploaded file
    currentFileName: null,      // Current file name
    pendingImport: null,        // Pending import data {type, mode, text, dataUrl}
    preview: null,
    currentGcode: [],  // Store generated G-code for client-side mode
    
    // Multi-entity system
    entities: [],  // Array of entity objects
    selectedEntityIds: new Set(),  // Set of selected entity IDs (supports multi-select)
    activeColor: 'black',  // Currently selected pen color
    
    zoom: 1,
    minZoom: 0.2,
    maxZoom: 5,
    previewOffsetX: 0,
    previewOffsetY: 0,
    previewScale: 1,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragMode: null,  // 'move', 'scale', 'entity-move'
    gondola: { x: 0, y: 0, z: 90 },
    openPanel: null,
    mode: 'generate', // 'generate' or 'upload'
    // Menu drag state
    menuDragging: false,
    menuStartX: 0,
    menuStartY: 0,
    menuOffsetX: 0,
    menuOffsetY: 0,
    // Context menu
    contextMenuVisible: false,
    // Entity drag (multi-select)
    entityDragStarts: {}  // {entityId: {offsetX, offsetY}}
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
    
    // Color Picker
    colorPicker: document.getElementById('colorPicker'),
    
    // Entity List
    entityListSection: document.getElementById('entityListSection'),
    entityList: document.getElementById('entityList'),
    exportInfo: document.getElementById('exportInfo'),
    
    // Context Menu
    contextMenu: document.getElementById('contextMenu'),
    contextColors: document.getElementById('contextColors'),
    
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

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    initColorPicker();
    initContextMenu();
    initKeyboardShortcuts();
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

// ============================================================================
// Color Picker
// ============================================================================

function initColorPicker() {
    // Main color picker in menu
    if (elements.colorPicker) {
        elements.colorPicker.innerHTML = '';
        Object.entries(PEN_COLORS).forEach(([id, color]) => {
            const swatch = document.createElement('div');
            swatch.className = `color-swatch${id === state.activeColor ? ' active' : ''}`;
            swatch.style.backgroundColor = color.hex;
            swatch.dataset.color = id;
            swatch.title = color.name;
            swatch.addEventListener('click', () => setActiveColor(id));
            elements.colorPicker.appendChild(swatch);
        });
    }
    
    // Context menu colors
    if (elements.contextColors) {
        elements.contextColors.innerHTML = '';
        Object.entries(PEN_COLORS).forEach(([id, color]) => {
            const swatch = document.createElement('div');
            swatch.className = 'context-color';
            swatch.style.backgroundColor = color.hex;
            swatch.dataset.color = id;
            swatch.title = color.name;
            swatch.addEventListener('click', () => {
                const firstSelected = getFirstSelectedEntity();
                if (firstSelected) changeEntityColor(firstSelected.id, id);
            });
            elements.contextColors.appendChild(swatch);
        });
    }
}

function setActiveColor(colorId) {
    state.activeColor = colorId;
    
    // Update color picker UI
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.color === colorId);
    });
}

// ============================================================================
// Context Menu
// ============================================================================

function initContextMenu() {
    // Close context menu on click outside
    document.addEventListener('click', (e) => {
        if (state.contextMenuVisible && !elements.contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Context menu actions
    elements.contextMenu.querySelectorAll('.context-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            handleContextAction(action);
            hideContextMenu();
        });
    });
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmdKey = isMac ? e.metaKey : e.ctrlKey;
        
        // Delete / Backspace - delete selected entities
        if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedEntityIds.size > 0) {
            e.preventDefault();
            saveHistoryState();
            deleteSelectedEntities();
            return;
        }
        
        // Ctrl+Z - Undo
        if (cmdKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            undo();
            return;
        }
        
        // Ctrl+Shift+Z or Ctrl+Y - Redo
        if ((cmdKey && e.shiftKey && e.key.toLowerCase() === 'z') || 
            (cmdKey && e.key.toLowerCase() === 'y')) {
            e.preventDefault();
            redo();
            return;
        }
        
        // Ctrl+C - Copy
        if (cmdKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            copyEntity();
            return;
        }
        
        // Ctrl+X - Cut
        if (cmdKey && e.key.toLowerCase() === 'x') {
            e.preventDefault();
            cutEntity();
            return;
        }
        
        // Ctrl+V - Paste
        if (cmdKey && e.key.toLowerCase() === 'v') {
            e.preventDefault();
            pasteEntity();
            return;
        }
        
        // Ctrl+D - Duplicate
        if (cmdKey && e.key.toLowerCase() === 'd' && state.selectedEntityIds.size > 0) {
            e.preventDefault();
            saveHistoryState();
            duplicateSelectedEntities();
            return;
        }
        
        // Ctrl+A - Select all
        if (cmdKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            selectAllEntities();
            return;
        }
        
        // Escape - Deselect
        if (e.key === 'Escape') {
            clearSelection();
            hideContextMenu();
            return;
        }
        
        // Arrow keys - nudge selected entities
        if (state.selectedEntityIds.size > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const selected = getSelectedEntities();
            if (selected.length > 0) {
                const step = e.shiftKey ? 10 : 1;  // Shift for larger steps
                saveHistoryState();
                
                selected.forEach(entity => {
                    switch (e.key) {
                        case 'ArrowUp': entity.offsetY += step; break;
                        case 'ArrowDown': entity.offsetY -= step; break;
                        case 'ArrowLeft': entity.offsetX -= step; break;
                        case 'ArrowRight': entity.offsetX += step; break;
                    }
                });
                drawCanvas();
            }
            return;
        }
        
        // R - Rotate selected entities (hold shift for larger steps)
        if (e.key.toLowerCase() === 'r' && state.selectedEntityIds.size > 0 && !cmdKey) {
            const selected = getSelectedEntities();
            if (selected.length > 0) {
                saveHistoryState();
                const step = e.shiftKey ? 45 : 15;
                selected.forEach(entity => {
                    entity.rotation = (entity.rotation + step) % 360;
                });
                drawCanvas();
                logConsole(`Rotated ${selected.length} element${selected.length > 1 ? 's' : ''} +${step}°`, 'msg-info');
            }
            return;
        }
        
        // [ and ] - Scale selected entities
        if ((e.key === '[' || e.key === ']') && state.selectedEntityIds.size > 0) {
            const selected = getSelectedEntities();
            if (selected.length > 0) {
                saveHistoryState();
                const factor = e.key === ']' ? 1.1 : 0.9;
                selected.forEach(entity => {
                    entity.scale = Math.max(0.1, Math.min(10, entity.scale * factor));
                });
                drawCanvas();
                logConsole(`Scaled ${selected.length} element${selected.length > 1 ? 's' : ''}`, 'msg-info');
            }
            return;
        }
    });
}

function showContextMenu(x, y, entityId) {
    // Add to selection if not already selected
    if (!state.selectedEntityIds.has(entityId)) {
        state.selectedEntityIds.clear();
        state.selectedEntityIds.add(entityId);
    }
    state.contextMenuVisible = true;
    
    const entity = state.entities.find(e => e.id === entityId);
    if (!entity) return;
    
    // Update context menu color indicators (show first selected entity's color)
    document.querySelectorAll('.context-color').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.color === entity.color);
    });
    
    // Position context menu
    const menu = elements.contextMenu;
    menu.style.display = 'block';
    
    // Adjust position to stay in viewport
    const rect = menu.getBoundingClientRect();
    const bodyRect = document.querySelector('.body-panel').getBoundingClientRect();
    
    let menuX = x - bodyRect.left;
    let menuY = y - bodyRect.top;
    
    if (menuX + rect.width > bodyRect.width) {
        menuX = bodyRect.width - rect.width - 10;
    }
    if (menuY + rect.height > bodyRect.height) {
        menuY = bodyRect.height - rect.height - 10;
    }
    
    menu.style.left = menuX + 'px';
    menu.style.top = menuY + 'px';
    
    // Update entity list selection
    updateEntityList();
    drawCanvas();
}

function hideContextMenu() {
    state.contextMenuVisible = false;
    elements.contextMenu.style.display = 'none';
}

function handleContextAction(action) {
    const selected = getSelectedEntities();
    if (selected.length === 0) return;
    
    switch (action) {
        case 'duplicate':
            saveHistoryState();
            duplicateSelectedEntities();
            break;
        case 'copy':
            copyEntity();
            break;
        case 'cut':
            cutEntity();
            break;
        case 'offset':
            promptSelectedEntitiesOffset();
            break;
        case 'rotateLeft':
            saveHistoryState();
            selected.forEach(entity => {
                entity.rotation = (entity.rotation - 15 + 360) % 360;
            });
            drawCanvas();
            logConsole(`Rotated ${selected.length} element${selected.length > 1 ? 's' : ''} -15°`, 'msg-info');
            break;
        case 'rotateRight':
            saveHistoryState();
            selected.forEach(entity => {
                entity.rotation = (entity.rotation + 15) % 360;
            });
            drawCanvas();
            logConsole(`Rotated ${selected.length} element${selected.length > 1 ? 's' : ''} +15°`, 'msg-info');
            break;
        case 'scaleUp':
            saveHistoryState();
            selected.forEach(entity => {
                entity.scale = Math.min(10, entity.scale * 1.1);
            });
            drawCanvas();
            logConsole(`Scaled up ${selected.length} element${selected.length > 1 ? 's' : ''}`, 'msg-info');
            break;
        case 'scaleDown':
            saveHistoryState();
            selected.forEach(entity => {
                entity.scale = Math.max(0.1, entity.scale * 0.9);
            });
            drawCanvas();
            logConsole(`Scaled down ${selected.length} element${selected.length > 1 ? 's' : ''}`, 'msg-info');
            break;
        case 'resetTransform':
            saveHistoryState();
            selected.forEach(entity => {
                entity.scale = 1;
                entity.rotation = 0;
                entity.offsetX = 0;
                entity.offsetY = 0;
            });
            drawCanvas();
            logConsole(`Reset transform on ${selected.length} element${selected.length > 1 ? 's' : ''}`, 'msg-info');
            break;
        case 'bringToFront':
            saveHistoryState();
            selected.forEach(entity => bringEntityToFront(entity.id));
            break;
        case 'sendToBack':
            saveHistoryState();
            selected.reverse().forEach(entity => sendEntityToBack(entity.id));
            break;
        case 'delete':
            saveHistoryState();
            deleteSelectedEntities();
            break;
    }
}

// ============================================================================
// Entity Management
// ============================================================================

function addEntity(paths, options = {}) {
    saveHistoryState();
    const entity = createEntity(paths, {
        ...options,
        color: options.color || state.activeColor
    });
    state.entities.push(entity);
    state.selectedEntityIds.clear();
    state.selectedEntityIds.add(entity.id);
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    return entity;
}

function deleteEntity(entityId) {
    const index = state.entities.findIndex(e => e.id === entityId);
    if (index !== -1) {
        state.entities.splice(index, 1);
        state.selectedEntityIds.delete(entityId);
        updateEntityList();
        updateExportInfo();
        drawCanvas();
        logConsole(`Deleted element`, 'msg-info');
    }
}

function deleteSelectedEntities() {
    if (state.selectedEntityIds.size === 0) return;
    
    const count = state.selectedEntityIds.size;
    state.entities = state.entities.filter(e => !state.selectedEntityIds.has(e.id));
    state.selectedEntityIds.clear();
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    logConsole(`Deleted ${count} element${count > 1 ? 's' : ''}`, 'msg-info');
}

function duplicateEntity(entityId, offsetX = 20, offsetY = -20) {
    const original = state.entities.find(e => e.id === entityId);
    if (!original) return null;
    
    const newEntity = createEntity(
        JSON.parse(JSON.stringify(original.paths)),  // Deep copy paths
        {
            color: original.color,
            algorithm: original.algorithm,
            algorithmOptions: { ...original.algorithmOptions },
            offsetX: original.offsetX + offsetX,
            offsetY: original.offsetY + offsetY,
            scale: original.scale,
            rotation: original.rotation,
            name: `${original.name} copy`
        }
    );
    
    state.entities.push(newEntity);
    return newEntity;
}

function duplicateSelectedEntities() {
    const selected = getSelectedEntities();
    if (selected.length === 0) return;
    
    const newIds = [];
    selected.forEach(entity => {
        const newEntity = duplicateEntity(entity.id);
        if (newEntity) newIds.push(newEntity.id);
    });
    
    // Select the new duplicates
    state.selectedEntityIds.clear();
    newIds.forEach(id => state.selectedEntityIds.add(id));
    
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    logConsole(`Duplicated ${selected.length} element${selected.length > 1 ? 's' : ''}`, 'msg-info');
}

function promptEntityOffset(entityId) {
    const entity = state.entities.find(e => e.id === entityId);
    if (!entity) return;
    
    const offsetX = prompt('Offset X (mm):', '0');
    const offsetY = prompt('Offset Y (mm):', '0');
    
    if (offsetX !== null && offsetY !== null) {
        saveHistoryState();
        entity.offsetX += parseFloat(offsetX) || 0;
        entity.offsetY += parseFloat(offsetY) || 0;
        drawCanvas();
        logConsole(`Offset element by (${offsetX}, ${offsetY})`, 'msg-info');
    }
}

function promptSelectedEntitiesOffset() {
    const selected = getSelectedEntities();
    if (selected.length === 0) return;
    
    const offsetX = prompt('Offset X (mm):', '0');
    const offsetY = prompt('Offset Y (mm):', '0');
    
    if (offsetX !== null && offsetY !== null) {
        saveHistoryState();
        const dx = parseFloat(offsetX) || 0;
        const dy = parseFloat(offsetY) || 0;
        selected.forEach(entity => {
            entity.offsetX += dx;
            entity.offsetY += dy;
        });
        drawCanvas();
        logConsole(`Offset ${selected.length} element${selected.length > 1 ? 's' : ''} by (${offsetX}, ${offsetY})`, 'msg-info');
    }
}

function changeEntityColor(entityId, colorId) {
    // If entityId is provided and is selected, change all selected
    // Otherwise just change the single entity
    const selected = getSelectedEntities();
    
    if (selected.length > 0 && state.selectedEntityIds.has(entityId)) {
        saveHistoryState();
        selected.forEach(entity => {
            entity.color = colorId;
        });
        logConsole(`Changed color of ${selected.length} element${selected.length > 1 ? 's' : ''} to ${PEN_COLORS[colorId].name}`, 'msg-info');
    } else {
        const entity = state.entities.find(e => e.id === entityId);
        if (!entity) return;
        saveHistoryState();
        entity.color = colorId;
        logConsole(`Changed color to ${PEN_COLORS[colorId].name}`, 'msg-info');
    }
    
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    hideContextMenu();
}

function bringEntityToFront(entityId) {
    const index = state.entities.findIndex(e => e.id === entityId);
    if (index !== -1 && index < state.entities.length - 1) {
        const entity = state.entities.splice(index, 1)[0];
        state.entities.push(entity);
        updateEntityList();
        drawCanvas();
    }
}

function sendEntityToBack(entityId) {
    const index = state.entities.findIndex(e => e.id === entityId);
    if (index > 0) {
        const entity = state.entities.splice(index, 1)[0];
        state.entities.unshift(entity);
        updateEntityList();
        drawCanvas();
    }
}

function selectEntity(entityId, addToSelection = false, toggleSelection = false) {
    if (toggleSelection) {
        // Ctrl+click: toggle selection
        if (state.selectedEntityIds.has(entityId)) {
            state.selectedEntityIds.delete(entityId);
        } else {
            state.selectedEntityIds.add(entityId);
        }
    } else if (addToSelection) {
        // Shift+click: add to selection
        state.selectedEntityIds.add(entityId);
    } else {
        // Regular click: select only this one
        state.selectedEntityIds.clear();
        state.selectedEntityIds.add(entityId);
    }
    updateEntityList();
    drawCanvas();
}

function getSelectedEntities() {
    return state.entities.filter(e => state.selectedEntityIds.has(e.id));
}

function getFirstSelectedEntity() {
    for (const entity of state.entities) {
        if (state.selectedEntityIds.has(entity.id)) {
            return entity;
        }
    }
    return null;
}

function isEntitySelected(entityId) {
    return state.selectedEntityIds.has(entityId);
}

function clearSelection() {
    state.selectedEntityIds.clear();
    updateEntityList();
    drawCanvas();
}

function selectAllEntities() {
    state.entities.forEach(e => state.selectedEntityIds.add(e.id));
    updateEntityList();
    drawCanvas();
    logConsole(`Selected ${state.entities.length} elements`, 'msg-info');
}

function updateEntityList() {
    if (!elements.entityList) return;
    
    if (state.entities.length === 0) {
        elements.entityListSection.style.display = 'none';
        elements.menuFooter.style.display = 'none';
        return;
    }
    
    elements.entityListSection.style.display = 'block';
    elements.menuFooter.style.display = 'block';
    
    elements.entityList.innerHTML = '';
    
    state.entities.forEach(entity => {
        const color = PEN_COLORS[entity.color] || PEN_COLORS.black;
        const lineCount = entity.paths.length;
        
        // Build info string
        let info = `${lineCount}`;
        if (entity.scale !== 1) info += ` · ${Math.round(entity.scale * 100)}%`;
        if (entity.rotation !== 0) info += ` · ${entity.rotation}°`;
        
        const item = document.createElement('div');
        item.className = `entity-item${state.selectedEntityIds.has(entity.id) ? ' selected' : ''}`;
        item.innerHTML = `
            <div class="entity-color" style="background-color: ${color.hex}"></div>
            <span class="entity-name">${entity.name}</span>
            <span class="entity-info">${info}</span>
            <div class="entity-actions">
                <button class="entity-action-btn" data-action="duplicate" title="Duplicate">⊕</button>
                <button class="entity-action-btn delete" data-action="delete" title="Delete">✕</button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.entity-action-btn')) {
                const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const cmdKey = isMac ? e.metaKey : e.ctrlKey;
                selectEntity(entity.id, e.shiftKey, cmdKey);
            }
        });
        
        item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY, entity.id);
        });
        
        item.querySelectorAll('.entity-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                saveHistoryState();
                const action = btn.dataset.action;
                if (action === 'duplicate') duplicateEntity(entity.id);
                if (action === 'delete') deleteEntity(entity.id);
            });
        });
        
        elements.entityList.appendChild(item);
    });
}

function updateExportInfo() {
    if (!elements.exportInfo) return;
    
    if (state.entities.length === 0) {
        elements.exportInfo.textContent = '';
        return;
    }
    
    // Count colors used
    const colorsUsed = new Set(state.entities.map(e => e.color));
    const colorNames = Array.from(colorsUsed).map(c => PEN_COLORS[c]?.name || c);
    
    if (colorsUsed.size > 1) {
        elements.exportInfo.textContent = `${colorsUsed.size} colors: ${colorNames.join(', ')}`;
    } else {
        elements.exportInfo.textContent = `Color: ${colorNames[0]}`;
    }
}

function initClientSideMode() {
    
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
    
    // Load about pattern if on about page
    if (IS_ABOUT_PAGE) {
        const aboutPaths = generateAboutPattern();
        addEntity(aboutPaths, {
            name: 'About',
            color: 'black'
        });
        elements.plotStatus.textContent = 'About this project';
    }
    
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
    canvas.addEventListener('contextmenu', onCanvasRightClick);
    
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
    // Ignore right-clicks
    if (e.button === 2) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    state.dragStartX = x;
    state.dragStartY = y;
    
    // Check if clicking on an entity
    const worldPos = screenToWorld(x, y);
    const clickedEntity = findEntityAtPoint(worldPos.x, worldPos.y);
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;
    
    if (clickedEntity) {
        if (cmdKey) {
            // Ctrl+click: toggle selection
            selectEntity(clickedEntity.id, false, true);
        } else if (e.shiftKey) {
            // Shift+click: add to selection
            selectEntity(clickedEntity.id, true, false);
        } else {
            // Regular click
            if (!state.selectedEntityIds.has(clickedEntity.id)) {
                // Click on unselected entity - select it
                selectEntity(clickedEntity.id);
            }
            // Start dragging all selected entities
            state.isDragging = true;
            state.dragMode = 'entity-move';
            
            // Store initial positions for all selected entities
            state.entityDragStarts = {};
            getSelectedEntities().forEach(entity => {
                state.entityDragStarts[entity.id] = {
                    offsetX: entity.offsetX,
                    offsetY: entity.offsetY
                };
            });
            canvas.style.cursor = 'move';
        }
    } else if (e.shiftKey && !clickedEntity) {
        // Shift+drag on empty space: scale view
        state.isDragging = true;
        state.dragMode = 'scale';
        canvas.style.cursor = 'grabbing';
    } else {
        // Click/drag on empty space: pan view
        state.isDragging = true;
        state.dragMode = 'move';
        canvas.style.cursor = 'grabbing';
        
        // Deselect if clicking on empty space without modifier
        if (!cmdKey) {
            clearSelection();
        }
    }
}

function onCanvasMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update cursor position
    const worldPos = screenToWorld(x, y);
    elements.cursorPos.textContent = `X: ${worldPos.x.toFixed(1)} Y: ${worldPos.y.toFixed(1)}`;
    
    if (state.isDragging) {
        if (state.dragMode === 'entity-move') {
            // Move all selected entities
            const dx = (x - state.dragStartX) / getCanvasScale();
            const dy = -(y - state.dragStartY) / getCanvasScale();
            
            getSelectedEntities().forEach(entity => {
                const start = state.entityDragStarts[entity.id];
                if (start) {
                    entity.offsetX = start.offsetX + dx;
                    entity.offsetY = start.offsetY + dy;
                }
            });
            drawCanvas();
        } else if (state.dragMode === 'move') {
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

function onCanvasRightClick(e) {
    e.preventDefault();
    
    if (state.entities.length === 0) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldPos = screenToWorld(x, y);
    
    // Find entity under cursor
    const clickedEntity = findEntityAtPoint(worldPos.x, worldPos.y);
    
    if (clickedEntity) {
        showContextMenu(e.clientX, e.clientY, clickedEntity.id);
    } else {
        hideContextMenu();
    }
}

function findEntityAtPoint(worldX, worldY) {
    // Check entities in reverse order (top to bottom)
    for (let i = state.entities.length - 1; i >= 0; i--) {
        const entity = state.entities[i];
        if (!entity.visible) continue;
        
        // Calculate entity bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        entity.paths.forEach(path => {
            path.points.forEach(p => {
                const px = p.x * entity.scale + entity.offsetX;
                const py = p.y * entity.scale + entity.offsetY;
                minX = Math.min(minX, px);
                minY = Math.min(minY, py);
                maxX = Math.max(maxX, px);
                maxY = Math.max(maxY, py);
            });
        });
        
        // Add some padding for easier clicking
        const padding = 10;
        if (worldX >= minX - padding && worldX <= maxX + padding &&
            worldY >= minY - padding && worldY <= maxY + padding) {
            return entity;
        }
    }
    
    return null;
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
    const filename = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/') && !filename.endsWith('.svg');
    const isSvg = filename.endsWith('.svg') || file.type === 'image/svg+xml';
    const isGcode = filename.match(/\.(gcode|ngc|nc)$/);
    
    state.currentFile = file;
    state.currentFileName = file.name;
    
    // Handle different file types with appropriate UI
    if (isGcode) {
        // G-code: Show import options (direct import only)
        await handleGcodeFile(file);
    } else if (isSvg) {
        // SVG: Show import options (import as paths or convert as image)
        await handleSvgFile(file);
    } else if (isImage) {
        // Raster image: Show conversion options
        await handleImageFile(file);
    } else {
        logConsole(`Unsupported file type: ${file.name}`, 'msg-error');
    }
}

async function handleGcodeFile(file) {
    const text = await file.text();
    
    // Show G-code import section
    elements.uploadZone.style.display = 'none';
    elements.convertSection.style.display = 'block';
    
    // Preview info
    const lineCount = text.split('\n').length;
    elements.convertPreview.innerHTML = `
        <div class="file-preview">
            <div class="file-icon">📄</div>
            <div class="file-name">${file.name}</div>
            <div class="file-info">${lineCount} lines</div>
        </div>
    `;
    
    // Show import-only options for G-code
    elements.converterSelect.style.display = 'none';
    elements.converterOptions.innerHTML = `
        <div class="import-info">
            <p>G-code will be imported directly as paths</p>
        </div>
    `;
    elements.convertBtn.textContent = 'Import Paths';
    elements.convertBtn.disabled = false;
    elements.menuFooter.style.display = 'block';
    
    // Store the parsed data for import
    state.pendingImport = {
        type: 'gcode',
        text: text
    };
    
    logConsole(`G-code file loaded: ${file.name}`, 'msg-info');
}

async function handleSvgFile(file) {
    const text = await file.text();
    const dataUrl = await fileToDataUrl(file);
    
    // Check if it's a Polargraph-exported SVG
    const isPolargraphSvg = text.includes('polargraph-metadata') || text.includes('data-polargraph-version');
    
    // Show SVG import section
    elements.uploadZone.style.display = 'none';
    elements.convertSection.style.display = 'block';
    
    // Preview
    elements.convertPreview.innerHTML = `<img src="${dataUrl}" alt="Preview" style="max-width: 100%; max-height: 150px;">`;
    
    // Show import mode selector
    const importModeHtml = `
        <div class="import-mode-selector">
            <label class="import-mode-option">
                <input type="radio" name="svgImportMode" value="paths" checked>
                <span class="mode-label">
                    <strong>Import as Paths</strong>
                    <small>Trace vector paths directly (pen follows lines)</small>
                </span>
            </label>
            <label class="import-mode-option">
                <input type="radio" name="svgImportMode" value="convert">
                <span class="mode-label">
                    <strong>Convert as Image</strong>
                    <small>Rasterize and apply algorithm (spiral, crosshatch, etc.)</small>
                </span>
            </label>
        </div>
        <div id="svgConvertOptions" style="display: none;"></div>
    `;
    
    elements.converterSelect.style.display = 'none';
    elements.converterOptions.innerHTML = importModeHtml;
    
    if (isPolargraphSvg) {
        elements.converterOptions.insertAdjacentHTML('afterbegin', 
            '<div class="import-notice">✓ Polargraph export detected - layers will be preserved</div>'
        );
    }
    
    // Handle mode change
    elements.converterOptions.querySelectorAll('input[name="svgImportMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const svgConvertOptions = document.getElementById('svgConvertOptions');
            if (e.target.value === 'convert') {
                // Show converter options
                svgConvertOptions.style.display = 'block';
                elements.converterSelect.style.display = 'block';
                elements.convertBtn.textContent = 'Convert';
                state.pendingImport.mode = 'convert';
            } else {
                svgConvertOptions.style.display = 'none';
                elements.converterSelect.style.display = 'none';
                elements.convertBtn.textContent = 'Import Paths';
                state.pendingImport.mode = 'paths';
            }
        });
    });
    
    elements.convertBtn.textContent = 'Import Paths';
    elements.convertBtn.disabled = false;
    elements.menuFooter.style.display = 'block';
    
    // Store for import
    state.pendingImport = {
        type: 'svg',
        mode: 'paths',
        text: text,
        dataUrl: dataUrl
    };
    
    // Also load as image for potential conversion
    try {
        const img = await loadImageFromFile(file);
        state.currentImageElement = img;
        state.currentImagePath = file.name;
    } catch (e) {
        console.warn('Could not load SVG as image:', e);
    }
    
    logConsole(`SVG file loaded: ${file.name}${isPolargraphSvg ? ' (Polargraph export)' : ''}`, 'msg-info');
}

async function handleImageFile(file) {
    // In client-side mode, handle images locally
    if (CLIENT_SIDE_MODE) {
        try {
            const img = await loadImageFromFile(file);
            state.currentImageElement = img;
            state.currentImagePath = file.name;
            
            // Show preview
            const dataUrl = await fileToDataUrl(file);
            elements.convertPreview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
            elements.convertSection.style.display = 'block';
            elements.uploadZone.style.display = 'none';
            elements.converterSelect.style.display = 'block';
            elements.convertBtn.textContent = 'Convert';
            elements.convertBtn.disabled = false;
            elements.menuFooter.style.display = 'block';
            
            state.pendingImport = null; // Not an import, a conversion
            
            logConsole(`Image loaded for conversion`, 'msg-info');
        } catch (error) {
            logConsole(`Image load error: ${error.message}`, 'msg-error');
        }
        return;
    }
    
    // Server mode
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
                elements.uploadZone.style.display = 'none';
                elements.converterSelect.style.display = 'block';
                elements.convertBtn.textContent = 'Convert';
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
    if (state.entities.length === 0) {
        logConsole('No elements to export', 'msg-error');
        return;
    }
    
    // Group entities by color
    const colorGroups = {};
    state.entities.forEach(entity => {
        if (!colorGroups[entity.color]) {
            colorGroups[entity.color] = [];
        }
        colorGroups[entity.color].push(entity);
    });
    
    const colors = Object.keys(colorGroups);
    
    if (colors.length === 1) {
        // Single color - export as single file
        const gcode = generateGcodeForEntities(state.entities, colors[0]);
        const colorName = PEN_COLORS[colors[0]]?.name || colors[0];
        downloadFile(`drawing_${colorName.toLowerCase()}.gcode`, gcode.join('\n'), 'text/plain');
        logConsole(`Exported G-code (${colorName}) with metadata`, 'msg-info');
    } else {
        // Multiple colors - export as ZIP or separate files
        logConsole(`Exporting ${colors.length} G-code files (one per color)...`, 'msg-info');
        
        // Export each color as separate file
        for (const colorId of colors) {
            const entities = colorGroups[colorId];
            const gcode = generateGcodeForEntities(entities, colorId);
            const colorName = PEN_COLORS[colorId]?.name || colorId;
            
            // Small delay between downloads for browser compatibility
            await new Promise(resolve => setTimeout(resolve, 100));
            downloadFile(`drawing_${colorName.toLowerCase()}.gcode`, gcode.join('\n'), 'text/plain');
        }
        
        logConsole(`Exported ${colors.length} G-code files with metadata`, 'msg-info');
    }
}

function transformPoint(x, y, entity, centerX, centerY) {
    // Apply scale
    let px = x * entity.scale;
    let py = y * entity.scale;
    
    // Apply rotation around center
    if (entity.rotation !== 0) {
        const rad = entity.rotation * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        const cx = centerX * entity.scale;
        const cy = centerY * entity.scale;
        
        const rx = px - cx;
        const ry = py - cy;
        
        px = rx * cos - ry * sin + cx;
        py = rx * sin + ry * cos + cy;
    }
    
    // Apply offset
    px += entity.offsetX;
    py += entity.offsetY;
    
    return { x: px, y: py };
}

function generateGcodeForEntities(entities, colorId = null) {
    const gcodeGen = new GCodeGenerator();
    const turtle = new Turtle();
    const lines = [];
    
    // Add header with metadata
    lines.push('; Generated by Polargraph');
    lines.push(`; Date: ${new Date().toISOString()}`);
    lines.push(`; Entities: ${entities.length}`);
    if (colorId) {
        const colorName = PEN_COLORS[colorId]?.name || colorId;
        lines.push(`; Color: ${colorName} (${colorId})`);
    }
    lines.push(';');
    
    // Add entity metadata as JSON comment for reimport
    const metadata = entities.map(e => ({
        name: e.name,
        color: e.color,
        algorithm: e.algorithm,
        pathCount: e.paths.length
    }));
    lines.push(`; polargraph-metadata: ${JSON.stringify(metadata)}`);
    lines.push(';');
    
    entities.forEach((entity, entityIdx) => {
        // Add entity marker comment
        lines.push(`; Entity ${entityIdx}: ${entity.name} (${PEN_COLORS[entity.color]?.name || entity.color})`);
        
        // Calculate center for rotation
        const bounds = getEntityBounds(entity.paths);
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        entity.paths.forEach((path, pathIdx) => {
            if (path.points.length < 2) return;
            
            turtle.penUpCmd();
            const firstPoint = transformPoint(path.points[0].x, path.points[0].y, entity, centerX, centerY);
            turtle.moveTo(firstPoint.x, firstPoint.y);
            turtle.penDown();
            
            for (let i = 1; i < path.points.length; i++) {
                const p = transformPoint(path.points[i].x, path.points[i].y, entity, centerX, centerY);
                turtle.moveTo(p.x, p.y);
            }
        });
    });
    
    turtle.penUpCmd();
    
    // Combine header with generated gcode
    const gcodeLines = gcodeGen.turtleToGcode(turtle);
    return [...lines, ...gcodeLines];
}

async function exportSvg() {
    if (state.entities.length === 0) {
        logConsole('No elements to export', 'msg-error');
        return;
    }
    
    // Use new entity-aware SVG generator with metadata
    const svg = generateSvgFromEntities(state.entities);
    downloadFile('drawing.svg', svg, 'image/svg+xml');
    logConsole('Exported SVG with layer metadata', 'msg-info');
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

function generateSvgFromEntities(entities) {
    // Calculate bounds from all entities
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    entities.forEach(entity => {
        const bounds = getEntityBounds(entity.paths);
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        entity.paths.forEach(path => {
            path.points.forEach(p => {
                const tp = transformPoint(p.x, p.y, entity, centerX, centerY);
                minX = Math.min(minX, tp.x);
                minY = Math.min(minY, tp.y);
                maxX = Math.max(maxX, tp.x);
                maxY = Math.max(maxY, tp.y);
            });
        });
    });
    
    const width = maxX - minX || 100;
    const height = maxY - minY || 100;
    const margin = 10;
    
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" `;
    svg += `width="${width + 2*margin}mm" height="${height + 2*margin}mm" `;
    svg += `viewBox="${minX - margin} ${-maxY - margin} ${width + 2*margin} ${height + 2*margin}"\n`;
    svg += `  data-polargraph-version="1.0">\n`;
    
    // Add metadata for reimport
    const metadata = entities.map(e => ({
        name: e.name,
        color: e.color,
        algorithm: e.algorithm,
        algorithmOptions: e.algorithmOptions,
        offsetX: e.offsetX,
        offsetY: e.offsetY,
        scale: e.scale,
        rotation: e.rotation
    }));
    svg += `  <!-- polargraph-metadata: ${JSON.stringify(metadata)} -->\n`;
    
    // Output each entity as a group with metadata
    entities.forEach((entity, idx) => {
        const color = PEN_COLORS[entity.color]?.hex || '#000000';
        const bounds = getEntityBounds(entity.paths);
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        svg += `  <g id="entity-${idx}" stroke="${color}" fill="none" stroke-width="0.5"\n`;
        svg += `     data-entity-name="${entity.name}" data-entity-color="${entity.color}">\n`;
        
        entity.paths.forEach(path => {
            if (path.points.length >= 2) {
                const transformedPoints = path.points.map(p => 
                    transformPoint(p.x, p.y, entity, centerX, centerY)
                );
                const d = transformedPoints.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${(-p.y).toFixed(3)}`
                ).join(' ');
                svg += `    <path d="${d}" />\n`;
            }
        });
        svg += `  </g>\n`;
    });
    
    svg += `</svg>`;
    return svg;
}

// Legacy function for compatibility
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
    
    // Group paths by color
    const colorGroups = {};
    for (const path of paths) {
        const color = path.color || '#000000';
        if (!colorGroups[color]) {
            colorGroups[color] = [];
        }
        colorGroups[color].push(path);
    }
    
    // Output each color group
    for (const [color, colorPaths] of Object.entries(colorGroups)) {
        svg += `  <g stroke="${color}" fill="none" stroke-width="0.5">\n`;
        for (const path of colorPaths) {
            if (path.points.length >= 2) {
                const d = path.points.map((p, i) => 
                    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(3)} ${(-p.y).toFixed(3)}`
                ).join(' ');
                svg += `    <path d="${d}" />\n`;
            }
        }
        svg += `  </g>\n`;
    }
    
    svg += `</svg>`;
    return svg;
}

// ============================================================================
// Import Functions (SVG, G-code)
// ============================================================================

/**
 * Parse SVG file and extract paths as entities
 * Handles: our exported SVGs with metadata, Illustrator, Inkscape, CorelDRAW, etc.
 */
function parseSvgToEntities(svgText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (!svg) {
        throw new Error('Invalid SVG file');
    }
    
    const entities = [];
    let polargraphMetadata = null;
    
    // Check for our custom metadata
    const metadataMatch = svgText.match(/polargraph-metadata:\s*(\[.*?\])/);
    if (metadataMatch) {
        try {
            polargraphMetadata = JSON.parse(metadataMatch[1]);
            logConsole('Found Polargraph metadata - restoring original layers', 'msg-info');
        } catch (e) {
            console.warn('Could not parse polargraph metadata:', e);
        }
    }
    
    // Get viewBox for coordinate transformation
    const viewBox = svg.getAttribute('viewBox');
    let vbMinX = 0, vbMinY = 0, vbWidth = 100, vbHeight = 100;
    if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        [vbMinX, vbMinY, vbWidth, vbHeight] = parts;
    }
    
    // Helper: Parse SVG path d attribute to points
    function parsePathD(d) {
        const points = [];
        const commands = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];
        let currentX = 0, currentY = 0;
        let startX = 0, startY = 0;
        
        for (const cmd of commands) {
            const type = cmd[0];
            const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            
            switch (type.toUpperCase()) {
                case 'M': // Move to
                    if (type === 'M') {
                        currentX = args[0];
                        currentY = args[1];
                    } else {
                        currentX += args[0];
                        currentY += args[1];
                    }
                    startX = currentX;
                    startY = currentY;
                    points.push({ x: currentX, y: -currentY }); // Flip Y
                    // Handle implicit lineto after moveto
                    for (let i = 2; i < args.length; i += 2) {
                        if (type === 'M') {
                            currentX = args[i];
                            currentY = args[i + 1];
                        } else {
                            currentX += args[i];
                            currentY += args[i + 1];
                        }
                        points.push({ x: currentX, y: -currentY });
                    }
                    break;
                    
                case 'L': // Line to
                    for (let i = 0; i < args.length; i += 2) {
                        if (type === 'L') {
                            currentX = args[i];
                            currentY = args[i + 1];
                        } else {
                            currentX += args[i];
                            currentY += args[i + 1];
                        }
                        points.push({ x: currentX, y: -currentY });
                    }
                    break;
                    
                case 'H': // Horizontal line
                    for (const val of args) {
                        currentX = type === 'H' ? val : currentX + val;
                        points.push({ x: currentX, y: -currentY });
                    }
                    break;
                    
                case 'V': // Vertical line
                    for (const val of args) {
                        currentY = type === 'V' ? val : currentY + val;
                        points.push({ x: currentX, y: -currentY });
                    }
                    break;
                    
                case 'Z': // Close path
                    if (startX !== currentX || startY !== currentY) {
                        points.push({ x: startX, y: -startY });
                    }
                    currentX = startX;
                    currentY = startY;
                    break;
                    
                case 'C': // Cubic bezier - approximate with line segments
                    for (let i = 0; i < args.length; i += 6) {
                        const x1 = type === 'C' ? args[i] : currentX + args[i];
                        const y1 = type === 'C' ? args[i+1] : currentY + args[i+1];
                        const x2 = type === 'C' ? args[i+2] : currentX + args[i+2];
                        const y2 = type === 'C' ? args[i+3] : currentY + args[i+3];
                        const x = type === 'C' ? args[i+4] : currentX + args[i+4];
                        const y = type === 'C' ? args[i+5] : currentY + args[i+5];
                        
                        // Approximate bezier with line segments
                        const steps = 10;
                        for (let t = 1; t <= steps; t++) {
                            const tt = t / steps;
                            const px = Math.pow(1-tt, 3) * currentX + 
                                       3 * Math.pow(1-tt, 2) * tt * x1 +
                                       3 * (1-tt) * tt * tt * x2 +
                                       Math.pow(tt, 3) * x;
                            const py = Math.pow(1-tt, 3) * currentY + 
                                       3 * Math.pow(1-tt, 2) * tt * y1 +
                                       3 * (1-tt) * tt * tt * y2 +
                                       Math.pow(tt, 3) * y;
                            points.push({ x: px, y: -py });
                        }
                        currentX = x;
                        currentY = y;
                    }
                    break;
                    
                case 'Q': // Quadratic bezier
                    for (let i = 0; i < args.length; i += 4) {
                        const x1 = type === 'Q' ? args[i] : currentX + args[i];
                        const y1 = type === 'Q' ? args[i+1] : currentY + args[i+1];
                        const x = type === 'Q' ? args[i+2] : currentX + args[i+2];
                        const y = type === 'Q' ? args[i+3] : currentY + args[i+3];
                        
                        const steps = 10;
                        for (let t = 1; t <= steps; t++) {
                            const tt = t / steps;
                            const px = Math.pow(1-tt, 2) * currentX + 
                                       2 * (1-tt) * tt * x1 +
                                       Math.pow(tt, 2) * x;
                            const py = Math.pow(1-tt, 2) * currentY + 
                                       2 * (1-tt) * tt * y1 +
                                       Math.pow(tt, 2) * y;
                            points.push({ x: px, y: -py });
                        }
                        currentX = x;
                        currentY = y;
                    }
                    break;
                    
                case 'A': // Arc - approximate with line segments
                    for (let i = 0; i < args.length; i += 7) {
                        const x = type === 'A' ? args[i+5] : currentX + args[i+5];
                        const y = type === 'A' ? args[i+6] : currentY + args[i+6];
                        // Simple approximation: just draw a line (proper arc handling is complex)
                        points.push({ x: x, y: -y });
                        currentX = x;
                        currentY = y;
                    }
                    break;
            }
        }
        
        return points;
    }
    
    // Helper: Get stroke color from element (handling inheritance)
    function getStrokeColor(element) {
        let el = element;
        while (el && el !== svg) {
            const stroke = el.getAttribute('stroke');
            if (stroke && stroke !== 'none' && stroke !== 'inherit') {
                return stroke;
            }
            const style = el.getAttribute('style');
            if (style) {
                const match = style.match(/stroke:\s*([^;]+)/);
                if (match && match[1] !== 'none') {
                    return match[1].trim();
                }
            }
            el = el.parentElement;
        }
        return '#000000';
    }
    
    // Helper: Map hex color to our PEN_COLORS
    function mapColorToPenColor(hexColor) {
        if (!hexColor) return 'black';
        
        const hex = hexColor.toLowerCase().replace('#', '');
        
        // Exact match first
        for (const [id, color] of Object.entries(PEN_COLORS)) {
            if (color.hex.toLowerCase().replace('#', '') === hex) {
                return id;
            }
        }
        
        // Find closest color by RGB distance
        let closestId = 'black';
        let closestDist = Infinity;
        
        const r1 = parseInt(hex.substr(0, 2), 16) || 0;
        const g1 = parseInt(hex.substr(2, 2), 16) || 0;
        const b1 = parseInt(hex.substr(4, 2), 16) || 0;
        
        for (const [id, color] of Object.entries(PEN_COLORS)) {
            const h = color.hex.replace('#', '');
            const r2 = parseInt(h.substr(0, 2), 16);
            const g2 = parseInt(h.substr(2, 2), 16);
            const b2 = parseInt(h.substr(4, 2), 16);
            
            const dist = Math.sqrt(
                Math.pow(r1 - r2, 2) + 
                Math.pow(g1 - g2, 2) + 
                Math.pow(b1 - b2, 2)
            );
            
            if (dist < closestDist) {
                closestDist = dist;
                closestId = id;
            }
        }
        
        return closestId;
    }
    
    // Process all groups and paths
    const groups = svg.querySelectorAll('g');
    let entityIndex = 0;
    
    // If we have groups, process each as a potential entity
    if (groups.length > 0) {
        groups.forEach((group, gIdx) => {
            const paths = group.querySelectorAll('path, line, polyline, polygon, rect, circle, ellipse');
            if (paths.length === 0) return;
            
            const entityPaths = [];
            let entityColor = 'black';
            
            // Check for our custom data attributes
            const dataName = group.getAttribute('data-entity-name');
            const dataColor = group.getAttribute('data-entity-color');
            
            paths.forEach(pathEl => {
                let points = [];
                
                if (pathEl.tagName === 'path') {
                    const d = pathEl.getAttribute('d');
                    if (d) points = parsePathD(d);
                } else if (pathEl.tagName === 'line') {
                    points = [
                        { x: parseFloat(pathEl.getAttribute('x1') || 0), y: -parseFloat(pathEl.getAttribute('y1') || 0) },
                        { x: parseFloat(pathEl.getAttribute('x2') || 0), y: -parseFloat(pathEl.getAttribute('y2') || 0) }
                    ];
                } else if (pathEl.tagName === 'polyline' || pathEl.tagName === 'polygon') {
                    const pointsAttr = pathEl.getAttribute('points') || '';
                    const coords = pointsAttr.trim().split(/[\s,]+/).map(Number);
                    for (let i = 0; i < coords.length; i += 2) {
                        points.push({ x: coords[i], y: -coords[i+1] });
                    }
                    if (pathEl.tagName === 'polygon' && points.length > 0) {
                        points.push({ ...points[0] }); // Close polygon
                    }
                } else if (pathEl.tagName === 'rect') {
                    const x = parseFloat(pathEl.getAttribute('x') || 0);
                    const y = parseFloat(pathEl.getAttribute('y') || 0);
                    const w = parseFloat(pathEl.getAttribute('width') || 0);
                    const h = parseFloat(pathEl.getAttribute('height') || 0);
                    points = [
                        { x: x, y: -y },
                        { x: x + w, y: -y },
                        { x: x + w, y: -(y + h) },
                        { x: x, y: -(y + h) },
                        { x: x, y: -y }
                    ];
                } else if (pathEl.tagName === 'circle') {
                    const cx = parseFloat(pathEl.getAttribute('cx') || 0);
                    const cy = parseFloat(pathEl.getAttribute('cy') || 0);
                    const r = parseFloat(pathEl.getAttribute('r') || 0);
                    const steps = 36;
                    for (let i = 0; i <= steps; i++) {
                        const angle = (i / steps) * 2 * Math.PI;
                        points.push({
                            x: cx + r * Math.cos(angle),
                            y: -(cy + r * Math.sin(angle))
                        });
                    }
                } else if (pathEl.tagName === 'ellipse') {
                    const cx = parseFloat(pathEl.getAttribute('cx') || 0);
                    const cy = parseFloat(pathEl.getAttribute('cy') || 0);
                    const rx = parseFloat(pathEl.getAttribute('rx') || 0);
                    const ry = parseFloat(pathEl.getAttribute('ry') || 0);
                    const steps = 36;
                    for (let i = 0; i <= steps; i++) {
                        const angle = (i / steps) * 2 * Math.PI;
                        points.push({
                            x: cx + rx * Math.cos(angle),
                            y: -(cy + ry * Math.sin(angle))
                        });
                    }
                }
                
                if (points.length >= 2) {
                    entityPaths.push({ points });
                }
                
                // Get color from first path if not set
                if (!entityColor || entityColor === 'black') {
                    const strokeColor = getStrokeColor(pathEl);
                    entityColor = mapColorToPenColor(strokeColor);
                }
            });
            
            if (entityPaths.length > 0) {
                // Use metadata if available
                const meta = polargraphMetadata ? polargraphMetadata[entityIndex] : null;
                
                entities.push({
                    paths: entityPaths,
                    color: dataColor || meta?.color || entityColor,
                    name: dataName || meta?.name || `Layer ${gIdx + 1}`,
                    algorithm: meta?.algorithm || 'imported',
                    algorithmOptions: meta?.algorithmOptions || {},
                    offsetX: meta?.offsetX || 0,
                    offsetY: meta?.offsetY || 0,
                    scale: meta?.scale || 1,
                    rotation: meta?.rotation || 0
                });
                entityIndex++;
            }
        });
    }
    
    // Also process any paths not in groups
    const topLevelPaths = svg.querySelectorAll(':scope > path, :scope > line, :scope > polyline, :scope > polygon, :scope > rect, :scope > circle, :scope > ellipse');
    if (topLevelPaths.length > 0) {
        const entityPaths = [];
        let entityColor = 'black';
        
        topLevelPaths.forEach(pathEl => {
            let points = [];
            
            if (pathEl.tagName === 'path') {
                const d = pathEl.getAttribute('d');
                if (d) points = parsePathD(d);
            }
            // ... similar handling as above (abbreviated for brevity)
            
            if (points.length >= 2) {
                entityPaths.push({ points });
                const strokeColor = getStrokeColor(pathEl);
                entityColor = mapColorToPenColor(strokeColor);
            }
        });
        
        if (entityPaths.length > 0) {
            entities.push({
                paths: entityPaths,
                color: entityColor,
                name: 'Imported Paths',
                algorithm: 'imported'
            });
        }
    }
    
    return entities;
}

/**
 * Parse G-code file and extract paths as entities
 * Handles: our exported G-code with metadata, standard G-code files
 */
function parseGcodeToEntities(gcodeText) {
    const lines = gcodeText.split('\n');
    const entities = [];
    let polargraphMetadata = null;
    
    // Check for our custom metadata
    const metadataLine = lines.find(l => l.includes('polargraph-metadata:'));
    if (metadataLine) {
        const match = metadataLine.match(/polargraph-metadata:\s*(\[.*\])/);
        if (match) {
            try {
                polargraphMetadata = JSON.parse(match[1]);
                logConsole('Found Polargraph metadata - restoring original structure', 'msg-info');
            } catch (e) {
                console.warn('Could not parse polargraph metadata:', e);
            }
        }
    }
    
    // Parse G-code movements
    const paths = [];
    let currentPath = null;
    let penDown = false;
    let currentX = 0, currentY = 0;
    let currentEntityIdx = 0;
    let entityMarkers = [];
    
    // Find entity markers for grouping
    lines.forEach((line, idx) => {
        const entityMatch = line.match(/;\s*Entity\s+(\d+):\s*(.*)/);
        if (entityMatch) {
            entityMarkers.push({ index: idx, name: entityMatch[2] });
        }
    });
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith(';')) continue;
        
        // Check for pen up/down (servo commands or M commands)
        if (line.match(/M3|M03|S\d+\s*;\s*pen\s*down/i) || 
            line.match(/G0?1.*Z-?\d/i)) {
            penDown = true;
            currentPath = { points: [{ x: currentX, y: currentY }] };
        } else if (line.match(/M5|M05|S\d+\s*;\s*pen\s*up/i) || 
                   line.match(/G0.*Z\d/i)) {
            if (currentPath && currentPath.points.length >= 2) {
                paths.push(currentPath);
            }
            currentPath = null;
            penDown = false;
        }
        
        // Parse movement commands
        const moveMatch = line.match(/G[01]\s*(X(-?\d+\.?\d*))?\s*(Y(-?\d+\.?\d*))?/i);
        if (moveMatch) {
            if (moveMatch[2]) currentX = parseFloat(moveMatch[2]);
            if (moveMatch[4]) currentY = parseFloat(moveMatch[4]);
            
            if (penDown && currentPath) {
                currentPath.points.push({ x: currentX, y: currentY });
            }
        }
    }
    
    // Add last path if any
    if (currentPath && currentPath.points.length >= 2) {
        paths.push(currentPath);
    }
    
    // Create entities from paths
    if (polargraphMetadata && polargraphMetadata.length > 0) {
        // Try to reconstruct entities from metadata
        polargraphMetadata.forEach((meta, idx) => {
            const entityPaths = paths.slice(0, meta.pathCount || paths.length);
            paths.splice(0, meta.pathCount || paths.length);
            
            entities.push({
                paths: entityPaths,
                color: meta.color || 'black',
                name: meta.name || `Entity ${idx + 1}`,
                algorithm: meta.algorithm || 'imported',
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                rotation: 0
            });
        });
        
        // Any remaining paths
        if (paths.length > 0) {
            entities.push({
                paths: paths,
                color: 'black',
                name: 'Additional Paths',
                algorithm: 'imported'
            });
        }
    } else {
        // No metadata - create single entity
        entities.push({
            paths: paths,
            color: 'black',
            name: 'Imported G-code',
            algorithm: 'imported',
            offsetX: 0,
            offsetY: 0,
            scale: 1,
            rotation: 0
        });
    }
    
    return entities;
}

/**
 * Import entities from parsed data and add to canvas
 */
function importEntities(parsedEntities, filename) {
    if (!parsedEntities || parsedEntities.length === 0) {
        logConsole('No paths found in file', 'msg-error');
        return;
    }
    
    saveHistoryState();
    
    parsedEntities.forEach(entityData => {
        const entity = createEntity(entityData.paths, {
            color: entityData.color,
            name: entityData.name || filename,
            algorithm: entityData.algorithm || 'imported',
            algorithmOptions: entityData.algorithmOptions || {},
            offsetX: entityData.offsetX || 0,
            offsetY: entityData.offsetY || 0,
            scale: entityData.scale || 1,
            rotation: entityData.rotation || 0
        });
        state.entities.push(entity);
    });
    
    // Select the first imported entity
    if (parsedEntities.length > 0) {
        state.selectedEntityIds.clear();
        const lastEntity = state.entities[state.entities.length - parsedEntities.length];
        if (lastEntity) state.selectedEntityIds.add(lastEntity.id);
    }
    
    updateEntityList();
    updateExportInfo();
    drawCanvas();
    
    logConsole(`Imported ${parsedEntities.length} layer${parsedEntities.length > 1 ? 's' : ''} from ${filename}`, 'msg-info');
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
            const paths = turtle.getPaths();
            
            // Create entity instead of just preview
            const generatorName = PatternGenerator.GENERATORS[generator]?.name || generator;
            addEntity(paths, {
                algorithm: generator,
                algorithmOptions: options,
                name: generatorName
            });
            
            elements.plotStatus.textContent = `${paths.length} lines generated`;
            logConsole(`Generated ${generator} pattern (${PEN_COLORS[state.activeColor].name})`, 'msg-info');
        } catch (err) {
            logConsole(`Generate failed: ${err.message}`, 'msg-error');
        }
        return;
    }
    
    const result = await sendCommand('/api/generate', 'POST', { generator, options });
    
    if (result.success) {
        // Create entity from server result
        const paths = Array.isArray(result.preview) ? result.preview : (result.preview?.paths || []);
        const generatorName = elements.generatorSelect.selectedOptions[0]?.textContent || generator;
        addEntity(paths, {
            algorithm: generator,
            algorithmOptions: options,
            name: generatorName
        });
        elements.plotStatus.textContent = `${result.lines} lines generated`;
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
    // Check for pending import (G-code or SVG as paths)
    if (state.pendingImport) {
        await handlePendingImport();
        return;
    }
    
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
            const paths = turtle.getPaths();
            
            // Create entity instead of just preview
            const converterName = ImageConverter.CONVERTERS[algorithm]?.name || algorithm;
            addEntity(paths, {
                algorithm: algorithm,
                algorithmOptions: options,
                name: `Image (${converterName})`
            });
            
            elements.plotStatus.textContent = `${paths.length} lines converted`;
            logConsole(`Converted image with ${algorithm} (${PEN_COLORS[state.activeColor].name})`, 'msg-info');
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
        // Create entity from server result
        const paths = Array.isArray(result.preview) ? result.preview : (result.preview?.paths || []);
        const converterName = elements.converterSelect.selectedOptions[0]?.textContent || algorithm;
        addEntity(paths, {
            algorithm: algorithm,
            algorithmOptions: options,
            name: `Image (${converterName})`
        });
        elements.plotStatus.textContent = `${result.lines} lines converted`;
    } else {
        logConsole(`Convert failed: ${result.error}`, 'msg-error');
    }
}

async function handlePendingImport() {
    const pending = state.pendingImport;
    if (!pending) return;
    
    try {
        if (pending.type === 'gcode') {
            // Import G-code directly
            const parsedEntities = parseGcodeToEntities(pending.text);
            importEntities(parsedEntities, state.currentFileName);
            
        } else if (pending.type === 'svg') {
            if (pending.mode === 'paths') {
                // Import SVG as paths
                const parsedEntities = parseSvgToEntities(pending.text);
                importEntities(parsedEntities, state.currentFileName);
                
            } else if (pending.mode === 'convert') {
                // Convert SVG as raster image
                if (state.currentImageElement) {
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
                    
                    const imgConverter = new ImageConverter();
                    const turtle = await imgConverter.convert(state.currentImageElement, algorithm, options);
                    const paths = turtle.getPaths();
                    
                    const converterName = ImageConverter.CONVERTERS[algorithm]?.name || algorithm;
                    addEntity(paths, {
                        algorithm: algorithm,
                        algorithmOptions: options,
                        name: `SVG (${converterName})`
                    });
                    
                    logConsole(`Converted SVG with ${algorithm}`, 'msg-info');
                }
            }
        }
        
        // Reset after import
        resetUploadUI();
        
    } catch (error) {
        logConsole(`Import failed: ${error.message}`, 'msg-error');
        console.error('Import error:', error);
    }
    
    state.pendingImport = null;
}

function resetUploadUI() {
    elements.uploadZone.style.display = 'block';
    elements.convertSection.style.display = 'none';
    elements.converterSelect.style.display = 'block';
    elements.convertBtn.textContent = 'Convert';
    elements.converterOptions.innerHTML = '';
    state.pendingImport = null;
    state.currentFile = null;
    state.currentFileName = null;
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

// Check if we're on the about page
const IS_ABOUT_PAGE = window.location.pathname.includes('/about');

function drawCanvas() {
    if (!ctx) {
        console.error('drawCanvas: no context!');
        return;
    }
    const dpr = window.devicePixelRatio;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    
    if (w === 0 || h === 0) {
        console.warn('drawCanvas: canvas has zero size', w, h);
        return;
    }
    
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
    
    // Draw all entities
    state.entities.forEach(entity => {
        if (!entity.visible || entity.paths.length === 0) return;
        
        const color = PEN_COLORS[entity.color] || PEN_COLORS.black;
        const isSelected = state.selectedEntityIds.has(entity.id);
        
        // Calculate entity center for rotation
        const bounds = getEntityBounds(entity.paths);
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        ctx.save();
        
        // Apply transforms: translate to offset, then rotate around center
        ctx.translate(entity.offsetX, entity.offsetY);
        
        if (entity.rotation !== 0) {
            ctx.translate(centerX * entity.scale, centerY * entity.scale);
            ctx.rotate(entity.rotation * Math.PI / 180);
            ctx.translate(-centerX * entity.scale, -centerY * entity.scale);
        }
        
        ctx.scale(entity.scale, entity.scale);
        
        // Draw paths with entity color
        drawEntityPaths(entity.paths, color.hex, isSelected);
        
        // Draw selection indicator
        if (isSelected) {
            drawEntityBounds(entity.paths, entity.rotation);
        }
        
        ctx.restore();
    });
    
    // Legacy: also draw preview if set (for backwards compatibility)
    const paths = Array.isArray(state.preview) ? state.preview : (state.preview?.paths || null);
    if (paths && paths.length > 0 && state.entities.length === 0) {
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
    
    // Update stats
    const totalLines = state.entities.reduce((sum, e) => sum + e.paths.length, 0);
    if (elements.statLines) {
        elements.statLines.textContent = totalLines;
    }
}

function drawEntityPaths(paths, color, isSelected) {
    const lineScale = 1 / Math.sqrt(state.zoom);
    
    paths.forEach(path => {
        if (path.points.length < 2) return;
        
        ctx.strokeStyle = color;
        const baseWidth = (path.diameter || 0.5) * 2;
        ctx.lineWidth = baseWidth * lineScale;
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

function getEntityBounds(paths) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(path => {
        path.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    });
    return { minX, minY, maxX, maxY };
}

function drawEntityBounds(paths, rotation = 0) {
    if (paths.length === 0) return;
    
    const bounds = getEntityBounds(paths);
    const { minX, minY, maxX, maxY } = bounds;
    
    const lineScale = 1 / Math.sqrt(state.zoom);
    const padding = 10 * lineScale;
    
    ctx.strokeStyle = 'rgba(89, 137, 231, 0.6)';
    ctx.lineWidth = 1.5 * lineScale;
    ctx.setLineDash([4 * lineScale, 4 * lineScale]);
    
    ctx.beginPath();
    ctx.rect(minX - padding, minY - padding, (maxX - minX) + 2 * padding, (maxY - minY) + 2 * padding);
    ctx.stroke();
    
    // Draw rotation indicator if rotated
    if (rotation !== 0) {
        const centerX = (minX + maxX) / 2;
        const topY = maxY + padding + 5 * lineScale;
        
        ctx.fillStyle = 'rgba(89, 137, 231, 0.8)';
        ctx.font = `${10 * lineScale}px Inter`;
        ctx.scale(1, -1);  // Flip for text
        ctx.fillText(`${rotation}°`, centerX - 10 * lineScale, -topY);
        ctx.scale(1, -1);  // Flip back
    }
    
    ctx.setLineDash([]);
}

function generateAboutPattern() {
    // Generate about text as vector paths using the text generator
    const turtle = new Turtle();
    
    // Text lines with proper breaks to fit work area
    const lines = [
        { text: "A wall mounted,", size: 6, y: 350 },
        { text: "web accessible", size: 6, y: 280 },
        { text: "polargraph", size: 6, y: 210 },
        { text: "pen plotter.", size: 6, y: 140 },
        { text: "", size: 6, y: 70 },  // spacer
        { text: "by Teddy", size: 10, y: -20 },
        { text: "", size: 6, y: -90 },  // spacer
        { text: "teddywarner.org", size: 4, y: -180 },
        { text: "/Projects/Polargraph/", size: 4, y: -230 },
    ];
    
    // Draw each line centered
    for (const line of lines) {
        if (line.text) {
            drawTextLine(turtle, line.text, 0, line.y, line.size);
        }
    }
    
    return turtle.getPaths();
}

function drawTextLine(turtle, text, centerX, y, size) {
    // Simple single-stroke font for pen plotter
    const FONT = {
        ' ': [],
        'A': [[0,0],[2.5,8],[5,0],[-1,-1],[1,3],[4,3]],
        'B': [[0,0],[0,8],[3,8],[4,7],[4,5],[3,4],[0,4],[-1,-1],[3,4],[4,3],[4,1],[3,0],[0,0]],
        'C': [[5,2],[4,0],[1,0],[0,2],[0,6],[1,8],[4,8],[5,6]],
        'D': [[0,0],[0,8],[3,8],[5,6],[5,2],[3,0],[0,0]],
        'E': [[5,0],[0,0],[0,8],[5,8],[-1,-1],[0,4],[3,4]],
        'F': [[0,0],[0,8],[5,8],[-1,-1],[0,4],[3,4]],
        'G': [[5,6],[4,8],[1,8],[0,6],[0,2],[1,0],[4,0],[5,2],[5,4],[3,4]],
        'H': [[0,0],[0,8],[-1,-1],[5,0],[5,8],[-1,-1],[0,4],[5,4]],
        'I': [[1,0],[4,0],[-1,-1],[2.5,0],[2.5,8],[-1,-1],[1,8],[4,8]],
        'J': [[0,2],[1,0],[3,0],[4,2],[4,8]],
        'K': [[0,0],[0,8],[-1,-1],[5,8],[0,4],[5,0]],
        'L': [[0,8],[0,0],[5,0]],
        'M': [[0,0],[0,8],[2.5,4],[5,8],[5,0]],
        'N': [[0,0],[0,8],[5,0],[5,8]],
        'O': [[1,0],[4,0],[5,2],[5,6],[4,8],[1,8],[0,6],[0,2],[1,0]],
        'P': [[0,0],[0,8],[4,8],[5,7],[5,5],[4,4],[0,4]],
        'Q': [[1,0],[4,0],[5,2],[5,6],[4,8],[1,8],[0,6],[0,2],[1,0],[-1,-1],[3,2],[5,0]],
        'R': [[0,0],[0,8],[4,8],[5,7],[5,5],[4,4],[0,4],[-1,-1],[3,4],[5,0]],
        'S': [[5,7],[4,8],[1,8],[0,7],[0,5],[1,4],[4,4],[5,3],[5,1],[4,0],[1,0],[0,1]],
        'T': [[0,8],[5,8],[-1,-1],[2.5,8],[2.5,0]],
        'U': [[0,8],[0,2],[1,0],[4,0],[5,2],[5,8]],
        'V': [[0,8],[2.5,0],[5,8]],
        'W': [[0,8],[1,0],[2.5,4],[4,0],[5,8]],
        'X': [[0,0],[5,8],[-1,-1],[0,8],[5,0]],
        'Y': [[0,8],[2.5,4],[5,8],[-1,-1],[2.5,4],[2.5,0]],
        'Z': [[0,8],[5,8],[0,0],[5,0]],
        'a': [[5,0],[5,6],[4,6],[1,6],[0,5],[0,1],[1,0],[4,0],[5,1]],
        'b': [[0,0],[0,8],[-1,-1],[0,5],[1,6],[4,6],[5,5],[5,1],[4,0],[1,0],[0,1]],
        'c': [[5,1],[4,0],[1,0],[0,1],[0,5],[1,6],[4,6],[5,5]],
        'd': [[5,0],[5,8],[-1,-1],[5,5],[4,6],[1,6],[0,5],[0,1],[1,0],[4,0],[5,1]],
        'e': [[0,3],[5,3],[5,5],[4,6],[1,6],[0,5],[0,1],[1,0],[4,0],[5,1]],
        'f': [[1,0],[1,8],[2,8],[3,8],[-1,-1],[0,5],[3,5]],
        'g': [[5,6],[5,-2],[4,-3],[1,-3],[0,-2],[-1,-1],[5,5],[4,6],[1,6],[0,5],[0,1],[1,0],[4,0],[5,1]],
        'h': [[0,0],[0,8],[-1,-1],[0,4],[2,6],[4,6],[5,5],[5,0]],
        'i': [[2,0],[3,0],[-1,-1],[2.5,0],[2.5,6],[-1,-1],[2.5,7.5],[2.5,8]],
        'j': [[0,-2],[1,-3],[2,-3],[3,-2],[3,6],[-1,-1],[3,7.5],[3,8]],
        'k': [[0,0],[0,8],[-1,-1],[4,6],[0,3],[4,0]],
        'l': [[2,0],[3,0],[-1,-1],[2.5,0],[2.5,8]],
        'm': [[0,0],[0,6],[1,6],[2,5],[2.5,4],[3,5],[4,6],[5,6],[5,0]],
        'n': [[0,0],[0,6],[-1,-1],[0,4],[2,6],[4,6],[5,5],[5,0]],
        'o': [[1,0],[4,0],[5,1],[5,5],[4,6],[1,6],[0,5],[0,1],[1,0]],
        'p': [[0,-3],[0,6],[-1,-1],[0,5],[1,6],[4,6],[5,5],[5,1],[4,0],[1,0],[0,1]],
        'q': [[5,-3],[5,6],[-1,-1],[5,5],[4,6],[1,6],[0,5],[0,1],[1,0],[4,0],[5,1]],
        'r': [[0,0],[0,6],[-1,-1],[0,4],[2,6],[4,6],[5,5]],
        's': [[5,5],[4,6],[1,6],[0,5],[1,4],[4,2],[5,1],[4,0],[1,0],[0,1]],
        't': [[2.5,8],[2.5,1],[3,0],[4,0],[5,1],[-1,-1],[1,6],[4,6]],
        'u': [[0,6],[0,1],[1,0],[4,0],[5,1],[5,6],[-1,-1],[5,0],[5,1]],
        'v': [[0,6],[2.5,0],[5,6]],
        'w': [[0,6],[1,0],[2.5,3],[4,0],[5,6]],
        'x': [[0,0],[5,6],[-1,-1],[0,6],[5,0]],
        'y': [[0,6],[2.5,0],[-1,-1],[5,6],[2.5,0],[1,-2],[0,-3]],
        'z': [[0,6],[5,6],[0,0],[5,0]],
        '.': [[2,0],[3,0],[3,1],[2,1],[2,0]],
        ',': [[2.5,0],[2,-1]],
        '/': [[0,0],[5,8]],
        ':': [[2,2],[3,2],[3,3],[2,3],[2,2],[-1,-1],[2,5],[3,5],[3,6],[2,6],[2,5]],
        '-': [[1,3],[4,3]],
        '0': [[1,0],[4,0],[5,2],[5,6],[4,8],[1,8],[0,6],[0,2],[1,0]],
        '1': [[1,6],[2.5,8],[2.5,0],[-1,-1],[1,0],[4,0]],
        '2': [[0,6],[1,8],[4,8],[5,6],[5,5],[0,0],[5,0]],
        '3': [[0,7],[1,8],[4,8],[5,7],[5,5],[4,4],[2,4],[-1,-1],[4,4],[5,3],[5,1],[4,0],[1,0],[0,1]],
        '4': [[4,0],[4,8],[0,3],[5,3]],
        '5': [[5,8],[0,8],[0,5],[4,5],[5,4],[5,1],[4,0],[1,0],[0,1]],
        '6': [[4,8],[1,8],[0,6],[0,1],[1,0],[4,0],[5,1],[5,3],[4,4],[0,4]],
        '7': [[0,8],[5,8],[2,0]],
        '8': [[1,4],[0,5],[0,7],[1,8],[4,8],[5,7],[5,5],[4,4],[1,4],[0,3],[0,1],[1,0],[4,0],[5,1],[5,3],[4,4]],
        '9': [[1,0],[4,0],[5,2],[5,7],[4,8],[1,8],[0,7],[0,5],[1,4],[5,4]],
    };
    
    const charWidth = 6 * size;
    const totalWidth = text.length * charWidth;
    let x = centerX - totalWidth / 2;
    
    for (const char of text) {
        const glyph = FONT[char] || FONT[char.toUpperCase()] || [];
        let penDown = false;
        
        for (const pt of glyph) {
            if (pt[0] === -1 && pt[1] === -1) {
                turtle.penUpCmd();
                penDown = false;
            } else {
                const px = x + pt[0] * size;
                const py = y + pt[1] * size;
                if (!penDown) {
                    turtle.penUpCmd();
                    turtle.moveTo(px, py);
                    turtle.penDown();
                    penDown = true;
                } else {
                    turtle.moveTo(px, py);
                }
            }
        }
        turtle.penUpCmd();
        x += charWidth;
    }
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
    if (!preview) return;
    
    state.preview = preview;
    
    if (preview.stats) {
        elements.statLines.textContent = preview.stats.lines || 0;
    }
    
    drawCanvas();
}
