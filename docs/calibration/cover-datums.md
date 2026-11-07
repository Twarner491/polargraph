# Top-seam datum update — 2026-10-10

Teddy clarified that his tape hooks onto the exposed top seam of the drafted
cover wall, away from the plywood. The Setup wizard now uses that edge for width
and height. The drawings say **“Use the top seam.”**

The exact STEP planar-wall endpoints place this seam **29.67014888431 mm**
from the shaft axis. The corresponding rear edge is 28.5 mm, a draft correction
of **1.17014888431 mm per edge**. This is the planar-wall/front-fillet junction,
not the inner boundary of the flat front face after the fillet. The small section
in each guide shows the chosen junction explicitly.

The verification script checks the top and rear endpoints of all four planar
faces against the printable mesh. The exposed seam is at CAD
z=15.092133335376 mm; the rear is z=3.390644492291 mm.

For Teddy’s W=1117.6 mm and H=1447.8 mm, the corrected nominal shaft spacing is
1058.25970223138 mm and anchor height is 694.22985111569 mm. The physical midpoint
is still W/2=558.8 mm across and H/2=723.9 mm down from the same measured seams.
The earlier saved rear-datum calibration remains unchanged until a new measured
reference is captured and its return confirmed.

New clients explicitly send `standard-cover-top-seam-v2`. Older clients that
send no datum retain `standard-cover-rear-seam-v1`; saved profiles record their
actual selected version. Never silently reinterpret a saved rear-seam profile.

## Historical rear-seam analysis

The following original analysis documents the earlier datum, not the current
wizard’s measurement instruction.

### Independent CAD datum review — 2026-10-10

## Result

The shipped STEP and printable 3MF agree: the **straight rear outer edge** of each top motor cover is nominally **28.5 mm outward from the motor shaft axis**. The **straight rear top edge** is nominally **28.5 mm above that axis**. Therefore, for level, correctly seated standard covers, shaft spacing is `outside rear-edge span − 57.0 mm`. For a vertical measurement from that rear top edge to a lower reference, axis-to-reference drop is `top-edge-to-reference measurement − 28.5 mm`.

These are nominal CAD offsets, not guarantees about an assembled print. Do not advertise the plastic reference as inherently exact. Covers must be the matching unscaled design, correctly seated on their centering caps, with straight datum edges free of print defects.

## Independently checked evidence

Run `python3 tools/verify_cover_datums.py` from the repository root (requires NumPy). It parses the actual repository STEP and 3MF, identifies the parts and datums, verifies 28.5 mm offsets against the shaft bore axes, and checks each selected face vertex against the independent printable mesh. It writes `cover-datum-evidence.json`, including SHA-256 hashes of the source STEP, 3MF, and Fusion archive. No machine connection is used.

- STEP left shaft: MotorCapLeft body `#5744`, cylindrical shaft bore surface `#6911`, radius 2.5 mm, axis x = −560.304145345515, y = 715.398183181058.
- STEP right shaft: MotorCapRight body `#5746`, shaft bore surface `#6939`, same radius, mirrored x.
- STEP cover bore axes `#6938` and `#6966`, radius 11 mm, agree with shaft axes to numerical precision.
- Left outer wall: MotorCoverLeft body `#5745`, face `#998188`, plane `#918997`; rear straight edge x = −588.804145345518, z = 3.390644492291, y range 714.738838282977–740.398183181060.
- Right outer wall: MotorCoverRight body `#5747`, face `#998284`, plane `#919038`; same values mirrored in x.
- Left top wall: face `#998186`, plane `#918996`; rear straight edge y = 743.898183181060, z = 3.390644492291, x range −585.304145345518 to −540.304145345518.
- Right top wall: face `#998282`, plane `#919037`; mirrored x.
- Printable 3MF: left assembly object 42 / part 41 / `3D/Objects/object_30.model`; right assembly 44 / part 43 / `3D/Objects/object_31.model`.
- The 3MF source offsets reconstruct STEP coordinates directly for the covers. No coordinate-axis conversion or sign flip is required. The build transforms rotate the covers for printing without scaling; those transforms should not be applied when comparing source assembly coordinates.
- Maximum mesh nearest-vertex residual over the four vertices of each outer wall face is 0.000071782 mm; over each top face it is 0.000028210 mm. This is export quantization, not a meaningful geometry-version disagreement.
- Fusion archive is present and hashed. Its proprietary binary geometry was not independently evaluated; the result is grounded in the supplied STEP plus the printable 3MF, not a claimed native Fusion measurement.

## Why the previous broad mesh sample disagreed

The cover sides are tapered in depth, and the lower outline curves outward. Selecting all points near shaft height includes both the front taper and the curved lower silhouette. Their extrema are not the straight rear seam.

The outer planar wall goes from rear x = ±588.804145345518 at z = 3.390644492291 to x = ±589.974294229826 at z = 15.092133335376. Its outward taper is exactly 0.1 mm per mm of depth, a 1.170148884308 mm change before the front rounding. The top wall has the same taper. Measuring both covers on these forward edges and subtracting 57 mm would overestimate shaft spacing by approximately **2.34 mm**. A photograph's apparent silhouette or the overall bounding box is therefore not an acceptable measurement datum.

The rear vertical straight edge is 25.659344898083 mm long. It begins 0.659344898083 mm below the shaft axis and ends 25 mm above it. The straight top edge is 45 mm long, excluding its rounded corners. This gives useful diagram placement: indicate the straight section close to the plywood, above the shaft height, not the lower bulge or front rounded face.

## Suggested wizard wording

“Measure horizontally between the outer straight edges of the two top motor covers, using the edge nearest the plywood on both covers. Keep the tape straight and at the same height. Avoid the rounded front edge and the curved lower part. Enter the full outside-to-outside distance; we subtract the cover offsets.”

A diagram must show the rear edge in an inset side view, because a front view alone makes the 28.5 mm datum easy to misidentify. The photo's red strokes identify the intended outer sides, but do not uniquely distinguish depth. A spare straightedge against the rear seam can project each reference to an accessible tape-reading plane; it must not follow the tilted sidewall. Do not hook the tape on a front edge on one side and read a rear edge on the other.

For a vertical lower bound: “Measure straight down from the rear top edge of a top cover to your chosen bottom drawing limit. We subtract 28.5 mm to reference the motor axis.” This requires a physical measurement; homing alone cannot infer that lower workplane boundary.

The two motor axes must be level, and the covers aligned with each other for the scalar `span − 57` interpretation. An outside diagonal measurement between unequal heights is not the same as horizontal motor spacing. Setup should include a simple level/alignment check; advanced mode can explicitly model a measured height difference if supported by the firmware.

## Tolerance and limitations

The CAD dimensions are exact in the nominal model; the following assembled effects are not measured by the files: printer scale/shrinkage, elephant's foot, warping, cap-to-cover play, cap-to-shaft fit, screw or adhesive placement, and tape alignment/hook/read error. Do not invent a numerical overall ± tolerance from this analysis.

The printable cap meshes have maximum radial extent about 10.76169 mm versus the cover's 11 mm cylindrical opening. That suggests nominal clearance, but is not a full contact/constraint analysis and must not be turned into a guaranteed ±0.23831 mm location bound. The cap profile is shaped and axial seating matters.

The first-time result can be a strong initial geometry estimate; an independent drawn validation pattern is still needed to call the machine accurate. Advanced measurement should permit direct shaft spacing or independently checked printed offsets, rather than force every custom/modified build to use the 28.5 mm standard cover constant. Persist the measured span, selected datum/version, nominal offsets, derived spacing, and verification status separately, so later changes are auditable.
