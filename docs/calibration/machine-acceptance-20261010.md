# Machine acceptance — October 10, 2026

## Prepared reference

Teddy measured W = 44 inches and H = 57 inches, marked the midpoint, and confirmed
that the pen axis was aligned after M18 released the motors. Derived spacing is
1060.6 mm; anchor height above this reference is 695.4 mm.

## Deployment and recovery

- Pi: `/home/monalisa/calibration-backup-20261010/` contains the previous source,
  settings, controller readback, full flash image and EEPROM image.
- Mac: `/tmp/polargraph-calibration-20261010/deploy/controller-backup.tgz` contains
  a second copy of settings, controller readback and firmware/EEPROM images.
- Installed 23 host files; verified each SHA-256 against the local manifest.
  Existing machine settings were preserved.
- New firmware SHA-256: `a27eab0e7a9bbd0542ed1d9d5241712f4a9481038b34ff937bce1dc3c32df3dd`.
- avrdude verified 38248 flash bytes and all 4096 EEPROM bytes against the backup.
- Readback: protocol 1, steps/mm 100/100, D7 L1231.90 R1155.69;
  original M101 limits (-528.64,-381,40) through (528.64,381,90).
- Both switches released. Ordinary M400 rejected the unreferenced boot state;
  recovery M400 returned IDLE_REFERENCE_REQUIRED as intended.
- Updated local wizard loads and previews 1117.6 × 1447.8 mm correctly.
- Local web service restarted and controller connected. M18 sent to leave motors
  released. MQTT relay remains temporarily stopped during supervised acceptance.
- Verification: 85 host tests and 11 subtests passed; all three firmware native
  tests passed; ramps-polargraph build passed.

## Still pending

Observed reference homing, physical center-return check, persistence, repeat home,
clearance checks and independent accuracy measurements. No reference capture or
machine movement has been commanded by this deployment. Before motion Teddy must
confirm the pen is absent, paths are clear and they are watching by the power switch.

## First supervised reference run

Reference session `5ba0dbe4453e4c04a73219ff07187e27` failed before installing
geometry or sending a return. Teddy observed the left side touch, back off and
retouch; the right counterweight stopped before its first physical touch, roughly
one-third short of the top. The controller’s exact error was not retained by the
original generic host error path, so the immediate cause is not established.
An early temporary right-switch signal followed by retouch-travel exhaustion is
a hypothesis consistent with the observed sequence, not a confirmed diagnosis.

After disconnecting, M18 released the motors. Thirty stationary M119 readings all
reported `L:TRIGGERED R:open rawL=1 rawR=0`. Pending calibration remains in place;
geometry is unverified. User was asked to inspect possible belt/lever contact or a
loose connector without repositioning the gondola. Host diagnostics now retain the
exact controller rejection and log homing milestones/errors to the Pi journal.
No automatic retry or firmware motion change has been made.

## Successful physical return; host acknowledgement timing corrected

Session `08166e1124de4499aa4ff6506213525b`: first-touch L47868/R47573,
second-touch L502/R502, net reference L47870/R47575 steps. Derived home belts
L1353.22801556/R1350.27801556 mm. Both homing stages completed and Teddy explicitly
confirmed a perfect return to the physical mark. A subsequent read-only M114
reported X0.00 Y0.00.

The host nevertheless failed its acceptance wait after 10 seconds. Production
firmware calls bufferLine before printOK; a long segmented move feeds a finite
planner queue and can acknowledge only after most of its physical travel. The
setup return now allows 90 seconds for acknowledgement and still separately
requires an M400 completion barrier. A regression test models a 30-second ACK;
all 88 host tests plus 11 subtests pass. The host fix is installed; no firmware
motion changes were made. Repeating capture from the user-confirmed origin to
validate repeatability and complete the full state machine before saving.

## Repeat run exposes intermittent right first-touch signal

Session `b91f576abc60451c868785687ea78c5c` started at the user-confirmed
physical origin. First-touch counts were L47870/R28764; firmware then reported
`Error: homing retouch travel exceeded`. Left first-touch repeated within 2 motor
steps of the successful pass. Right first-touch was 18809 steps (188.09 nominal mm)
earlier than the successful pass. The right first-touch count is emitted only
after its configured digital input reports pressed, so an early input event is
established; physical contact versus intermittent wiring/noise is unresolved.

