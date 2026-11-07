# Calibration measurement guides

`tools/calibration/render_static_guides.py` draws one guide per step: width,
height, center mark, home and return, and the eight-point accuracy check. The
interface inlines `src/static/calibration/guide-*.svg` and writes the measured
values into the elements marked `data-dim`. The same script writes example PNGs
with real readings to `docs/calibration/figures/`.

Cover outlines come from the supplied 3MF in source assembly coordinates, checked
against the STEP export from Fusion. XY scale is uniform; the board uses nominal
CAD proportions. The top seam is the exposed end of the drafted wall; its
29.67014888431 mm shaft offset is checked against STEP and the print mesh by
`tools/verify_cover_datums.py`.

Render dependencies (development only): NumPy, Pillow, Shapely, CairoSVG and
`diagramkit` from the diagram skill. The Pi serves prebuilt assets and needs none
of them. The renderer records the source mesh hash and datum version in
`guide-provenance.json`.
