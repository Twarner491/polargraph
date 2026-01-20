#!/usr/bin/env python3
"""
Polargraph Calibration Script

This script helps calibrate the polargraph by measuring actual machine dimensions.
You manually move the gondola to corner positions by turning the stepper motors,
and the script records the belt lengths to calculate real dimensions.

The polargraph coordinate system:
  - Origin (0,0) is at the center between the two motors
  - X axis: left (-) to right (+)
  - Y axis: down (-) to up (+)
  - Left motor position: (limitMin, limitMax) = negative X
  - Right motor position: (limitMax, limitMax) = positive X

Usage:
  python calibrate.py

Requirements: pip install pyserial
"""

import serial
import serial.tools.list_ports
import time
import sys
import os
import json
import math

# Fix Windows console encoding
if os.name == 'nt':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Configuration
BAUD_RATE = 57600
TIMEOUT = 5

# Steps per mm for GT2 belt with 16-tooth pulley and 1/16 microstepping
# 16 teeth * 2mm pitch = 32mm per revolution
# 200 steps * 16 microsteps = 3200 steps per revolution
# 3200 / 32 = 100 steps per mm
STEPS_PER_MM = 100


class PolargraphCalibrator:
    def __init__(self, port):
        self.ser = None
        self.port = port
        self.positions = {}
        self.belt_lengths = {'left': 0, 'right': 0}
        
    def connect(self):
        """Connect to the polargraph."""
        print(f"\nConnecting to {self.port} at {BAUD_RATE} baud...")
        try:
            self.ser = serial.Serial(self.port, BAUD_RATE, timeout=TIMEOUT)
            print("[OK] Connected!")
            time.sleep(2)  # Wait for firmware boot
            
            # Flush boot messages
            while self.ser.in_waiting:
                line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    print(f"  <- {line}")
            
            return True
        except serial.SerialException as e:
            print(f"[FAIL] Failed to connect: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from the polargraph."""
        if self.ser:
            self.send_command("M18")  # Disable motors
            self.ser.close()
            print("Disconnected.")
    
    def send_command(self, cmd, wait=True):
        """Send a G-code command."""
        if not self.ser:
            return []
        
        print(f"  -> {cmd}")
        self.ser.write((cmd + '\n').encode())
        
        if wait:
            return self._wait_for_response()
        return []
    
    def _wait_for_response(self, timeout=5):
        """Wait for response from firmware."""
        start = time.time()
        lines = []
        
        while time.time() - start < timeout:
            if self.ser.in_waiting:
                line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    print(f"  <- {line}")
                    lines.append(line)
                    if line.lower().startswith('ok') or 'error' in line.lower():
                        return lines
            time.sleep(0.01)
        
        return lines
    
    def enable_motors(self):
        """Enable stepper motors."""
        self.send_command("M17")
        time.sleep(0.3)
    
    def disable_motors(self):
        """Disable stepper motors for manual movement."""
        self.send_command("M18")
        print("\n[Motors disabled - you can now manually move the gondola]")
    
    def move_motor(self, motor, steps, speed=50):
        """Move a single motor by a number of steps.
        
        Args:
            motor: 'left' or 'right'
            steps: positive = reel in (shorten belt), negative = let out (lengthen belt)
            speed: feedrate in mm/min
        """
        self.enable_motors()
        
        # Convert steps to mm
        mm = steps / STEPS_PER_MM
        
        self.send_command("G91")  # Relative mode
        
        if motor == 'left':
            self.send_command(f"G0 X{mm:.3f} F{speed}")
        else:
            self.send_command(f"G0 Y{mm:.3f} F{speed}")
        
        time.sleep(abs(mm) / speed * 60 + 0.5)  # Wait for move to complete
        
        self.send_command("G90")  # Absolute mode
        
        # Track belt length changes
        self.belt_lengths[motor] += steps
    
    def jog_interactive(self):
        """Interactive jog mode for manual positioning."""
        print("\n" + "="*60)
        print("INTERACTIVE JOG MODE")
        print("="*60)
        print("\nControls:")
        print("  w/s - Reel in/out LEFT motor (shorter/longer belt)")
        print("  e/d - Reel in/out RIGHT motor (shorter/longer belt)")
        print("  q/a - Reel in/out BOTH motors (gondola up/down)")
        print("  1/2/3 - Set step size: small(10)/medium(100)/large(500)")
        print("  m - Disable motors for manual movement by hand")
        print("  r - Record current position")
        print("  x - Exit jog mode")
        print("\nCurrent step size: 100 steps (1.0mm)")
        
        step_size = 100
        
        while True:
            try:
                key = input("\nJog command: ").strip().lower()
                
                if key == 'x':
                    break
                elif key == '1':
                    step_size = 10
                    print(f"Step size: {step_size} ({step_size/STEPS_PER_MM:.2f}mm)")
                elif key == '2':
                    step_size = 100
                    print(f"Step size: {step_size} ({step_size/STEPS_PER_MM:.2f}mm)")
                elif key == '3':
                    step_size = 500
                    print(f"Step size: {step_size} ({step_size/STEPS_PER_MM:.2f}mm)")
                elif key == 'w':
                    print("LEFT motor: reeling in (belt shorter)...")
                    self.move_motor('left', step_size)
                elif key == 's':
                    print("LEFT motor: letting out (belt longer)...")
                    self.move_motor('left', -step_size)
                elif key == 'e':
                    print("RIGHT motor: reeling in (belt shorter)...")
                    self.move_motor('right', step_size)
                elif key == 'd':
                    print("RIGHT motor: letting out (belt longer)...")
                    self.move_motor('right', -step_size)
                elif key == 'q':
                    print("BOTH motors: reeling in (gondola UP)...")
                    self.move_motor('left', step_size)
                    self.move_motor('right', step_size)
                elif key == 'a':
                    print("BOTH motors: letting out (gondola DOWN)...")
                    self.move_motor('left', -step_size)
                    self.move_motor('right', -step_size)
                elif key == 'm':
                    self.disable_motors()
                elif key == 'r':
                    return True  # Signal to record position
                else:
                    print("Unknown command. Use w/s/e/d/q/a, 1/2/3, m, r, or x")
            except KeyboardInterrupt:
                break
        
        return False
    
    def measure_corner(self, name):
        """Guide user to measure a corner position."""
        print(f"\n{'='*60}")
        print(f"MEASURING: {name}")
        print("="*60)
        print(f"\nMove the gondola to the {name} position.")
        print("Use the jog controls or disable motors (m) to move manually.")
        print("Press 'r' when the gondola is in position.")
        
        # Reset belt length counters
        self.belt_lengths = {'left': 0, 'right': 0}
        
        recorded = self.jog_interactive()
        
        if recorded:
            self.positions[name] = {
                'left_steps': self.belt_lengths['left'],
                'right_steps': self.belt_lengths['right'],
                'left_mm': self.belt_lengths['left'] / STEPS_PER_MM,
                'right_mm': self.belt_lengths['right'] / STEPS_PER_MM
            }
            print(f"\n[RECORDED] {name}:")
            print(f"  Left belt change:  {self.positions[name]['left_mm']:.2f}mm ({self.positions[name]['left_steps']} steps)")
            print(f"  Right belt change: {self.positions[name]['right_mm']:.2f}mm ({self.positions[name]['right_steps']} steps)")
            return True
        
        return False
    
    def run_calibration(self):
        """Run the full calibration procedure."""
        print("\n" + "="*60)
        print("  POLARGRAPH CALIBRATION")
        print("="*60)
        print("""
This calibration will help determine your machine's actual dimensions.

You'll move the gondola to 4 positions relative to a starting point:
  1. CENTER - Start here (middle of the work area)
  2. TOP-LEFT - Upper left corner of work area  
  3. TOP-RIGHT - Upper right corner of work area
  4. BOTTOM-CENTER - Bottom center of work area

Move the gondola to each position and press 'r' to record.
The script tracks how much each belt changes between positions.
""")
        
        input("Press Enter to begin calibration...")
        
        # Start by moving to center
        print("\n" + "="*60)
        print("STEP 1: Move gondola to CENTER of work area")
        print("="*60)
        print("\nThis is your reference point. Move the gondola to approximately")
        print("the center of where you want to draw.")
        print("\nPress 'r' when in position, or 'x' to cancel.")
        
        self.belt_lengths = {'left': 0, 'right': 0}
        if not self.jog_interactive():
            print("\n[CANCELLED]")
            return None
        
        # Now measure relative to center
        corners = [
            ("TOP-LEFT corner", "top_left"),
            ("TOP-RIGHT corner", "top_right"),
            ("BOTTOM-CENTER", "bottom_center")
        ]
        
        for description, key in corners:
            if not self.measure_corner(description):
                print(f"\n[CANCELLED] Calibration cancelled at {description}")
                return None
        
        return self.calculate_dimensions()
    
    def calculate_dimensions(self):
        """Calculate machine dimensions from measured positions."""
        print("\n" + "="*60)
        print("CALCULATING DIMENSIONS")
        print("="*60)
        
        if len(self.positions) < 3:
            print("[ERROR] Need all 3 corner positions to calculate dimensions")
            return None
        
        # Get positions
        top_left = self.positions["TOP-LEFT corner"]
        top_right = self.positions["TOP-RIGHT corner"]
        bottom = self.positions["BOTTOM-CENTER"]
        
        # Calculate horizontal span from top corners
        # Moving from left to right: left belt gets longer, right belt gets shorter
        horizontal_left_change = abs(top_right['left_mm'] - top_left['left_mm'])
        horizontal_right_change = abs(top_right['right_mm'] - top_left['right_mm'])
        horizontal_span = (horizontal_left_change + horizontal_right_change) / 2
        
        # Calculate vertical span from top to bottom
        # Use average of both sides
        vertical_left = abs(bottom['left_mm'] - top_left['left_mm'])
        vertical_right = abs(bottom['right_mm'] - top_right['right_mm'])
        vertical_span = (vertical_left + vertical_right) / 2
        
        # Estimate motor spacing (distance between the two motors)
        # This is approximately the horizontal span when at the top
        motor_spacing = horizontal_span * 1.2  # Motors are slightly wider than work area
        
        results = {
            'motor_spacing_mm': motor_spacing,
            'work_area_width_mm': horizontal_span,
            'work_area_height_mm': vertical_span,
            'positions': self.positions,
            'firmware_settings': {
                'MACHINE_WIDTH': motor_spacing,
                'MACHINE_HEIGHT': vertical_span + 200,  # Add buffer for motors at top
                'limit_left': -horizontal_span / 2,
                'limit_right': horizontal_span / 2,
                'limit_top': vertical_span * 0.4,  # Top of work area
                'limit_bottom': -vertical_span * 0.6  # Bottom of work area
            }
        }
        
        print(f"\n{'='*60}")
        print("CALIBRATION RESULTS")
        print("="*60)
        print(f"\nMeasured dimensions:")
        print(f"  Work area width:   {horizontal_span:.1f}mm ({horizontal_span/25.4:.1f}\")")
        print(f"  Work area height:  {vertical_span:.1f}mm ({vertical_span/25.4:.1f}\")")
        print(f"  Motor spacing:     ~{motor_spacing:.1f}mm ({motor_spacing/25.4:.1f}\")")
        
        print(f"\nRecommended firmware settings:")
        print(f"  MACHINE_WIDTH:  {results['firmware_settings']['MACHINE_WIDTH']:.1f}")
        print(f"  MACHINE_HEIGHT: {results['firmware_settings']['MACHINE_HEIGHT']:.1f}")
        
        print(f"\nRecommended UI settings (Settings panel):")
        print(f"  Work Area Left:   {results['firmware_settings']['limit_left']:.1f}")
        print(f"  Work Area Right:  {results['firmware_settings']['limit_right']:.1f}")
        print(f"  Work Area Top:    {results['firmware_settings']['limit_top']:.1f}")
        print(f"  Work Area Bottom: {results['firmware_settings']['limit_bottom']:.1f}")
        
        return results
    
    def save_calibration(self, results, filename="calibration.json"):
        """Save calibration results to file."""
        filepath = os.path.join(os.path.dirname(__file__), filename)
        with open(filepath, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\nCalibration saved to: {filepath}")
    
    def quick_measure(self):
        """Quick measurement mode - just measure belt lengths between any points."""
        print("\n" + "="*60)
        print("QUICK MEASUREMENT MODE")
        print("="*60)
        print("""
This mode lets you measure distances between any two points.
The script tracks how much each belt length changes as you move.

Use this to:
  - Measure the exact distance between corners
  - Verify your machine dimensions
  - Debug calibration issues
""")
        
        measurements = []
        
        while True:
            self.belt_lengths = {'left': 0, 'right': 0}
            name = input("\nEnter measurement name (or 'done' to finish): ").strip()
            
            if name.lower() == 'done':
                break
            
            print(f"\nMove to '{name}' position, then press 'r' to record.")
            if self.jog_interactive():
                measurement = {
                    'name': name,
                    'left_mm': self.belt_lengths['left'] / STEPS_PER_MM,
                    'right_mm': self.belt_lengths['right'] / STEPS_PER_MM
                }
                measurements.append(measurement)
                print(f"\n[RECORDED] {name}:")
                print(f"  Left belt change:  {measurement['left_mm']:.2f}mm")
                print(f"  Right belt change: {measurement['right_mm']:.2f}mm")
        
        if measurements:
            print("\n" + "="*60)
            print("ALL MEASUREMENTS")
            print("="*60)
            for m in measurements:
                print(f"  {m['name']}: L={m['left_mm']:.2f}mm, R={m['right_mm']:.2f}mm")
        
        return measurements


def list_ports():
    """List available serial ports."""
    ports = serial.tools.list_ports.comports()
    if not ports:
        print("No serial ports found!")
        return []
    
    print("\nAvailable serial ports:")
    for i, port in enumerate(ports):
        print(f"  {i+1}. {port.device} - {port.description}")
    
    return [p.device for p in ports]


def main():
    print("="*60)
    print("  POLARGRAPH CALIBRATION TOOL")
    print("="*60)
    
    # List and select port
    ports = list_ports()
    if not ports:
        sys.exit(1)
    
    if len(ports) == 1:
        port = ports[0]
        print(f"\nUsing: {port}")
    else:
        try:
            idx = int(input("\nSelect port number: ")) - 1
            port = ports[idx]
        except (ValueError, IndexError):
            print("Invalid selection")
            sys.exit(1)
    
    calibrator = PolargraphCalibrator(port)
    
    if not calibrator.connect():
        sys.exit(1)
    
    try:
        print("\nCalibration modes:")
        print("  1. Full calibration (measure 4 positions)")
        print("  2. Quick measure (measure any positions)")
        print("  3. Just jog around (test controls)")
        
        mode = input("\nSelect mode (1/2/3): ").strip()
        
        if mode == '1':
            results = calibrator.run_calibration()
            if results:
                save = input("\nSave calibration to file? (y/n): ").strip().lower()
                if save == 'y':
                    calibrator.save_calibration(results)
        elif mode == '2':
            measurements = calibrator.quick_measure()
        else:
            print("\nEntering jog mode. Press 'x' to exit.")
            calibrator.jog_interactive()
        
    except KeyboardInterrupt:
        print("\n\nCalibration interrupted.")
    finally:
        calibrator.disable_motors()
        calibrator.disconnect()


if __name__ == "__main__":
    main()
