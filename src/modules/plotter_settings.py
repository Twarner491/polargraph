"""
Plotter settings manager.
Stores and manages all plotter configuration parameters.
"""

import json
import os
from typing import Any, Dict

# Machine specifications for the custom 60" x 48" polargraph
# Work area equivalent to A0 paper (841 x 1189 mm)
DEFAULT_SETTINGS = {
    # Machine dimensions (mm)
    'machine_width': 1219.2,   # 48 inches
    'machine_height': 1524.0,  # 60 inches
    
    # Work area limits (mm) - A0 paper centered
    'limit_left': -420.5,      # Half A0 width
    'limit_right': 420.5,
    'limit_top': 594.5,        # Half A0 height
    'limit_bottom': -594.5,
    
    # Motor settings
    'steps_per_unit': 80.0,    # Steps per mm (with 16x microstepping)
    
    # Pen servo settings (servo0) - matches test_hardware.py
    'pen_angle_up': 90,        # Degrees when pen is up
    'pen_angle_down': 40,      # Degrees when pen is down (Z40 in test_hardware.py)
    'pen_angle_up_time': 250,  # ms to raise pen
    'pen_angle_down_time': 150, # ms to lower pen
    
    # Feed rates (mm/min) - slower for smooth polargraph motion
    'feed_rate_travel': 1000,  # Speed when pen is up
    'feed_rate_draw': 500,     # Speed when pen is down (slower for quality)
    
    # Acceleration (mm/s²)
    'max_acceleration': 100,
    'min_acceleration': 0,
    
    # Pen settings
    'pen_diameter': 0.8,       # mm
    'pen_kerf': 0.45,          # mm - effective line width for overlap calculations
    
    # Planner settings
    'block_buffer_size': 16,
    'segments_per_second': 5,
    'min_segment_length': 0.5,  # mm
    
    # Home position
    'home_x': 0,
    'home_y': 0,
    
    # Custom G-code
    'start_gcode': '',
    'end_gcode': 'M280 P0 S90 T250\nG0 X0 Y0 F3000',
    'find_home_gcode': 'G28 X Y',
    'pen_up_gcode': 'M280 P0 S{angle} T{time}',
    'pen_down_gcode': 'M280 P0 S{angle} T{time}',
    
    # Serial - matches test_hardware.py
    'baud_rate': 57600,
}


class PlotterSettings:
    """Manages plotter settings with persistence."""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__), '..', 'config', 'settings.json'
        )
        self.settings: Dict[str, Any] = DEFAULT_SETTINGS.copy()
        self.load()
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a setting value."""
        return self.settings.get(key, default)
    
    def set(self, key: str, value: Any):
        """Set a setting value."""
        self.settings[key] = value
    
    def get_all(self) -> Dict[str, Any]:
        """Get all settings."""
        return self.settings.copy()
    
    def update(self, data: Dict[str, Any]):
        """Update multiple settings."""
        self.settings.update(data)
    
    def load(self):
        """Load settings from file."""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    loaded = json.load(f)
                    self.settings.update(loaded)
        except Exception as e:
            print(f"Error loading settings: {e}")
    
    def save(self):
        """Save settings to file."""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(self.settings, f, indent=2)
        except Exception as e:
            print(f"Error saving settings: {e}")
    
    def get_pen_up_command(self) -> str:
        """Get the pen up G-code command (uses G0 Z for Makelangelo firmware)."""
        return f"G0 Z{self.get('pen_angle_up')} F1000"
    
    def get_pen_down_command(self) -> str:
        """Get the pen down G-code command (uses G0 Z for Makelangelo firmware)."""
        return f"G0 Z{self.get('pen_angle_down')} F1000"
    
    def get_goto_command(self, x: float, y: float, pen_down: bool = False) -> str:
        """Get a move command."""
        feedrate = self.get('feed_rate_draw' if pen_down else 'feed_rate_travel')
        return f"G{'1' if pen_down else '0'} X{x:.3f} Y{y:.3f} F{feedrate}"
    
    def get_work_area(self) -> Dict[str, float]:
        """Get the work area bounds."""
        return {
            'left': self.get('limit_left'),
            'right': self.get('limit_right'),
            'top': self.get('limit_top'),
            'bottom': self.get('limit_bottom'),
            'width': self.get('limit_right') - self.get('limit_left'),
            'height': self.get('limit_top') - self.get('limit_bottom')
        }