Teddy observed the right counterweight stop near the same vertical position as
the first failure, below the released right switch, while the left completed its
first touch, backoff and second touch. Motors were released by the homing failure
handler. No further automatic retries or relaxed retouch limit. Next step is a
stationary switch press/release and wiring/contact inspection, followed by fresh
physical alignment before any reference capture. The successful return does not
establish reliable homing or a completed/persisted calibration.

## Manual right-switch test and stationary confirmation build

A 180-second stationary M119 monitor recorded 1119 replies. Three manual right
lever presses registered at 11.418, 14.985 and 18.393 seconds; releases registered
at 13.056, 16.787 and 20.195 seconds. No other state changes appeared, including
during Teddy's reported wire/connector wiggle. Left stayed triggered throughout.
Polling cannot exclude very short pulses between queries or movement-induced
contact/noise. The cause remains unresolved. Raw log is in the Pi backup directory
as `right-switch-manual-test.json`, with a second copy in the Mac scratch folder.

Prepared stationary 5 ms confirmation for homing inputs, preserving backoff and
retouch bounds and adding first-rejected-pulse/count diagnostics. Native geometry,
protocol and telemetry tests pass; ramps-polargraph build passes (38500 flash bytes).
Firmware SHA-256: `f960ea752640fcb338eecec99250c18f9da2a430d86fbb50c11693ed0e331f00`.
Physical validation pending.

The stationary-confirmation build was flashed and all 38500 flash bytes verified;
all 4096 EEPROM bytes matched the fresh pre-flash backup. M18 was sent after
installation to release the motors for fresh physical alignment.

## First complete reference pass with stationary input confirmation

Session `55aa476ffcc7463b842e14e3b284aed0` completed both homing stages and
the return without host errors. First-touch L47998/R47605; second-touch L501/R500;
net L47999/R47605. No HOMING_GLITCH/FILTER records appeared during this run, so
this pass alone does not prove the filter resolved the earlier intermittent fault.

The host verified the return completion barrier, reported origin and released
switches; state is `confirm_reference`, awaiting Teddy's physical mark check.
Readback: spacing 1060.60 mm, anchor height 695.40 mm, home belts L1354.52/R1350.58.
Full unsaved candidate is recorded in `reference-pass-20261010.json`. Persistence
and repeatability acceptance remain pending.

## Saved reference and normal-home acceptance

Teddy confirmed the pen axis was aligned with the physical mark after the complete
setup run. `/api/calibration/finish` succeeded, including M500, D9, M501 and
readback verification. Actual persisted D7 belts are L1354.51/R1350.57 mm (EEPROM
hundredth truncation); Pi settings use those exact persisted values. Spacing is
1060.60 mm and anchor height is 695.40 mm. Reference and EEPROM-readback flags
are true; reboot, clearance and drawing-accuracy flags remain false.

A normal `/api/home` then completed using the saved calibration at the configured
travel speed: first-touch L47993/R47597; second-touch L508/R501; net
L48001/R47598, versus the setup's L47999/R47605. Differences of +2/-7 steps are
nominal belt travel of +0.02/-0.07 mm, not measured Cartesian accuracy. Teddy again
confirmed the pen axis landed on the mark. No glitch/filter records appeared in
these two successful runs; root cause of the original intermittent event remains
unconfirmed and long-term reliability is not established.

The reference calibration is complete. Still pending: full power-cycle acceptance,
progressive pen-free clearance checks, independent center/edge measurements, and
pen-contact calibration. Advanced fitting remains preview-only.


## Top-seam interface installation

Teddy clarified the exposed top of the drafted cover wall. STEP and 3MF verify
29.67014888431 mm offset. Top-seam-v2 with W=1117.6/H=1447.8 previews spacing
1058.25970223138 and anchor height 694.22985111569 mm. The midpoint instructions
remain 22 in across and 28.5 in down from those seams.

Installed 17 host/interface/asset files with hashes verified; backup is
`calibration-backup-20261010/before-top-seam-ui.tgz`. Existing saved settings hash
was unchanged. Both host and relay services were restarted; USB is disconnected
until the next deliberate connection. No firmware flash and no machine motion.
The saved rear-seam profile remains valid as a historical result, but its datum
assumption differs from the clarified measurements. Repeat reference capture and
physical return verification before evaluating the corrected setup's accuracy.

104 host tests and 11 subtests passed. Live preview and wizard input flow verified.
