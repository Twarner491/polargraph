"""
Serial communication handler for the polargraph plotter.
Handles connection, command queuing, and checksum generation.
"""

import serial
import serial.tools.list_ports
import threading
import time
from typing import Callable, Optional, List


class SerialHandler:
    """Handles serial communication with the plotter."""
    
    BAUD_RATE = 57600  # Match firmware config
    
    def __init__(self):
        self.serial: Optional[serial.Serial] = None
        self.current_port: Optional[str] = None
        self.callback: Optional[Callable[[str], None]] = None
        self.read_thread: Optional[threading.Thread] = None
        self.running = False
        self.line_number = 0
        self.command_queue: List[str] = []
        self.busy_count = 16  # Buffer size
        self.lock = threading.Lock()
    
    def list_ports(self) -> List[str]:
        """List available serial ports."""
        ports = serial.tools.list_ports.comports()
        return [port.device for port in ports]
    
    def connect(self, port: str, baud: int = BAUD_RATE, 
                callback: Optional[Callable[[str], None]] = None) -> bool:
        """Connect to a serial port."""
        try:
            self.disconnect()
            
            self.serial = serial.Serial(
                port=port,
                baudrate=baud,
                bytesize=serial.EIGHTBITS,
                stopbits=serial.STOPBITS_ONE,
                parity=serial.PARITY_NONE,
                timeout=0.1
            )
            
            self.current_port = port
            self.callback = callback
            self.line_number = 0
            self.running = True
            
            # Start read thread
            self.read_thread = threading.Thread(target=self._read_loop, daemon=True)
            self.read_thread.start()
            
            # Wait for the plotter to initialize
            time.sleep(2)
            
            return True
            
        except Exception as e:
            print(f"Connection error: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from the serial port."""
        self.running = False
        
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=1)
        
        if self.serial and self.serial.is_open:
            self.serial.close()
        
        self.serial = None
        self.current_port = None
    
    def is_connected(self) -> bool:
        """Check if connected."""
        return self.serial is not None and self.serial.is_open
    
    def send_command(self, command: str, wait_for_ok: bool = False, timeout: float = 5.0):
        """Send a G-code command and optionally wait for ok response.
        
        Args:
            command: G-code command to send
            wait_for_ok: If True, block until 'ok' response received
            timeout: Timeout in seconds when waiting for ok
        """
        if not self.is_connected():
            return False
        
        with self.lock:
            cmd = command.strip()
            try:
                # Clear input buffer before sending
                if self.serial.in_waiting > 0:
                    self.serial.read(self.serial.in_waiting)
                
                self.serial.write(f"{cmd}\n".encode('utf-8'))
                self.serial.flush()
                print(f"  -> {cmd}")  # Debug output
                
                # Notify callback about sent command
                if self.callback:
                    self.callback(f"TX: {cmd}")
                
                # Wait for ok if requested
                if wait_for_ok:
                    return self._wait_for_ok(timeout)
                    
                return True
            except Exception as e:
                print(f"Send error: {e}")
                if self.callback:
                    self.callback(f"ERROR: {e}")
                return False
    
    def _wait_for_ok(self, timeout: float = 5.0) -> bool:
        """Wait for 'ok' response from firmware."""
        import time
        start = time.time()
        buffer = ""
        
        while time.time() - start < timeout:
            try:
                if self.serial.in_waiting > 0:
                    data = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                    buffer += data
                    
                    # Check for ok response
                    if 'ok' in buffer.lower():
                        return True
                    
                    # Process complete lines for callback
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        if line and self.callback:
                            self.callback(line)
                else:
                    time.sleep(0.01)
            except Exception as e:
                print(f"Wait error: {e}")
                return False
        
        print(f"Timeout waiting for ok")
        return False
    
    def send_raw(self, command: str):
        """Send a raw command without line number or checksum."""
        if not self.is_connected():
            return
        
        try:
            self.serial.write(f"{command}\n".encode('utf-8'))
            self.serial.flush()
        except Exception as e:
            print(f"Send error: {e}")
    
    def _calculate_checksum(self, line: str) -> int:
        """Calculate XOR checksum for a command."""
        checksum = 0
        for char in line:
            checksum ^= ord(char)
        return checksum & 0xFF
    
    def _read_loop(self):
        """Background thread for reading serial data."""
        buffer = ""
        
        while self.running and self.serial and self.serial.is_open:
            try:
                if self.serial.in_waiting > 0:
                    data = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                    buffer += data
                    
                    # Process complete lines
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        
                        if line and self.callback:
                            self.callback(line)
                else:
                    time.sleep(0.01)
                    
            except Exception as e:
                if self.running:
                    print(f"Read error: {e}")
                break

