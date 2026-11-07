"""
Plotter settings manager.
Stores and manages all plotter configuration parameters.
"""

import copy
import json
import tempfile
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
    
    # Motor / kinematics
    'steps_per_unit': 100.0,   # Steps per mm (16-tooth GT2 pulley, 16x microstepping)
    'motor_spacing': 1057.1,   # Distance between the two motor pulleys (mm) - the kinematic 'b'
    # Belt length (mm) at the homed reference (counterweights up at the top endstops).
    # 0 = not yet calibrated; set by auto-calibration, persisted to firmware via D7 + D9.
    'home_belt_left': 0.0,
    'home_belt_right': 0.0,
    
    # Pen servo settings (servo0) - matches test_hardware.py
    'pen_angle_up': 90,        # Degrees when pen is up
    'pen_angle_down': 40,      # Degrees when pen is down (Z40 in test_hardware.py)
    'pen_angle_up_time': 250,  # ms to raise pen
    'pen_angle_down_time': 150, # ms to lower pen
    
    # Feed rates (mm/min) - auto-tuned 2026-06-14 via slip+jitter sweep:
    # smooth & slip-free at 40 mm/s; slip/jitter ceiling measured at ~48-60 mm/s.
    'feed_rate_travel': 2400,  # 40 mm/s, pen up
    'feed_rate_draw': 2400,    # 40 mm/s, pen down
    
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
    
    # Motion limits pushed to the firmware (auto-tuned via slip detection).
    # Conservative defaults; the wizard ramps these up to the fastest slip-free values.
    'max_step_rate': 8000.0,   # steps/s per motor (firmware M203); only applied by the motion tuner
    'accel': 500.0,            # mm/s^2 (auto-tuned 2026-06-14; applied per job via the G1 'A' parameter)
    'jerk': 12.0,              # firmware M205 (auto-tuned 2026-06-14)

    # Pen pressure: per-color override of pen_angle_down (deeper angle = more pressure).
    # Each color is a separate swappable pen holder, so each can hold its own profile.
    'pen_down_angles': {},     # e.g. {'black': 40, 'red': 38}
    'pen_eject_angle': 150,    # servo angle that ejects the pen holder for swapping
    'active_color': 'black',   # currently loaded pen color (selects the pressure profile)

    # Maintenance / safety
    'cap_prompt_enabled': True,    # prompt to uncap before, and recap after, any draw
    'motor_idle_disable': True,    # disable steppers when idle (they run hot)
    'motor_idle_timeout_s': 120,   # firmware idle-disable timeout (seconds)
    'servo_detach_idle': True,     # detach pen servo when idle to stop the buzz

    # Calibration metadata
    'calibrated': False,
    'calibration_pending': None,
    'calibration_profile': None,
    'motor_y': None,  # Motor anchor height; independent of the paper's top edge.
    'calibration_date': '',
    'edge_corrections': {},        # precision draw-and-measure per-region scale factors

    # Serial - matches test_hardware.py
    'baud_rate': 57600,
}


class PlotterSettings:
    """Manages plotter settings with persistence."""
    
    def __init__(self, config_path: str = None):
        self.config_path = config_path or os.path.join(
            os.path.dirname(__file__), '..', 'config', 'settings.json'
        )
        self.settings: Dict[str, Any] = copy.deepcopy(DEFAULT_SETTINGS)
        self.load()
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get a setting value."""
        return self.settings.get(key, default)
    
    def set(self, key: str, value: Any):
        """Set a setting value."""
        self.settings[key] = value
    
    def get_all(self) -> Dict[str, Any]:
        """Get all settings."""
        return copy.deepcopy(self.settings)
    
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
        """Atomically replace a complete JSON file; never hide a failed save."""
        directory = os.path.dirname(os.path.abspath(self.config_path))
        os.makedirs(directory, exist_ok=True)
        payload = json.dumps(self.settings, indent=2, allow_nan=False)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', dir=directory, delete=False,
                                             prefix='.settings-', suffix='.json') as stream:
                temporary = stream.name
                stream.write(payload + '\n')
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.config_path)
            temporary = None
            return True
        finally:
            if temporary is not None:
                os.unlink(temporary)

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

    def get_pen_down_angle(self, color: str = None) -> float:
        """Pen-down servo angle for a color, falling back to the global default."""
        angles = self.get('pen_down_angles') or {}
        if color and color in angles:
            return angles[color]
        return self.get('pen_angle_down')

    def get_firmware_geometry_commands(self) -> list:
        """G/M-codes that push current GEOMETRY into the controller's EEPROM, so
        calibration survives a reboot.

        Geometry only: steps/mm (M92), motor spacing as the axis-0 limits
        (M101 A0 - in this firmware those limits ARE the kinematic motor
        positions; the paper bounds are enforced host-side, not here), and the
        belt calibration (D7). Motion limits (step rate / jerk / acceleration)
        are intentionally NOT pushed here - they are applied only by the motion
        tuner, so applying geometry never clobbers tuned speeds.

        Persistence is split: M500 saves steps/limits; belt calibration (D7)
        saves separately via D9.
        """
        spu = self.get('steps_per_unit')
        half = self.get('motor_spacing') / 2.0
        cmds = [
            f"M92 X{spu:.4f} Y{spu:.4f}",
            f"M101 A0 T{half:.3f} B{-half:.3f}",
        ]
        if self.get('motor_y') is None or not self.get('calibrated'):
            raise ValueError('Run the measured Setup wizard before applying geometry.')
        cmds.append(f"M101 A1 T{self.get('motor_y'):.3f} B{self.get('calibration_profile')['geometry']['datum_bottom']:.3f}")
        left, right = self.get('home_belt_left'), self.get('home_belt_right')
        has_belt_cal = left > 0 and right > 0
        if has_belt_cal:
            cmds.append(f"D7 L{left:.2f} R{right:.2f}")
        cmds.append("M500")
        if has_belt_cal:
            cmds.append("D9")
        return cmds

