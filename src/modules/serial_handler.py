"""Serial communication with a single reader and serialized reply ownership."""

import serial
import serial.tools.list_ports
import threading
import time
import re
import secrets
from collections import deque
from typing import Callable, Optional, List


class SerialHandler:
    """Handles serial communication with the plotter.

    An OK acknowledges parsing/buffering, not physical motion completion. Use
    wait_until_idle() when the caller needs the planner to have drained.
    """

    BAUD_RATE = 57600
    _MOVE = re.compile(r'^(?:N\d+\s+)?G0?[0-3](?!\d)', re.I)
    _OK = re.compile(r'^OK(?:\s|$)', re.I)
    _ERROR = re.compile(r'(?:^|\s)(?:LIMIT|ENDSTOP|ERROR|BADLINENUM|BADCHECKSUM)(?=\s|:|\d|$)', re.I)

    def __init__(self):
        self.serial: Optional[serial.Serial] = None
        self.current_port: Optional[str] = None
        self.connection_id = secrets.token_hex(12)
        self.callback: Optional[Callable[[str], None]] = None
        self.read_thread: Optional[threading.Thread] = None
        self.running = False
        self.line_number = 0
        self.command_queue: List[str] = []
        self.busy_count = 16
        self.lock = threading.Lock()
        # Keep the matcher installed for an entire operation, not just its write.
        self._operation_lock = threading.RLock()
        self._state_lock = threading.Lock()
        self._query_event = threading.Event()
        self._query_prefix: Optional[str] = None
        self._query_exact: Optional[str] = None
        self._query_result: Optional[str] = None
        self._operation_error = False
        self._last_error = None
        self._capture_prefix: Optional[str] = None
        self._capture_done: Optional[str] = None
        self._capture_result: Optional[str] = None
        # Track acknowledgements of *all* moves, including fire-and-forget ones.
        # A late OK must never acknowledge the next move after a timeout.
        self._pending_acks = deque()
        self._reply_desynchronized = False
        self._barrier_token = secrets.randbelow(2**31 - 1)
        self._streaming = False
        self.recent_lines = deque(maxlen=120)

    def list_ports(self) -> List[str]:
        return [port.device for port in serial.tools.list_ports.comports()]

    def connect(self, port: str, baud: int = BAUD_RATE,
                callback: Optional[Callable[[str], None]] = None) -> bool:
        try:
            self.disconnect()
            self.serial = serial.Serial(port=port, baudrate=baud,
                                        bytesize=serial.EIGHTBITS,
                                        stopbits=serial.STOPBITS_ONE,
                                        parity=serial.PARITY_NONE, timeout=0.1)
            self.current_port = port
            self.connection_id = secrets.token_hex(12)
            self.callback = callback
            self.line_number = 0
            self.running = True
            self._streaming = False
            with self._state_lock:
                self._pending_acks.clear()
                self._reply_desynchronized = False
            self.read_thread = threading.Thread(target=self._read_loop, daemon=True)
            self.read_thread.start()
            time.sleep(2)
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            self.disconnect()
            return False

    def _fail_waiters(self):
        with self._state_lock:
            self._operation_error = True
            self._query_event.set()
            for pending in self._pending_acks:
                pending['ok'] = False
                pending['event'].set()
            self._pending_acks.clear()

    def disconnect(self):
        self.running = False
        self._streaming = False
        self._fail_waiters()
        if self.read_thread and self.read_thread.is_alive():
            if self.read_thread is not threading.current_thread():
                self.read_thread.join(timeout=1)
        if self.serial and self.serial.is_open:
            self.serial.close()
        self.serial = None
        self.current_port = None

    def is_connected(self) -> bool:
        return self.running and self.serial is not None and self.serial.is_open

    @property
    def last_error(self):
        """Exact controller rejection for the current or most recent operation."""
        with self._state_lock:
            return self._last_error

    def _begin_operation(self):
        with self._state_lock:
            self._operation_error = False
            self._last_error = None
            self._query_result = None
            self._capture_result = None
            self._query_event.clear()

    def _write(self, command: str, pending=None) -> bool:
        """Register a reply before writing; the read loop is the only reader."""
        if not self.is_connected():
            return False
        try:
            with self.lock:
                if pending is not None:
                    with self._state_lock:
                        self._pending_acks.append(pending)
                self.serial.write(f"{command.strip()}\n".encode('utf-8'))
                self.serial.flush()
                if self.callback:
                    self.callback(f"TX: {command.strip()}")
            return True
        except Exception as e:
            print(f"Send error: {e}")
            self._reply_desynchronized = True
            self._fail_waiters()
            return False

    def send_command(self, command: str, wait_for_ok: bool = False, timeout: float = 5.0):
        """Send a command; optionally wait for its parsing acknowledgement."""
        with self._operation_lock:
            if not self.is_connected():
                return False
            if wait_for_ok and self._reply_desynchronized:
                return False
            self._begin_operation()
            pending = None
            if wait_for_ok or self._MOVE.match(command.strip()):
                pending = {'event': threading.Event(), 'ok': False}
            if not self._write(command, pending):
                return False
            if not wait_for_ok:
                return True
            if not pending['event'].wait(timeout):
                # Preserve this slot to absorb its possible late ACK. A tokened
                # barrier (or reconnect) is needed before more waited commands.
                self._reply_desynchronized = True
                return False
            return pending['ok'] and not self._operation_error and self.is_connected()

    def send_streaming(self, command: str, timeout: float = 10.0):
        """Moves require OK; other commands retain the asynchronous API.

        False on a move rejection, timeout, or disconnect. A successful move
        return does not imply that the machine has finished moving.
        """
        return self.send_command(command, bool(self._MOVE.match(command.strip())), timeout)

    @staticmethod
    def _matches_prefix(line: str, prefix: str) -> bool:
        # M114 must not consume M1140, nor D7 consume D70.
        return line == prefix or (line.startswith(prefix) and
                                  (prefix[-1:].isspace() or
                                   line[len(prefix):len(prefix) + 1] in ' :\t'))

    def query(self, command: str, reply_prefix: str, timeout: float = 3.0) -> Optional[str]:
        """Return a complete matching reply, or None on error/disconnect/timeout."""
        if not reply_prefix:
            raise ValueError('reply_prefix must not be empty')
        with self._operation_lock:
            self._begin_operation()
            self._query_prefix = reply_prefix.upper()
            try:
                if not self._write(command):
                    return None
                if not self._query_event.wait(timeout):
                    return None
                return None if self._operation_error else self._query_result
            finally:
                self._query_prefix = None

    def wait_until_idle(self, timeout: float = 30.0, *, allow_reference_recovery=False) -> bool:
        """Wait for a unique M400 planner-drain reply from supporting firmware.

        Older firmware without this command fails closed by timing out. Matching
        is against the entire line, so stale or prefix-colliding tokens cannot
        establish completion.
        """
        with self._operation_lock:
            self._begin_operation()
            self._barrier_token = (self._barrier_token + 1) % (2**31 - 1)
            token = self._barrier_token
            self._query_exact = (f'M400 P{token} IDLE', f'M400 P{token} IDLE_REFERENCE_REQUIRED') if allow_reference_recovery else f'M400 P{token} IDLE'
            try:
                if not self._write(f'M400 P{token}' + (' R0' if allow_reference_recovery else '')):
                    return False
                if not self._query_event.wait(timeout):
                    return False
                if self._operation_error or self._query_result not in ((self._query_exact,) if isinstance(self._query_exact, str) else self._query_exact):
                    return False
                with self._state_lock:
                    self._pending_acks.clear()
                    self._reply_desynchronized = False
                return True
            finally:
                self._query_exact = None

    def send_capture(self, command: str, capture_prefix: str, done_substring: str,
                     timeout: float = 50.0) -> Optional[str]:
        """Return the first capture only after the terminal line has arrived.

        Partial homing results are never returned on timeout or firmware error.
        """
        if not capture_prefix or not done_substring:
            raise ValueError('capture_prefix and done_substring must not be empty')
        with self._operation_lock:
            self._begin_operation()
            self._capture_prefix = capture_prefix.upper()
            self._capture_done = done_substring.upper()
            try:
                if not self._write(command):
                    return None
                if not self._query_event.wait(timeout):
                    return None
                return None if self._operation_error else self._capture_result
            finally:
                self._capture_prefix = None
                self._capture_done = None

    def request_emergency_stop(self):
        """Bypass a waiting transaction; transmission is not proof of a stop.

        This firmware cannot parse serial during synchronous homing. The user
        must cut power if motion continues. Never flush away the stop bytes.
        """
        self._fail_waiters()
        self._reply_desynchronized = True
        return self._write('M112')

    def send_raw(self, command: str):
        return self.send_command(command)

    def _calculate_checksum(self, line: str) -> int:
        checksum = 0
        for char in line:
            checksum ^= ord(char)
        return checksum & 0xFF

    def _receive_line(self, line):
        upper = line.upper()
        with self._state_lock:
            self.recent_lines.append(line)
            if self._ERROR.search(upper):
                self._operation_error = True
                self._last_error = line
                self._query_event.set()
                # Rejection is not an ACK. Require a barrier/reconnect before
                # trusting further untagged move acknowledgements.
                self._reply_desynchronized = True
                for pending in self._pending_acks:
                    pending['ok'] = False
                    pending['event'].set()
                self._pending_acks.clear()
            elif self._OK.match(upper) and self._pending_acks:
                pending = self._pending_acks.popleft()
                pending['ok'] = True
                pending['event'].set()
            if self._query_exact and line in ((self._query_exact,) if isinstance(self._query_exact, str) else self._query_exact):
                self._query_result = line
                self._query_event.set()
            elif self._query_prefix and self._matches_prefix(upper, self._query_prefix):
                self._query_result = line
                self._query_event.set()
            if self._capture_prefix:
                if self._capture_result is None and self._matches_prefix(upper, self._capture_prefix):
                    self._capture_result = line
                if self._capture_done in upper:
                    self._query_event.set()
        if self.callback:
            self.callback(line)

    def _read_loop(self):
        """The sole serial reader; wakes pending operations on transport loss."""
        buffer = ''
        try:
            while self.running and self.serial and self.serial.is_open:
                if self.serial.in_waiting > 0:
                    data = self.serial.read(self.serial.in_waiting).decode('utf-8', errors='ignore')
                    buffer += data
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        if line:
                            self._receive_line(line)
                else:
                    time.sleep(0.01)
        except Exception as e:
            if self.running:
                print(f'Read error: {e}')
        finally:
            self.running = False
            self._fail_waiters()
