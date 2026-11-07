# Measured calibration: implementation and machine acceptance

Updated 2026-10-11. Start with the [builder guide](setup-guide.md).
The matching host and firmware are installed on Teddy’s Pi and Mega2560.
The corrected top-seam setup was saved after a successful physical return to
the center mark and EEPROM reload/readback. Eight physical accuracy points were
collected; ruler rereads varied by several millimeters, and the fitted candidate
worsened independent checks. No advanced correction was applied. Drawing accuracy,
outer clearances and a power-cycle test of the latest saved profile remain pending.
The local interface is installed; repository and article changes are not published.
See the [current machine acceptance log](machine-acceptance-20261011.md) and
[previous firmware and homing log](machine-acceptance-20261010.md).
The slow 500-step homing backoff (including its first 300 slow steps) is preserved.
Stationary 5 ms switch confirmation was added after intermittent right-input
failures; subsequent successful runs do not identify the original signal source.

## Setup wizard

1. Use the published, unscaled covers, seated on the motor centering caps. Check
   that both shaft axes and the top cover seams are level.
2. Measure **W**, outside-to-outside at the exposed top seams of the covers,
   above the lower switch bulges. Measure **H**, from a cover’s top seam to the
   inner top edge of the bottom rail. See [CAD evidence](cover-datums.md).
3. Mark W/2 from the left datum and H/2 below the top datum. With motor power off,
   place the **pen axis** on that mark. Remove the pen; turn on and connect locally.
4. Capture the bounded home reference, return slowly, and physically verify the
   return to the mark. Only then save. EEPROM is reloaded and read back before
   the Pi records a verified reference.

For `standard-cover-top-seam-v2`, nominal shaft spacing = W − 59.3402978 mm;
shaft height above the reference = H/2 − 29.6701489 mm; lower datum = −H/2.
The wizard handles these CAD-derived offsets; enter the actual tape readings.
Older rear-seam profiles retain their original datum until setup is repeated.
Homing cannot infer H, paper position, or an
absolute starting belt length without a physical reference.

`calibrated` records completion of this reference setup. It does not certify
edge accuracy or clearance. Those have separate false flags in the profile.
A proposed inner rectangle is provisional and must be checked without a pen.
Existing paper bounds are preserved if no candidate rectangle can be constructed.

Interrupted setup leaves a durable pending record and blocks ordinary machine
commands. Fresh physical alignment and a new capture are the recovery path.
The original controller geometry is retained in the pending/profile snapshot.
It is **not automatically restored** while the physical position is unknown.

## Advanced calibration

The interface guides eight points and collects measured X/Y with settled motor
pulse counts. Mark each pen-hole center, then use “Marked, move aside”
to move outward by 60 mm and clear the ruler path. Independently measure each
mark from the original center reference. Use the same home, connection, and coordinate reference
throughout. The UI rejects captures across reference/connection changes. Pulse
counts establish commanded motor displacement; there are no encoders to prove
that the belt did not slip.

Fit at least four positions spread over both width and height, plus at least two
separate validation positions. Six fit positions are required if also estimating
both belt scales. Initially retain the known 100 steps/mm scales. Add scale
parameters only if a broad measurement layout identifies them reliably.

The bounded nonlinear fit jointly estimates effective spacing, anchor height and
both belt offsets. It rejects duplicate validation positions, inadequate rank,
poor conditioning, parameter-bound hits, and errors above the 1 mm target. It
also evaluates predicted AVR/EEPROM precision. The 1 mm threshold is an acceptance
criterion, **not an achieved specification** or a measurement uncertainty estimate.

Results compare the same independent validation points under the current and
candidate geometry. Improve the measurement method if ruler rereads disagree;
do not fit noise or adjust the target tolerance to make uncertain data pass.

Advanced results are **preview-only**. Automated installation of an advanced
candidate is not exposed yet: it needs a controlled re-reference and physical
validation. The completed Setup wizard is the saved calibration used for plotting.
No regional warp table or automatic speed tuning is applied.

## Model limits

The current firmware assumes level point anchors and one common belt endpoint.
Real shaft centers differ from belt tangent points, and the real gondola has
finite attachment offsets and may rotate. Fixed offsets on a rigid, nonrotating
holder can appear as effective anchor changes; pulley wrap and holder rotation
can cause angle-dependent residuals that a simple fit cannot remove.

Therefore: inspect the residual vectors across the board. A persistent curved,
angle-dependent pattern calls for a measured pulley/gondola model or mechanical
correction, not more free parameters or a claim of automatic precision. Neither
repeatable homing nor a perfect center return proves edge accuracy. Tape/print
uncertainty, belt elasticity, board flatness, and pen contact still matter.

## Transport and motion correctness

- One serial reader; serialized response ownership; timed-out/rejected moves fail.
- Tokened M400 confirms planner drain. An `OK` only means command acceptance.
- G28 R0 returns completed net homing steps and does not infer a Cartesian pose.
- Fresh boot and raw homing leave position untrusted until G92 or calibrated home.
- M400 R0 permits a drained, retained-fault recovery state, never an active endstop
  freeze. This is for freshly aligned setup only; it does not validate position.
- G92 is explicitly absolute in setup. Connect and plot-without-home do not reset
  the physical origin. Plot homing runs once, and completion requires a barrier.
- Raw physical homing is synchronous and cannot process serial M112 mid-seek.
  Stay at the power switch for acceptance; a sent stop is not proof of a stop.
- The Home Assistant webhook currently has no verified response channel. The
  public page must not report setup success from webhook delivery. Perform
  machine setup through the updated local Pi interface. Public bidirectional
  calibration remains outstanding.
- Run a single host worker for one physical serial controller. Session state and
  ownership locks are process-local; multiple workers cannot share the device.

## Acceptance when Teddy is watching

1. Back up Pi settings, running source and controller readback before installing
   the matching host and AVR build. Retain the known-working firmware image if
   available; do not substitute guessed EEPROM values.
2. Confirm M100 advertises calibration protocol 1, M119 shows the expected NC
   switches, and boot refuses ordinary motion until a reference is established.
3. Enter the two actual measurements; align the pen axis on the physical mark.
4. Run reference capture. Verify both switches, slow backoff, re-touch, bounded
   completion, correct return direction, and physical mark alignment.
5. Save, reload EEPROM, reconnect/rehome, and verify persistence and repeatability.
6. With no pen, check a small rectangle first, then progressively larger bounds.
   Measure independent center/edge targets before fitting an advanced candidate.
7. With a pen, set contact pressure using a short line; then draw/measure a grid.
   Investigate edge residuals before expanding the usable drawing area.

## Reproducible offline checks

In this repository: `PYTHONPATH=src python -m pytest tests -q`,
`node --check src/static/js/app.js`, `node --check src/static/js/calibration.js`,
and `python tools/verify_cover_datums.py`.

In the firmware repository: `python3 test_polargraph_geometry.py`,
`python3 test_calibration_protocol.py`, `python3 test_belt_telemetry.py`, and
`platformio run -e ramps-polargraph`.

The in-app browser was used against a disconnected local preview for first-run
setup, measurement conversion, the eight-point flow and reference-change failures.
The real machine completed setup and the eight physical targets. A full physical
pass through every browser control and a measured pen-down drawing remain pending.
