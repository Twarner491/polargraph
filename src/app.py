#!/usr/bin/env python3
"""
Polargraph Web Interface - Flask application for controlling a polargraph plotter.
Replicates Makelangelo software functionality via a web interface.
"""

import os
import json
import threading
import time
from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit

# Import modules
from modules.serial_handler import SerialHandler
from modules.gcode_generator import GCodeGenerator
from modules.image_converter import ImageConverter
from modules.turtle_generator import TurtleGenerator
from modules.file_handler import FileHandler
from modules.plotter_settings import PlotterSettings

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global instances
serial_handler = SerialHandler()
plotter_settings = PlotterSettings()
gcode_generator = GCodeGenerator(plotter_settings)
image_converter = ImageConverter(plotter_settings)
turtle_generator = TurtleGenerator(plotter_settings)
file_handler = FileHandler(plotter_settings)

# Current state
current_turtle = None
current_gcode = []
is_plotting = False
is_paused = False
current_line = 0


def serial_callback(message):
    """Callback for serial messages from the plotter."""
    global is_plotting, is_paused
    
    socketio.emit('serial_message', {'message': message})
    
    # Check for 'ok' response to send next line during plotting
    if is_plotting and not is_paused:
        if message.lower().startswith('ok'):
            send_next_line()


def send_next_line():
    """Send the next G-code line to the plotter."""
    global current_line, is_plotting, is_paused, gondola_position
    
    if is_paused or not is_plotting:
        return
        
    if current_line < len(current_gcode):
        line = current_gcode[current_line]
        
        # Skip empty lines and comments
        if line.strip() and not line.strip().startswith(';'):
            serial_handler.send_command(line)
            
            # Parse position from G0/G1 commands for gondola tracking
            update_gondola_position(line)
        
        socketio.emit('progress', {
            'current': current_line,
            'total': len(current_gcode),
            'percent': int(100 * (current_line + 1) / max(1, len(current_gcode))),
            'gondola': gondola_position
        })
        current_line += 1
        
        # If the line was a comment or empty, immediately send next
        if not line.strip() or line.strip().startswith(';'):
            send_next_line()
    else:
        is_plotting = False
        socketio.emit('plot_complete', {'message': 'Plot complete!'})
        # Auto-clear uploads after plot finishes
        clear_uploads_folder()


# Gondola position tracking
gondola_position = {'x': 0, 'y': 0, 'z': 90}

def update_gondola_position(gcode_line: str):
    """Parse G-code line to update gondola position."""
    global gondola_position
    
    line = gcode_line.upper().strip()
    if not line or line.startswith(';'):
        return
    
    parts = line.split()
    if not parts:
        return
    
    cmd = parts[0]
    if cmd in ('G0', 'G1', 'G00', 'G01'):
        for part in parts[1:]:
            if part.startswith('X'):
                try:
                    gondola_position['x'] = float(part[1:])
                except ValueError:
                    pass
            elif part.startswith('Y'):
                try:
                    gondola_position['y'] = float(part[1:])
                except ValueError:
                    pass
            elif part.startswith('Z'):
                try:
                    gondola_position['z'] = float(part[1:])
                except ValueError:
                    pass


# ============================================================================
# Routes - Pages
# ============================================================================

@app.route('/')
def index():
    """Main page."""
    return render_template('index.html')


@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files."""
    return send_from_directory('static', filename)


@app.route('/uploads/<path:filename>')
def uploaded_files(filename):
    """Serve uploaded files."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ============================================================================
# Routes - Connection
# ============================================================================

@app.route('/api/ports', methods=['GET'])
def list_ports():
    """List available serial ports."""
    ports = serial_handler.list_ports()
    return jsonify({'ports': ports})


