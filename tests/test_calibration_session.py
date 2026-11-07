"""Adversarial setup transaction tests with a stateful controller and disk fake."""
import copy
import math
import re
import sys
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from modules.calibration_session import CalibrationSession

INPUT = {'outside_cover_span_mm': 1100, 'datum_height_mm': 1500,
         'reference_aligned': True, 'paths_clear': True}


class Settings:
    def __init__(self):
        self.data = {'calibrated': True, 'motor_spacing': 1057.1, 'calibration_pending': None}
        self.disk = copy.deepcopy(self.data)
        self.saves = 0
        self.fail_on = None
        self.return_none = False

    def get(self, k, default=None): return self.data.get(k, default)
    def set(self, k, v): self.data[k] = copy.deepcopy(v)
    def update(self, data): self.data.update(copy.deepcopy(data))
    def get_all(self): return copy.deepcopy(self.data)
    def save(self):
        self.saves += 1
        if self.saves == self.fail_on:
            raise OSError('Disk full')
        if self.return_none:
            return None
        self.disk = copy.deepcopy(self.data)
        return True


class Controller:
    def __init__(self, settings):
        self.settings = settings
        self._operation_lock = threading.RLock()
        self.commands = []
        self.steps, self.belts = [100, 100], [1231.9, 1155.7]
        self.low, self.high = [-528.55, -381, 40], [528.55, 381, 90]
        self.position = [0, 0]
        self.connected = True
        self.protocol = 'CALIBRATION_PROTOCOL 1'
        self.capture = 'HOME_REFERENCE L30008 R35009'
        self.switch_reply = 'M119 L:open R:open rawL=0 rawR=0'
        self.fail_command = None
        self.fail_barrier = False
        self.hook = None
        self.persisted = None
        self.corrupt_reload = False
        self.pending_at_first_motion = False
        self.return_ack_delay = 0

    def is_connected(self): return self.connected
    def query(self, command, prefix, timeout):
        self.commands.append(command)
        if command == 'M100': return self.protocol
        if command == 'M92': return f'M92 X{self.steps[0]:.2f} Y{self.steps[1]:.2f}'
        if command == 'D7': return f'D7 L{self.belts[0]:.2f} R{self.belts[1]:.2f}'
        if command == 'M101':
            lo = ','.join(f'{v:.2f}' for v in self.low)
            hi = ','.join(f'{v:.2f}' for v in self.high)
            return f'M101 ({lo}) - ({hi})'
        if command == 'M114': return f'M114 X{self.position[0]:.2f} Y{self.position[1]:.2f}'
        if command == 'M119': return self.switch_reply
        raise AssertionError(command)

    def send_streaming(self, command, timeout):
        self.commands.append(command)
        if command.startswith('G0 ') and timeout < self.return_ack_delay:
            return False
        if self.hook:
            self.hook(command)
        if self.fail_command and command.startswith(self.fail_command): return False
        if command == 'M17':
            self.pending_at_first_motion = bool(self.settings.disk.get('calibration_pending'))
            assert self.pending_at_first_motion, 'No durable pending marker before motor enable'
        params = {k: float(v) for k, v in re.findall(r'([A-Z])(-?\d+(?:\.\d+)?)', command)}
        if command.startswith('M101 '):
            axis = int(params['A'])
            self.low[axis], self.high[axis] = params['B'], params['T']
        elif command.startswith('D7 '): self.belts = [params['L'], params['R']]
        elif command.startswith(('G92 ', 'G0 ')):
            self.position = [params.get('X', self.position[0]), params.get('Y', self.position[1])]
        elif command == 'D9':
            self.persisted = copy.deepcopy((self.steps, self.belts, self.low, self.high))
        elif command == 'M501':
            self.steps, self.belts, self.low, self.high = copy.deepcopy(self.persisted)
            # Firmware stores hundredths by truncation, not Python rounding.
            self.belts = [math.trunc(v * 100) / 100 for v in self.belts]
            if self.corrupt_reload: self.belts[0] += 10
        return True

    def wait_until_idle(self, timeout, **options):
        self.commands.append('M400')
        return not self.fail_barrier

    def send_capture(self, command, capture_prefix, done_substring, timeout):
        self.commands.append(command)
        assert self.settings.disk.get('calibration_pending')
        return self.capture


