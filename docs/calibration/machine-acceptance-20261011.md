# Physical acceptance — 2026-10-11

After overnight power-off, Teddy confirmed the pen axis was on the physical
center mark, the pen was removed, and he was watching. Reconnected, then ran
Setup wizard reference capture with W=1117.6 mm, H=1447.8 mm and the explicit
`standard-cover-top-seam-v2` datum.

Both seek stages completed without a controller error. First-touch counts:
L47961/R47610. Retouch L501/R504 after 500-step backoff, net L47962/R47614.
No HOMING_GLITCH or HOMING_FILTER messages were present in the captured run log.
This successful pass does not establish a cause or permanent resolution for the
previous intermittent right-endstop issue.

The controller confirmed return completion; Teddy independently confirmed the
pen hole was back on his physical mark without slip. `/api/calibration/finish`
then saved, reloaded and verified the reference on EEPROM and Pi. Persisted
readback: belts L1352.50/R1349.02 mm, shafts X±529.12 mm, Y694.22 mm;
100 steps/mm both sides. Datum/profile remain versioned as top-seam-v2.

## Accuracy measurements underway

The first explicitly requested target completed at commanded X=-144, Y=174 mm.
Settled relative pulse counts: left -70524, right -49830, epoch 3. Those are motor
pulses, not independently measured belt travel. User measurements of physical
left/up displacement are pending; no drawing accuracy has been claimed.

Source snapshots: `top-seam-reference-20261011.json`,
`top-seam-saved-reference-20261011.json`, `accuracy-session-20261011.json`.
Pi backup directory: `/home/monalisa/calibration-backup-20261011/`.


Teddy requested marking the pen-axis location and moving the gondola sideways
to clear the tape-measure path: it is much narrower than tall. After he confirmed
“Marked—move it left,” a checked 60 mm left move completed at X=-204/Y=174.
Original marked-point counts remain L-70524/R-49830; parking counts are
L-73904/R-45008. Physical X/Y measurements remain pending.


First independent measurement: Teddy read 17 cm up and 14.5 cm left between
physical marks: X=-145 mm/Y=170 mm versus commanded X=-144/Y=174. Displacement
is -1 mm in X and -4 mm in Y, norm 4.123 mm. Measurement uncertainty has not been
quantified. This single reading is not sufficient to fit or establish region-wide
accuracy. Original marked-point pulse counts, not parking counts, are retained.

Point 2 completed at commanded X=0/Y=174 with L-61048/R-60700 relative pulses;
mark confirmation and its independent measurement are pending.


Teddy flagged ruler/Sharpie measurement uncertainty. No numeric uncertainty has
been assumed. Requested a lift/reposition/reread at the second mark to assess
reading repeatability; this cannot assess systematic mark-centering or origin
errors. Treat the first 4.1 mm residual as a measured discrepancy, not established
machine error. Prefer consistent multi-point/held-out improvement over fitting
small reading differences. Current fixed 1 mm solver criterion is a numerical
candidate check, not a justified physical accuracy guarantee for these readings.

Second point marked; confirmed clearance move to X=-60/Y=174 completed with
L-65200/R-56309. Original target counts remain L-61048/R-60700.


Second reading: Teddy reported 174 mm up and zero sideways offset, matching the
requested X=0/Y=174 at the reported precision. A distinct repeat reading was not
provided, so ruler repeatability remains unquantified. Point 3 completed at
X=144/Y=174, original pulse capture L-50178/R-70176. Mark confirmation pending.


Third reading: 14.4 cm right / 17.4 cm up, X=144/Y=174 mm, matches its
requested position at the reported precision. No uncertainty bound inferred.
Point 4, reserved for validation, completed at X=144/Y=0 with original capture
L-38553/R-55513. Mark confirmation pending. Keep the original first-point
reading; the two matching readings alone do not justify discarding it.

Point 4 marked: user confirmed “Marked—move it left”. Verified unchanged original capture and reference before moving 60 mm left to X84/Y0. Controller confirmed completion, L−42629 / R−52435, epoch 3. Original point-4 L−38553 / R−55513 remains the measurement capture. Awaiting physical mark-to-mark reading.

Point 4 clearance correction: Teddy found left parking blocked the ruler between origin and the right-side mark. Requested outward parking (left on left, right on right; either for vertical points). Verified reference and parked capture, moved from X84/Y0 to X204/Y0, completed at L−34284/R−58244. Original target capture unchanged; earlier parking retained in history. Wizard updated to outward parking with bounds checks, no inward fallback for side marks. Six isolated UI-handler checks passed (directions, center fallback, bounds rejection, original capture retention); live served JavaScript verified after hot-install, pulse counts and reference unchanged. No service restart.

Point 4 measured 144 mm right, no up/down offset (X144/Y0). Held out for validation; original capture L−38553/R−55513 retained, final outward parking L−34284/R−58244 verified before recording. Command-to-reading difference 0 mm at reported precision; measurement uncertainty remains unknown. Point 5 then completed at commanded X144/Y−212, capture L−22364/R−36436, same connection and reference epoch 3. Awaiting pen-hole marking before outward parking.

