"""Protocol tests exercise the actual read loop, without a connected machine."""
import importlib.util
from pathlib import Path
import queue
import threading
import time

import pytest

spec = importlib.util.spec_from_file_location(
    'serial_handler', Path(__file__).resolve().parents[1] / 'src/modules/serial_handler.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SerialHandler = module.SerialHandler


class FakeSerial:
    def __init__(self):
        self.is_open = True
        self.writes = queue.Queue()
        self.input = bytearray()
        self.lock = threading.Lock()
        self.read_error = False

    @property
    def in_waiting(self):
        if self.read_error:
            raise OSError('cable disconnected')
        with self.lock:
            return len(self.input)

    def feed(self, text):
        with self.lock:
            self.input.extend(text.encode())

    def read(self, count):
        with self.lock:
            data = bytes(self.input[:count])
            del self.input[:count]
            return data

    def write(self, data):
        self.writes.put(data.decode().strip())

    def flush(self):
        pass

    def close(self):
        self.is_open = False


@pytest.fixture
def connected():
    handler = SerialHandler()
    port = FakeSerial()
    handler.serial = port
    handler.running = True
    handler.read_thread = threading.Thread(target=handler._read_loop, daemon=True)
    handler.read_thread.start()
    yield handler, port
    handler.disconnect()


def start_call(fn):
    result = queue.Queue()
    def run():
        try:
            result.put(fn())
        except BaseException as exc:
            result.put(exc)
    thread = threading.Thread(target=run, daemon=True)
    thread.start()
    return result


def barrier_reply(command):
    return command + ' IDLE\n'


@pytest.mark.parametrize('error', [
    'LIMIT MAX 0 | pos[i] = 900', 'LIMIT ERROR', 'ENDSTOP',
    'Error: homing failed', 'BADLINENUM 12', 'BADCHECKSUM12',
])
def test_streaming_rejection_never_reports_success(connected, error):
    handler, port = connected
    result = start_call(lambda: handler.send_streaming('G1 X10', timeout=1))
    assert port.writes.get(timeout=1) == 'G1 X10'
    port.feed(error + '\nOK N1 P15 B15\n')
    assert result.get(timeout=0.5) is False
    assert handler.send_streaming('G1 X20', timeout=0.01) is False
    assert port.writes.empty()


def test_streaming_missing_ack_is_failure(connected):
    handler, port = connected
    assert handler.send_streaming('G1 X10', timeout=0.04) is False
    assert handler.send_streaming('G1 X20', timeout=0.04) is False
    assert port.writes.get(timeout=1) == 'G1 X10'
    assert port.writes.empty()


def test_prior_unwaited_move_ack_cannot_acknowledge_new_move(connected):
    handler, port = connected
    assert handler.send_command('G0 X1')
    assert port.writes.get(timeout=1) == 'G0 X1'
    result = start_call(lambda: handler.send_streaming('G1 X2', timeout=1))
    assert port.writes.get(timeout=1) == 'G1 X2'
    port.feed('OK N1 P15 B15\n')
    with pytest.raises(queue.Empty):
        result.get(timeout=0.04)
    port.feed('OK N2 P15 B15\n')
    assert result.get(timeout=0.5) is True


def test_queries_keep_reply_ownership_until_complete(connected):
    handler, port = connected
    first = start_call(lambda: handler.query('M114', 'M114', timeout=1))
    assert port.writes.get(timeout=1) == 'M114'
    second = start_call(lambda: handler.query('M119', 'M119', timeout=1))
    with pytest.raises(queue.Empty):
        port.writes.get(timeout=0.04)
    port.feed('M1140 wrong prefix\nM114 X0 Y1\n')
    assert first.get(timeout=0.5) == 'M114 X0 Y1'
    assert port.writes.get(timeout=0.5) == 'M119'
    port.feed('M119 L:open R:open\n')
    assert second.get(timeout=0.5) == 'M119 L:open R:open'


def test_capture_timeout_discards_partial_homing_result(connected):
    handler, port = connected
    result = start_call(lambda: handler.send_capture('G28', 'HOMESTEPS', 'Done', timeout=0.1))
    assert port.writes.get(timeout=1) == 'G28'
    port.feed('HOMESTEPS L508 R509\n')
    assert result.get(timeout=0.5) is None


def test_capture_returns_first_result_only_after_done(connected):
    handler, port = connected
    result = start_call(lambda: handler.send_capture('G28', 'HOMESTEPS', 'Done', timeout=1))
    assert port.writes.get(timeout=1) == 'G28'
    port.feed('HOMESTEPS L508 R509\nHOMESTEPS L999 R999\n')
    with pytest.raises(queue.Empty):
        result.get(timeout=0.04)
    port.feed('Done.\n')
    assert result.get(timeout=0.5) == 'HOMESTEPS L508 R509'


def test_capture_failure_discards_result_even_if_done_follows(connected):
    handler, port = connected
    result = start_call(lambda: handler.send_capture('G28', 'HOMESTEPS', 'Done', timeout=1))
    port.writes.get(timeout=1)
    port.feed('HOMESTEPS L508 R509\nError: switch stuck\nDone.\n')
    assert result.get(timeout=0.5) is None
    assert handler.last_error == 'Error: switch stuck'


def test_new_operation_clears_previous_controller_error(connected):
    handler, port = connected
    handler._receive_line('Error: homing retouch travel exceeded')
    assert handler.last_error == 'Error: homing retouch travel exceeded'
    result = start_call(lambda: handler.query('M119', 'M119', timeout=1))
    assert port.writes.get(timeout=1) == 'M119'
    port.feed('M119 L:open R:open\n')
    assert result.get(timeout=0.5) == 'M119 L:open R:open'
    assert handler.last_error is None


def test_barrier_requires_exact_unique_token(connected):
    handler, port = connected
    handler._barrier_token = 12
    result = start_call(lambda: handler.wait_until_idle(timeout=1))
    assert port.writes.get(timeout=1) == 'M400 P13'
    port.feed('M400 P130 IDLE\nM400 P12 IDLE\nM400 P13 IDLE trailing\nOK N1\n')
    with pytest.raises(queue.Empty):
        result.get(timeout=0.04)
    port.feed('M400 P13 IDLE\n')
    assert result.get(timeout=0.5) is True
    second = start_call(lambda: handler.wait_until_idle(timeout=1))
    assert port.writes.get(timeout=1) == 'M400 P14'
    port.feed('M400 P14 IDLE\n')
    assert second.get(timeout=0.5) is True


def test_barrier_error_is_failure(connected):
    handler, port = connected
    result = start_call(lambda: handler.wait_until_idle(timeout=1))
    command = port.writes.get(timeout=1)
    port.feed('Error: ' + command + ' ENDSTOP\n')
    assert result.get(timeout=0.5) is False


def test_unsupported_barrier_times_out(connected):
    handler, _ = connected
    assert handler.wait_until_idle(timeout=0.03) is False


def test_barrier_recovers_ack_alignment_after_timeout(connected):
    handler, port = connected
    assert handler.send_streaming('G1 X1', timeout=0.02) is False
    port.writes.get(timeout=1)
    result = start_call(lambda: handler.wait_until_idle(timeout=1))
    command = port.writes.get(timeout=1)
    port.feed('OK N1\n' + barrier_reply(command))
    assert result.get(timeout=0.5) is True
    move = start_call(lambda: handler.send_streaming('G1 X2', timeout=1))
    assert port.writes.get(timeout=1) == 'G1 X2'
    with pytest.raises(queue.Empty):
        move.get(timeout=0.04)
    port.feed('OK N2\n')
    assert move.get(timeout=0.5) is True


@pytest.mark.parametrize('kind', ['query', 'capture', 'stream', 'barrier'])
@pytest.mark.parametrize('loss', ['disconnect', 'reader_error'])
def test_transport_loss_wakes_waiters(connected, kind, loss):
    handler, port = connected
    calls = {
        'query': lambda: handler.query('M114', 'M114', timeout=5),
        'capture': lambda: handler.send_capture('G28', 'HOMESTEPS', 'Done', timeout=5),
        'stream': lambda: handler.send_streaming('G1 X10', timeout=5),
        'barrier': lambda: handler.wait_until_idle(timeout=5),
    }
    result = start_call(calls[kind])
    port.writes.get(timeout=1)
    if loss == 'disconnect':
        handler.disconnect()
    else:
        port.read_error = True
    assert result.get(timeout=0.5) is (None if kind in ('query', 'capture') else False)


def test_wait_for_ok_uses_reader_not_competing_serial_reads(connected):
    handler, port = connected
    result = start_call(lambda: handler.send_command('G1 X10', wait_for_ok=True, timeout=1))
    port.writes.get(timeout=1)
    port.feed('OKAY is not an acknowledgement\n')
    with pytest.raises(queue.Empty):
        result.get(timeout=0.04)
    port.feed('OK N0 P15 B15\n')
    assert result.get(timeout=0.5) is True


def test_query_firmware_error_wakes_immediately(connected):
    handler, port = connected
    result = start_call(lambda: handler.query('M114', 'M114', timeout=5))
    port.writes.get(timeout=1)
    port.feed('Error: controller unavailable\n')
    assert result.get(timeout=0.5) is None


def test_dead_reader_no_longer_claims_connected(connected):
    handler, port = connected
    port.read_error = True
    handler.read_thread.join(timeout=0.5)
    assert not handler.is_connected()
    assert handler.query('M114', 'M114', timeout=5) is None
    assert port.writes.empty()


@pytest.mark.parametrize('command', ['G1X10', 'G01 X10', 'G2 X10 Y10 I5 J0', 'N1 G03 X10'])
def test_all_firmware_acknowledged_move_forms_are_tracked(connected, command):
    handler, port = connected
    result = start_call(lambda: handler.send_streaming(command, timeout=1))
    assert port.writes.get(timeout=1) == command
    with pytest.raises(queue.Empty):
        result.get(timeout=0.025)
    port.feed('OK N1 P15 B15\n')
    assert result.get(timeout=0.5) is True


@pytest.mark.parametrize('suffix', ['IDLE', 'IDLE_REFERENCE_REQUIRED'])
def test_reference_recovery_accepts_only_exact_token_terminal(connected, suffix):
    handler, port = connected
    result = start_call(lambda: handler.wait_until_idle(timeout=1, allow_reference_recovery=True))
    command = port.writes.get(timeout=1)
    assert command.endswith(' R0')
    token_command = command[:-3]
    port.feed(token_command + '0 ' + suffix + '\n')
    time.sleep(.02)
    assert result.empty()
    port.feed(token_command + ' ' + suffix + '\n')
    assert result.get(timeout=.5) is True


def test_ordinary_barrier_never_accepts_reference_required(connected):
    handler, port = connected
    result = start_call(lambda: handler.wait_until_idle(timeout=.07))
    command = port.writes.get(timeout=1)
    port.feed(command + ' IDLE_REFERENCE_REQUIRED\n')
    assert result.get(timeout=.5) is False
