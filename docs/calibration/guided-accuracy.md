# Guided accuracy measurements

The local interface has a four-step Setup wizard (width, height, center mark,
home/return) and Advanced calibration with eight individually requested moves.
The guided set uses 65% of each saved drawing bound around the physical origin.
It does not establish paper coverage or mechanical clearance at the outer edges.

Six points inform the fit. Left/right midpoint targets are held out. A user
measures actual pen-axis X/Y from the physical center mark, using right/up as
positive. The interface never copies requested coordinates into measured fields.
The starting profile comes from saved, read-back controller values.

Each target request checks the setup session, serial connection and reference
epoch before moving. It uses 1200 mm/min and 200 mm/s², waits for the controller
ACK and a separate completion barrier, then reads real settled pulse counters.
Recording a physical measurement reads the counters again to reject intervening
motion or reference changes. Pulses are not encoders: unobserved slip, manual
movement or drift with disabled motors remain physical limitations.

On any unverified motion response, the UI stops the set and offers no blind
retry. Normal host ownership prevents conflicting machine requests during the
move. Geometry and EEPROM remain unchanged by this measurement flow.

Results show current geometry error, candidate fit residuals, held-out residuals,
and EEPROM-rounded candidate residuals in the detailed report. A passing fit is
still a candidate, not an installed calibration. The original Setup wizard
reference and its verification flags remain intact. Applying and physically
validating a correction is a subsequent controlled operation.

The results also compare current and candidate RMS/maximum on the same held-out
points, with a warning if their RMS worsens. The interface asks for fine cross
marks, separate horizontal/vertical distances, and a reread after replacing the
ruler. Several-millimeter disagreement calls for a better measurement method,
not an automatic geometry change. Summary metrics use one decimal place; the
detailed report retains the numerical result without claiming that precision
for the physical measurement.

Guided measurements are saved in browser local storage and can be downloaded as
versioned JSON. Reload recovers them for review/export, never automatic motion
resumption. Manual rows remain available under a disclosure. Downloaded guided
data contain the original captures, targets, reference and starting geometry.

## Offline acceptance, 2026-10-10

- Browser walkthrough: W 44 in / H 57 in produces mark instructions 22 in across
  and 28.5 in down. Only one setup measurement is shown at a time.
- Browser walkthrough against a separate simulated controller: all eight points,
  signed measurement entry, six-fit/two-validation split, baseline comparison and
  candidate diagnostics passed. These results are simulated, not machine accuracy.
- Simulated reference epoch change before the next target: set stops, move and
  record controls disabled, no automatic retry.
- Host tests cover reference changes before/after movement, malformed target
  inputs, failed completion, ownership during setup, and delayed motion ACK.

## Top-seam datum

Teddy confirmed the exposed end of the drafted cover wall. The current wizard
uses `standard-cover-top-seam-v2` and a STEP-verified 29.67014888431 mm offset.
Existing saved rear-seam profiles retain their original values and version;
repeat the measured reference to adopt the corrected datum. See
`cover-datums.md` for the measured CAD evidence and correction.


## Mark, move aside, measure

After a target settles, mark the pen-hole center and choose “I’ve marked
it—move aside.” This checks that the controller still matches the original
capture, then moves 60 mm outward: left for left-side marks, right for right-side
marks. Directly above or below the center, either side is suitable (left first).
If the outward move exceeds the configured bounds, measure in place rather than
parking between the marks. Each move still requires
completion and an unchanged home reference.

Keep the original target capture for the fit. Store the parking capture
separately, using it only to detect intervening movement when recording the
measurement. Measure between the original center mark and the new marked point,
not the parked gondola. A failed or uncertain clearance move stops the set.

Offline browser check: original L-70640/R-49881 retained in the measurement row
after parking changed current counts to L-74027/R-45056. JavaScript syntax check
passed. UI-only installation preserved the live serial connection and pulse
counts; no server restart or firmware change was needed.