Point 5 marked: Teddy confirmed “marked”. Verified unchanged original capture and reference, then moved 60 mm right to X204/Y−212. Completed at L−18687/R−38624, epoch 3. Original target L−22364/R−36436 retained for measurement. Awaiting independent right/down reading.

Point 5 measured 202 mm down and 147 mm right (X147/Y−202), versus commanded X144/Y−212: signed error +3 mm X, +10 mm Y; magnitude 10.4403 mm. Raw reading retained without assuming measurement error or a geometry cause. Original capture L−22364/R−36436 used, parked capture L−18687/R−38624 verified before recording. Point 6 completed at X0/Y−212, L−30312/R−29964, same connection and epoch 3. Awaiting mark confirmation before 60 mm left clearance.

Point 6 marked: Teddy confirmed “marked”. Verified unchanged original capture and reference, then moved 60 mm left to X−60/Y−212. Completed at L−33205/R−26814, epoch 3. Original target L−30312/R−29964 retained for measurement. Awaiting independent downward and signed horizontal reading.

Point 6 measured 209 mm down, 0 left/right (X0/Y−209), versus commanded X0/Y−212: signed error 0 mm X, +3 mm Y. Original capture L−30312/R−29964 retained, parked L−33205/R−26814 verified before recording. Point 7 completed at X−144/Y−212, L−36784/R−22016, same connection and reference epoch 3. Awaiting marking before outward-left clearance.

Point 7 marked: Teddy confirmed “marked”. Verified unchanged original capture and reference, then moved 60 mm left to X−204/Y−212. Completed at L−38972/R−18339, epoch 3. Original target L−36784/R−22016 retained for measurement. Awaiting independent left/down reading.

Point 7 measured 211 mm down and 145 mm left (X−145/Y−211), versus commanded X−144/Y−212: signed error −1 mm X, +1 mm Y, magnitude 1.4142 mm at reported precision. Original capture L−36784/R−22016 retained; parked L−38972/R−18339 verified before recording. Final point 8 (held-out validation) completed at X−144/Y0, L−55861/R−38205, same connection and reference epoch 3. Awaiting marking before outward-left clearance.

Point 8 marked: Teddy confirmed “Marked—move it left”. Verified unchanged original capture and reference, then moved 60 mm left to X−204/Y0. Completed at L−58592/R−33936, epoch 3. Original target L−55861/R−38205 retained for held-out validation measurement. Awaiting independent left distance and signed vertical offset.

Point 8 measured X−145/Y0 after Teddy explicitly corrected an initial typed 45 mm to 145 mm. Original target L−55861/R−38205 retained; final parking L−58592/R−33936 verified. All eight samples saved: six fit, two held-out. Machine remains parked X−204/Y0; no motion, homing, or parameter changes after collection.

Initial four-parameter fit preview (fixed 100 steps/mm): baseline RMS 4.1535 mm, maximum 10.4418 mm. Candidate training RMS 3.6283 mm, max 6.2419 mm; held-out RMS 2.7435 mm, max 2.8507 mm, compared with baseline held-out RMS about 0.7083 mm. Candidate spacing 980.9042 mm versus measured/saved 1058.24 mm. Fit rejected at the existing 1 mm numerical criterion; no correction applied. That threshold is not a physical accuracy guarantee given unquantified ruler/Sharpie uncertainty. Requested two independent ruler placements to remeasure the existing lower-right mark, originally X147/Y−202, without moving the machine or discarding the original reading.

Lower-right existing-mark repeat: Teddy first typed 109 mm down / 142 mm right, then explicitly confirmed 209 mm down / 142 mm right. Stored X142/Y−209 separately in point 5 repeat_measurements, leaving original X147/Y−202 intact and not substituting into the fit. Requested another independent ruler placement to quantify repeatability. No motion or geometry changes.

Second lower-right stationary-mark repeat: X143/Y−216 (143 mm right, 216 mm down), stored separately from original and first repeat. The two requested repeats span 1 mm horizontally and 7 mm vertically; all three downward readings are 202, 209, 216 mm. No plotter motion occurred during rereading. This establishes observed manual measurement variability, not a calibrated statistical uncertainty or evidence of changing machine position. Defer geometry correction; retain original and repeat data, improve measurement procedure. Asked which measuring tools are available (tape, square/level, ruler).

Builder workflow review: Teddy clarified that this ruler-based pass was to establish the reproducible Advanced calibration workflow for the repository and article, rather than pursue more physical ruler refinement now. Updated the builder guide, repository overview, current top-seam implementation notes, and local article source with static wireframe guides. Advanced remains a fit preview, no candidate installation. UI now gives measurement-repeatability guidance and compares the same held-out points under current/candidate geometry, explicitly flags worsening checks. All 104 host tests and 11 subtests passed; Node syntax, report rendering using captured data, offline browser guidance, article build and image links passed. UI-only Pi installation verified identical connection, epoch and pulse counts before/after; source hash recorded in accuracy-review-ui-manifest-20261011.json. No physical movement, controller restart or parameter change. Repository/article changes remain local and unpublished.