class InlineThread:
    def __init__(self, target, args, daemon): self.target, self.args = target, args
    def start(self): self.target(*self.args)


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.settings = Settings()
        self.controller = Controller(self.settings)
        self.session = CalibrationSession(self.controller, self.settings)

    def start(self):
        with patch('modules.calibration_session.threading.Thread', InlineThread):
            return self.session.start_reference(INPUT)

    def test_capture_is_persisted_before_motion_and_stays_blocked_for_confirmation(self):
        state = self.start()
        self.assertEqual(state['stage'], 'confirm_reference', state)
        self.assertTrue(self.controller.pending_at_first_motion)
        self.assertTrue(self.session.blocks_motion)
        self.assertFalse(self.settings.disk['calibrated'])
        self.assertEqual(self.controller.commands.count('G28 R0'), 1)
        self.assertFalse(state['result']['accuracy_verified'])
        self.assertTrue(state['result']['work_area_provisional'])
        self.assertNotIn('M500', self.controller.commands)

    def test_finish_requires_explicit_physical_mark_and_eeprom_reload(self):
        self.start()
        with self.assertRaises(ValueError): self.session.finish({})
        self.assertTrue(self.session.blocks_motion)
        result = self.session.finish({'returned_to_mark': True})
        self.assertTrue(result['reference_verified'])
        self.assertTrue(result['eeprom_readback_verified'])
        self.assertFalse(result['accuracy_verified'])
        self.assertFalse(result['physical_clearance_verified'])
        self.assertFalse(result['reboot_persistence_verified'])
        self.assertFalse(self.session.blocks_motion)
        self.assertIsNone(self.settings.disk['calibration_pending'])
        self.assertLess(self.controller.commands.index('D9'), self.controller.commands.index('M501'))

    def test_long_return_waits_for_segmented_move_acknowledgement(self):
        # AVR acknowledges only after bufferLine has queued all segments. A long
        # return can still be moving normally when the old 10-second wait expires.
        self.controller.return_ack_delay = 30
        state = self.start()
        self.assertEqual(state['stage'], 'confirm_reference', state)
        self.assertTrue(state['result']['return_reported'])
        self.assertFalse(self.settings.disk['calibrated'])

    def test_failed_initial_save_never_moves(self):
        self.settings.fail_on = 1
        state = self.start()
        self.assertEqual(state['stage'], 'failed')
        self.assertTrue(self.session.blocks_motion)
        self.assertNotIn('M17', self.controller.commands)
        self.assertNotIn('G28 R0', self.controller.commands)

    def test_legacy_unconfirmed_save_is_a_failure(self):
        self.settings.return_none = True
        self.start()
        self.assertEqual(self.session.status()['stage'], 'failed')
        self.assertNotIn('M17', self.controller.commands)

    def test_interrupted_capture_is_pending_on_process_restart(self):
        self.controller.capture = None
        self.start()
        restarted_settings = Settings()
        restarted_settings.data = copy.deepcopy(self.settings.disk)
        restarted = CalibrationSession(self.controller, restarted_settings)
        self.assertTrue(restarted.blocks_motion)
        self.assertEqual(restarted.status()['stage'], 'interrupted')
        with self.assertRaises(ValueError): restarted.finish({'returned_to_mark': True})
        self.assertFalse(self.settings.disk['calibrated'])

    def test_capture_failure_preserves_controller_reason_without_returning(self):
        self.controller.capture = None
        self.controller.last_error = 'Error: homing retouch travel exceeded'
        self.start()
        self.assertIn(self.controller.last_error, self.session.status()['error'])
        self.assertTrue(self.session.blocks_motion)
        self.assertFalse(any(command.startswith(('M101 A', 'G0 '))
                             for command in self.controller.commands))

    def test_partial_apply_never_returns_or_unblocks(self):
        self.controller.fail_command = 'M101 A1'
        self.start()
        self.assertTrue(self.session.blocks_motion)
        self.assertNotIn('G0 X0 Y0 F1200 A200', self.controller.commands)
        self.assertTrue(self.settings.disk['calibration_pending'])

    def test_reload_mismatch_keeps_pending(self):
        self.start()
        self.controller.corrupt_reload = True
        with self.assertRaises(RuntimeError): self.session.finish({'returned_to_mark': True})
        self.assertTrue(self.session.blocks_motion)
        self.assertFalse(self.settings.disk['calibrated'])
        self.assertTrue(self.settings.disk['calibration_pending'])

    def test_final_disk_failure_rolls_back_host_success_not_controller_writes(self):
        self.start()
        self.settings.fail_on = self.settings.saves + 1
        with self.assertRaises(OSError): self.session.finish({'returned_to_mark': True})
        self.assertFalse(self.settings.get('calibrated'))
        self.assertTrue(self.settings.get('calibration_pending'))
        self.assertTrue(self.settings.disk['calibration_pending'])
        self.assertTrue(self.session.blocks_motion)
        self.assertEqual(self.session.status()['stage'], 'failed')
        self.assertIn('M501', self.controller.commands)

    def test_changed_position_or_switch_blocks_finish(self):
        self.start()
        self.controller.position = [0.1, 0]
        with self.assertRaises(RuntimeError): self.session.finish({'returned_to_mark': True})
        self.assertTrue(self.session.blocks_motion)
        self.assertNotIn('M500', self.controller.commands)

    def test_changed_geometry_blocks_finish(self):
        self.start()
        self.controller.belts[0] += 1
        with self.assertRaises(RuntimeError): self.session.finish({'returned_to_mark': True})
        self.assertNotIn('M500', self.controller.commands)
        self.assertTrue(self.session.blocks_motion)

    def test_double_finish_and_restart_cannot_interleave(self):
        self.start()
        entered, release = threading.Event(), threading.Event()
        errors = []
        def hook(command):
            if command == 'M500':
                entered.set()
                self.assertTrue(release.wait(2))
        self.controller.hook = hook
        def finish():
            try: self.session.finish({'returned_to_mark': True})
            except Exception as exc: errors.append(exc)
        worker = threading.Thread(target=finish)
        worker.start()
        self.assertTrue(entered.wait(2))
        self.assertTrue(self.session.blocks_motion)
        try:
            with self.assertRaises(ValueError): self.session.finish({'returned_to_mark': True})
            with self.assertRaises(ValueError): self.session.start_reference(INPUT)
        finally:
            release.set()
            worker.join(2)
        self.assertFalse(worker.is_alive())
        self.assertEqual(errors, [])
        self.assertEqual(self.controller.commands.count('M500'), 1)

    def test_protocol_and_switch_preflight_fail_without_motion(self):
        self.controller.protocol = 'CALIBRATION_PROTOCOL 0'
        self.start()
        self.assertNotIn('M17', self.controller.commands)
        self.assertTrue(self.session.blocks_motion)
        self.controller.protocol = 'CALIBRATION_PROTOCOL 1'
        self.controller.switch_reply = 'M119 L:TRIGGERED R:open'
        self.start()
        self.assertNotIn('M17', self.controller.commands)

    def test_malformed_partial_count_cannot_be_accepted(self):
        self.controller.capture = 'HOME_REFERENCE L3e5 R35009'
        self.start()
        self.assertEqual(self.session.status()['stage'], 'failed')
        self.assertNotIn('M101 A0 T521.5000 B-521.5000', self.controller.commands)

    def test_no_provisional_area_does_not_destroy_geometry_setup(self):
        with patch.object(CalibrationSession, 'proposed_area', return_value=None):
            self.start()
        result = self.session.finish({'returned_to_mark': True})
        self.assertIsNone(result['work_area'])
        self.assertFalse(result['physical_clearance_verified'])

    def test_standard_profile_rejects_custom_offsets(self):
        with self.assertRaises(ValueError):
            self.session.preview({**INPUT, 'left_offset_mm': 20})


if __name__ == '__main__': unittest.main()
