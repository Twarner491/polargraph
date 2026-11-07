"""Offline analytic fixtures; no serial or machine dependencies."""
import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from modules.calibration_geometry import (
    CalibrationError, derive_setup_geometry, belt_lengths, cartesian_from_belts,
    infer_home_belts, infer_home_belts_from_net, fit_geometry,
)


class SetupGeometryTests(unittest.TestCase):
    def test_named_rear_datums(self):
        g = derive_setup_geometry(1100, 1500)
        self.assertEqual(g['motor_spacing'], 1043)
        self.assertEqual(g['anchor_y'], 721.5)
        self.assertEqual(g['datum_bottom'], -750)
        self.assertFalse(g['verified'])
        self.assertNotIn('limit_left', g)  # Paper is independent, never inferred.

    def test_asymmetric_offsets_preserve_reference_rectangle_center(self):
        g = derive_setup_geometry(1100, 1500, left_offset_mm=20, right_offset_mm=30)
        self.assertEqual(g['anchor_left_x'], -530)
        self.assertEqual(g['anchor_right_x'], 520)
        self.assertEqual(g['anchor_center_x'], -5)
        self.assertEqual(g['reference_x'], 0)

    def test_bad_measurements(self):
        for value in [True, None, '1100', math.nan, math.inf, -1, 0, 50000]:
            with self.subTest(value=value), self.assertRaises(CalibrationError):
                derive_setup_geometry(value, 1500)
        with self.assertRaises(CalibrationError):
            derive_setup_geometry(100, 100, left_offset_mm=60)
        with self.assertRaises(CalibrationError):
            derive_setup_geometry(1100, 100, top_offset_mm=60)

    def test_analytic_345_triangle_and_roundtrip(self):
        g = {'motor_spacing': 600, 'anchor_y': 400}
        self.assertEqual(belt_lengths(g, 0, 0), (500, 500))
        self.assertEqual(cartesian_from_belts(g, 500, 500), (0, 0))
        for x, y in [(-280, 300), (230, -500), (0, -250), (100, 200)]:
            p = cartesian_from_belts(g, *belt_lengths(g, x, y))
            self.assertAlmostEqual(p[0], x, places=8)
            self.assertAlmostEqual(p[1], y, places=8)

    def test_invalid_triangle_and_conflicting_anchors(self):
        g = {'motor_spacing': 600, 'anchor_y': 400}
        for ll, rr in [(300, 300), (10, 700), (-1, 500), (math.nan, 500)]:
            with self.assertRaises(CalibrationError):
                cartesian_from_belts(g, ll, rr)
        with self.assertRaises(CalibrationError):
            belt_lengths({**g, 'anchor_left_x': -200}, 0, 0)
        with self.assertRaises(CalibrationError):
            belt_lengths(g, 0, 400)

    def test_capture_uses_both_stages_and_each_scale(self):
        g = {'motor_spacing': 600, 'anchor_y': 400}
        captured = infer_home_belts(g, {
            'first_left': 10000, 'first_right': 20000,
            'backoff_left': 500, 'backoff_right': 500,
            'retouch_left': 508, 'retouch_right': 509,
        }, steps_per_mm_left=100, steps_per_mm_right=200)
        self.assertEqual(captured['net_steps_left'], 10008)
        self.assertEqual(captured['net_steps_right'], 20009)
        self.assertAlmostEqual(captured['home_belt_left'], 600.08)
        self.assertAlmostEqual(captured['home_belt_right'], 600.045)
        self.assertFalse(captured['verified'])
        self.assertLess(captured['switch_y'], 0)
        net = infer_home_belts_from_net(g, 10008, 20009, steps_per_mm_left=100,
                                       steps_per_mm_right=200)
        self.assertEqual(net, captured)

    def test_capture_requires_whole_positive_net_counts_and_all_stages(self):
        g = {'motor_spacing': 600, 'anchor_y': 400}
        with self.assertRaises(CalibrationError):
            infer_home_belts(g, {'first_left': 10000})
        for n in [0, -1, True, 0.25, math.inf]:
            with self.assertRaises(CalibrationError):
                infer_home_belts_from_net(g, n, 100)
        with self.assertRaises(CalibrationError):
            infer_home_belts_from_net(g, 1000000, 1)
        with self.assertRaises(CalibrationError):
            infer_home_belts_from_net(g, 100, 100, steps_per_mm_left=0)


TRUE = {'motor_spacing': 1050.0, 'anchor_y': 730.0,
        'home_belt_left': 1300.0, 'home_belt_right': 1250.0,
        'steps_per_mm_left': 100.0, 'steps_per_mm_right': 102.0}
TRAIN = [(-360, 280), (0, 280), (360, 280), (-300, 0), (300, 0),
         (-350, -430), (0, -430), (350, -430)]
HOLDOUT = [(-150, 100), (150, -200), (0, -300)]