@app.route('/api/connect', methods=['POST'])
def connect():
    """Connect to a serial port."""
    data = request.json
    port = data.get('port')
    baud = data.get('baud', 57600)  # Match firmware
    
    success = serial_handler.connect(port, baud, serial_callback)
    
    if success:
        # Initialize like test_hardware.py does
        time.sleep(0.5)  # Wait for firmware
        serial_handler.send_command('M100')  # Get info
        time.sleep(0.3)
        serial_handler.send_command('G92 X0 Y0 Z90')  # Reset position
    
    return jsonify({'success': success, 'port': port})


@app.route('/api/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from serial port."""
    serial_handler.disconnect()
    return jsonify({'success': True})


@app.route('/api/connection_status', methods=['GET'])
def connection_status():
    """Get current connection status."""
    return jsonify({
        'connected': serial_handler.is_connected(),
        'port': serial_handler.current_port
    })


# ============================================================================
# Routes - Plotter Control
# ============================================================================

@app.route('/api/home', methods=['POST'])
def home():
    """Custom homing sequence for polargraph with dual endstops."""
    if not serial_handler.is_connected():
        return jsonify({'success': False, 'error': 'Not connected'})
    
    # Enable motors
    serial_handler.send_command('M17')
    time.sleep(0.3)
    
    # Home left motor first (move left until endstop)
    serial_handler.send_command('G28 X')
    time.sleep(0.5)
    
    # Home right motor (move right until endstop)
    serial_handler.send_command('G28 Y')
    time.sleep(0.5)
    
    # Move to upper center position
    serial_handler.send_command('G90')  # Absolute mode
    serial_handler.send_command('G0 X0 Y0 F500')  # Center position
    
    return jsonify({'success': True})


@app.route('/api/jog', methods=['POST'])
def jog():
    """Jog the plotter by a relative amount (matches test_hardware.py pattern)."""
    if not serial_handler.is_connected():
        return jsonify({'success': False, 'error': 'Not connected'})
    
    data = request.json
    x = data.get('x', 0)
    y = data.get('y', 0)
    feedrate = data.get('feedrate', 50)  # Very slow for smooth jog
    
    # Enable motors and set smooth acceleration
    serial_handler.send_command('M17')
    time.sleep(0.2)
    serial_handler.send_command('M201 X50 Y50')  # Low acceleration
    time.sleep(0.1)
    serial_handler.send_command('G91')  # Relative mode
    time.sleep(0.1)
    serial_handler.send_command(f'G0 X{x} Y{y} F{feedrate}')
    time.sleep(1.5)  # Wait for move to complete
    serial_handler.send_command('G90')  # Back to absolute
    return jsonify({'success': True})


@app.route('/api/goto', methods=['POST'])
def goto():
    """Move to an absolute position."""
    if not serial_handler.is_connected():
        return jsonify({'success': False, 'error': 'Not connected'})
    
    data = request.json
    x = data.get('x', 0)
    y = data.get('y', 0)
    feedrate = data.get('feedrate', plotter_settings.get('feed_rate_travel'))
    
    serial_handler.send_command(f'G0 X{x} Y{y} F{feedrate}')
    return jsonify({'success': True})


@app.route('/api/pen', methods=['POST'])
def pen_control():
    """Control pen up/down using G0 Z (matches test_hardware.py exactly)."""
    if not serial_handler.is_connected():
        return jsonify({'success': False, 'error': 'Not connected'})
    
    data = request.json
    action = data.get('action', 'up')
    
    if action == 'up':
        target_angle = 90
        # Tell firmware current Z is different so it will move
        current_angle = 40
    else:
        target_angle = 40
        current_angle = 90
    
    # Reset Z position to force movement (firmware won't move if it thinks it's already there)
    serial_handler.send_command(f'G92 Z{current_angle}')
    time.sleep(0.1)
    serial_handler.send_command(f'G0 Z{target_angle} F1000')
    time.sleep(0.5)
    
    return jsonify({'success': True, 'action': action, 'angle': target_angle})


@app.route('/api/motors', methods=['POST'])
def motor_control():
    """Enable/disable motors."""
    if not serial_handler.is_connected():
        return jsonify({'success': False, 'error': 'Not connected'})
    
    data = request.json
    enable = data.get('enable', True)
    
    if enable:
        serial_handler.send_command('M17')
    else:
        serial_handler.send_command('M18')
    
    return jsonify({'success': True})


@app.route('/api/emergency_stop', methods=['POST'])
def emergency_stop():
    """Emergency stop - HIGHEST PRIORITY, stops everything immediately."""
    global is_plotting, is_paused
    is_plotting = False
    is_paused = False
    
    if serial_handler.is_connected():
        # Send emergency stop commands as raw bytes to bypass any buffering
        # M112 is the universal emergency stop G-code
        for _ in range(5):
            serial_handler.send_raw('M112')
        time.sleep(0.1)
        
        # Also disable motors
        serial_handler.send_raw('M18')
        
        # Raise pen for safety
        serial_handler.send_raw('G0 Z90 F1000')
        
        # Flush serial buffers
        if serial_handler.serial:
            serial_handler.serial.reset_input_buffer()
            serial_handler.serial.reset_output_buffer()
    
    return jsonify({'success': True})


@app.route('/api/send_gcode', methods=['POST'])
def send_gcode():
    """Send a single G-code command."""
    if not serial_handler.is_connected():
        return jsonify({'success': False, 'error': 'Not connected'})
    
    data = request.json
    command = data.get('command', '')
    
    if command:
        serial_handler.send_command(command)
    
    return jsonify({'success': True})


# ============================================================================
# Routes - Plotting
# ============================================================================

@app.route('/api/plot/start', methods=['POST'])
def plot_start():
    """Start plotting the current G-code."""
    global is_plotting, is_paused, current_line, gondola_position
    
    if not serial_handler.is_connected():
        return jsonify({'success': False, 'error': 'Not connected'})
    
    if not current_gcode:
        return jsonify({'success': False, 'error': 'No G-code loaded'})
    
    is_plotting = True
    is_paused = False
    current_line = 0  # Reset to beginning
    gondola_position = {'x': 0, 'y': 0, 'z': 90}  # Reset gondola
    
    # Enable motors first
    serial_handler.send_command('M17')
    time.sleep(0.5)
    
    # Set smooth acceleration settings for polargraph
    serial_handler.send_command('M201 X50 Y50')    # Max acceleration (low for smooth motion)
    time.sleep(0.1)
    serial_handler.send_command('M204 P50 T100')   # Print/travel acceleration
    time.sleep(0.1)
    serial_handler.send_command('M205 X5 Y5')      # Jerk limits (low for smooth corners)
    time.sleep(0.1)
    
    # Run homing sequence before plotting
    serial_handler.send_command('G28 X')  # Home left
    time.sleep(1.0)
    serial_handler.send_command('G28 Y')  # Home right  
    time.sleep(1.0)
    serial_handler.send_command('G90')    # Absolute mode
    serial_handler.send_command('G0 X0 Y0 F300')  # Go to center slowly
    time.sleep(2.0)
    
    # Send start G-code if any
    start_gcode = plotter_settings.get('start_gcode')
    if start_gcode:
        for line in start_gcode.split('\n'):
            if line.strip():
                serial_handler.send_command(line.strip())
                time.sleep(0.1)
    
    # Send first line
    send_next_line()
    return jsonify({'success': True, 'lines': len(current_gcode)})


@app.route('/api/plot/pause', methods=['POST'])
def plot_pause():
    """Pause plotting."""
    global is_paused
    is_paused = True
    
    # Raise pen when pausing (use G0 Z for Makelangelo firmware)
    angle = plotter_settings.get('pen_angle_up')
    serial_handler.send_command(f'G0 Z{angle} F1000')
    
    return jsonify({'success': True})


@app.route('/api/plot/resume', methods=['POST'])
def plot_resume():
    """Resume plotting."""
    global is_paused
    is_paused = False
    send_next_line()
    return jsonify({'success': True})


@app.route('/api/plot/stop', methods=['POST'])
def plot_stop():
    """Stop plotting."""
    global is_plotting, is_paused, current_line
    is_plotting = False
    is_paused = False
    current_line = 0
    
    # Send end G-code
    end_gcode = plotter_settings.get('end_gcode')
    if end_gcode:
        for line in end_gcode.split('\n'):
            if line.strip():
                serial_handler.send_command(line.strip())
    
    return jsonify({'success': True})


@app.route('/api/plot/rewind', methods=['POST'])
def plot_rewind():
    """Rewind to the beginning."""
    global current_line
    current_line = 0
    return jsonify({'success': True})


@app.route('/api/plot/goto_line', methods=['POST'])
def plot_goto_line():
    """Go to a specific line."""
    global current_line
    data = request.json
    line = data.get('line', 0)
    current_line = max(0, min(line, len(current_gcode)))
    return jsonify({'success': True, 'line': current_line})


@app.route('/api/plot/status', methods=['GET'])
def plot_status():
    """Get current plot status."""
    return jsonify({
        'is_plotting': is_plotting,
        'is_paused': is_paused,
        'current_line': current_line,
        'total_lines': len(current_gcode),
        'percent': int(100 * current_line / max(1, len(current_gcode)))
    })


# ============================================================================
# Routes - File Handling
# ============================================================================

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload and process a file."""
    global current_turtle, current_gcode
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'})
    
    # Save file
    filename = file.filename
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    try:
        # Process based on file type
        ext = os.path.splitext(filename)[1].lower()
        
        if ext in ['.svg', '.dxf']:
            current_turtle = file_handler.load_vector(filepath)
        elif ext in ['.gcode', '.ngc', '.nc']:
            current_gcode = file_handler.load_gcode(filepath)
            # Generate preview turtle from G-code
            current_turtle = gcode_generator.gcode_to_turtle(current_gcode)
        elif ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp']:
            # Store image for conversion (don't convert yet)
            return jsonify({
                'success': True,
                'type': 'image',
                'filepath': filepath,
                'message': 'Image uploaded. Choose a conversion method.'
            })
        else:
            return jsonify({'success': False, 'error': f'Unsupported file type: {ext}'})
        
        # Generate G-code from turtle
        if current_turtle:
            current_gcode = gcode_generator.turtle_to_gcode(current_turtle)
        
        # Get preview data
        preview = get_preview_data()
        
        return jsonify({
            'success': True,
            'preview': preview,
            'lines': len(current_gcode),
            'message': f'Loaded {filename}'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/convert_image', methods=['POST'])
def convert_image():
    """Convert an image using a specific algorithm."""
    global current_turtle, current_gcode
    
    data = request.json
    filepath = data.get('filepath')
    algorithm = data.get('algorithm', 'spiral')
    options = data.get('options', {})
    
    if not filepath or not os.path.exists(filepath):
        return jsonify({'success': False, 'error': 'Image file not found'})
    
    try:
        current_turtle = image_converter.convert(filepath, algorithm, options)
        current_gcode = gcode_generator.turtle_to_gcode(current_turtle)
        preview = get_preview_data()
        
        return jsonify({
            'success': True,
            'preview': preview,
            'lines': len(current_gcode),
            'message': f'Converted using {algorithm}'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/generate', methods=['POST'])
def generate_pattern():
    """Generate a pattern using turtle generators."""
    global current_turtle, current_gcode
    
    data = request.json
    generator = data.get('generator', 'spiral')
    options = data.get('options', {})
    
    try:
        current_turtle = turtle_generator.generate(generator, options)
        current_gcode = gcode_generator.turtle_to_gcode(current_turtle)
        preview = get_preview_data()
        
        return jsonify({
            'success': True,
            'preview': preview,
            'lines': len(current_gcode),
            'message': f'Generated {generator} pattern'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/export/gcode', methods=['GET'])
def export_gcode():
    """Export current G-code."""
    if not current_gcode:
        return jsonify({'success': False, 'error': 'No G-code to export'})
    
    return jsonify({
        'success': True,
        'gcode': '\n'.join(current_gcode)
    })


@app.route('/api/export/svg', methods=['GET'])
def export_svg():
    """Export current drawing as SVG."""
    if not current_turtle:
        return jsonify({'success': False, 'error': 'No drawing to export'})
    
    svg = file_handler.turtle_to_svg(current_turtle)
    return jsonify({'success': True, 'svg': svg})


@app.route('/api/clear_uploads', methods=['POST'])
def clear_uploads():
    """Manually clear the uploads folder."""
    clear_uploads_folder()
    return jsonify({'success': True, 'message': 'Uploads cleared'})


@app.route('/api/transform', methods=['POST'])
def transform_preview():
    """Apply offset and scale transform to the current turtle paths."""
    global current_turtle, current_gcode
    
    if not current_turtle:
        return jsonify({'success': False, 'error': 'No drawing to transform'})
    
    data = request.json
    offset_x = data.get('offsetX', 0)
    offset_y = data.get('offsetY', 0)
    scale = data.get('scale', 1)
    
    # Apply transform to turtle
    if scale != 1:
        current_turtle.scale(scale)
    if offset_x != 0 or offset_y != 0:
        current_turtle.translate(offset_x, offset_y)
    
    # Regenerate G-code
    current_gcode = gcode_generator.turtle_to_gcode(current_turtle)
    preview = get_preview_data()
    
    return jsonify({
        'success': True,
        'preview': preview,
        'lines': len(current_gcode)
    })


def get_preview_data():
    """Get preview data for the current turtle."""
    if not current_turtle:
        return None
    
    return {
        'paths': current_turtle.get_paths(),
        'bounds': current_turtle.get_bounds(),
        'stats': {
            'points': current_turtle.count_points(),
            'lines': current_turtle.count_lines(),
            'draw_distance': current_turtle.get_draw_distance(),
            'travel_distance': current_turtle.get_travel_distance()
        }
    }


def clear_uploads_folder():
    """Clear all files from the uploads folder."""
    upload_folder = app.config['UPLOAD_FOLDER']
    try:
        for filename in os.listdir(upload_folder):
            filepath = os.path.join(upload_folder, filename)
            if os.path.isfile(filepath):
                os.remove(filepath)
        print("Uploads folder cleared")
    except Exception as e:
        print(f"Error clearing uploads: {e}")


# ============================================================================
# Routes - Settings
# ============================================================================

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get all plotter settings."""
    return jsonify(plotter_settings.get_all())


@app.route('/api/settings', methods=['POST'])
def update_settings():
    """Update plotter settings."""
    data = request.json
    plotter_settings.update(data)
    plotter_settings.save()
    return jsonify({'success': True})


@app.route('/api/settings/machine', methods=['GET'])
def get_machine_info():
    """Get machine dimensions and info."""
    return jsonify({
        'width': plotter_settings.get('machine_width'),
        'height': plotter_settings.get('machine_height'),
        'work_area': {
            'left': plotter_settings.get('limit_left'),
            'right': plotter_settings.get('limit_right'),
            'top': plotter_settings.get('limit_top'),
            'bottom': plotter_settings.get('limit_bottom')
        }
    })


# ============================================================================
# Routes - Generators Info
# ============================================================================

@app.route('/api/generators', methods=['GET'])
def list_generators():
    """List available pattern generators."""
    return jsonify({'generators': turtle_generator.list_generators()})


@app.route('/api/converters', methods=['GET'])
def list_converters():
    """List available image converters."""
    return jsonify({'converters': image_converter.list_converters()})


# ============================================================================
# WebSocket Events
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """Handle client connection."""
    emit('connected', {'status': 'connected'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    pass


@socketio.on('ping_plotter')
def handle_ping():
    """Ping the plotter for status."""
    if serial_handler.is_connected():
        serial_handler.send_command('M114')


# ============================================================================
# Main
# ============================================================================

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