def synthetic(points, actual=TRUE):
    """Independent generating equations, not module IK, including scale asymmetry."""
    out = []
    for x, y in points:
        l = math.sqrt((x + actual['motor_spacing'] / 2) ** 2 + (actual['anchor_y'] - y) ** 2)
        r = math.sqrt((x - actual['motor_spacing'] / 2) ** 2 + (actual['anchor_y'] - y) ** 2)
        out.append({'x': x, 'y': y,
                    'left_steps': (l - actual['home_belt_left']) * actual['steps_per_mm_left'],
                    'right_steps': (r - actual['home_belt_right']) * actual['steps_per_mm_right']})
    return out


class AdvancedGeometryTests(unittest.TestCase):
    def test_recovers_geometry_and_independent_holdout(self):
        initial = {**TRUE, 'motor_spacing': 1060, 'anchor_y': 745,
                   'home_belt_left': 1310, 'home_belt_right': 1240}
        r = fit_geometry(synthetic(TRAIN), initial, validation_samples=synthetic(HOLDOUT))
        self.assertTrue(r['accepted'], r['reasons'])
        self.assertFalse(r['verified'])
        self.assertLess(r['validation']['max_mm'], 0.001)
        self.assertGreater(r['baseline']['max_mm'], 10)
        self.assertEqual(r['baseline']['count'], len(TRAIN) + len(HOLDOUT))
        for key in r['fit_parameters']:
            self.assertAlmostEqual(r['candidate'][key], TRUE[key], places=5)

    def test_scales_only_when_explicit_and_observable(self):
        initial = {**TRUE, 'motor_spacing': 1060, 'anchor_y': 735,
                   'steps_per_mm_left': 99, 'steps_per_mm_right': 103}
        keys = list(TRUE)
        r = fit_geometry(synthetic(TRAIN), initial, keys, synthetic(HOLDOUT))
        self.assertTrue(r['accepted'], r['reasons'])
        for key in keys:
            self.assertAlmostEqual(r['candidate'][key], TRUE[key], places=4)

    def test_small_measurement_noise_and_step_quantization(self):
        import random
        rng = random.Random(42)
        train, holdout = synthetic(TRAIN), synthetic(HOLDOUT)
        for sample in train + holdout:
            sample['left_steps'] = round(sample['left_steps'])
            sample['right_steps'] = round(sample['right_steps'])
            sample['x'] += rng.uniform(-0.1, 0.1)
            sample['y'] += rng.uniform(-0.1, 0.1)
        r = fit_geometry(train, TRUE, validation_samples=holdout, max_error_mm=0.5)
        self.assertTrue(r['accepted'], r['reasons'])
        self.assertLess(r['validation']['max_mm'], 0.3)

    def test_duplicate_holdouts_are_not_independent_evidence(self):
        holdout = synthetic(HOLDOUT[:1]) * 2
        with self.assertRaises(CalibrationError):
            fit_geometry(synthetic(TRAIN), TRUE, validation_samples=holdout)

    def test_no_holdout_is_not_accepted(self):
        r = fit_geometry(synthetic(TRAIN), TRUE)
        self.assertFalse(r['accepted'])
        self.assertIsNone(r['validation']['max_mm'])

    def test_heldout_error_cannot_be_hidden_by_good_training_fit(self):
        holdout = synthetic(HOLDOUT)
        holdout[0]['x'] += 5
        r = fit_geometry(synthetic(TRAIN), TRUE, validation_samples=holdout)
        self.assertFalse(r['accepted'])
        self.assertGreater(r['validation']['max_mm'], 4)

    def test_rejects_underdetermined_and_non_independent_samples(self):
        for points in [TRAIN[:2], [(0, 0)] * 8,
                       [(i * 0.001, i * 0.001) for i in range(8)]]:
            with self.subTest(points=points), self.assertRaises(CalibrationError):
                fit_geometry(synthetic(points), TRUE, list(TRUE))
        with self.assertRaises(CalibrationError):
            fit_geometry(synthetic(TRAIN), TRUE, validation_samples=synthetic(TRAIN[:2]))

    def test_rejects_nonfinite_and_bad_parameter_names(self):
        data = synthetic(TRAIN)
        data[0]['left_steps'] = math.nan
        with self.assertRaises(CalibrationError):
            fit_geometry(data, TRUE)
        with self.assertRaises(CalibrationError):
            fit_geometry(synthetic(TRAIN), TRUE, ['motor_spacing', 'motor_spacing'])


if __name__ == '__main__':
    unittest.main()


def test_firmware_projection_uses_individual_anchor_limits_and_avr_precision():
    from modules.calibration_geometry import firmware_persisted_geometry
    p = {'motor_spacing': 1057.12345, 'anchor_y': 381.12345,
         'home_belt_left': 1231.91234, 'home_belt_right': 1155.71234,
         'steps_per_mm_left': 100.004, 'steps_per_mm_right': 99.997}
    result = firmware_persisted_geometry(p)
    assert abs(result['motor_spacing'] - 1057.12) < .001
    assert abs(result['anchor_y'] - 381.12) < .001
    assert result['steps_per_mm_left'] == 100
    assert abs(result['steps_per_mm_right'] - 99.99) < .001
    assert p['motor_spacing'] == 1057.12345
