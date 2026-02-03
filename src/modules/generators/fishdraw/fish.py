# Fish generation - main procedural fish drawing algorithm
# Ported from fishdraw.js by LingDong

import math
import random
import hashlib
from typing import List, Tuple, Dict, Any, Optional, Callable

from .geometry import (
    Point, Polyline, dist, lerp, lerp2d, get_bbox, pt_in_poly,
    clip, clip_multi, trsl_poly, scale_poly, rotate_poly,
    poly_centroid, polyline_length
)
from .curves import (
    resample, approx_poly_dp, smooth_polyline, bezier_curve,
    catmull_rom_spline, circle_points, ellipse_points,
    get_tangent_angle, get_normal_angle, subdivide_polyline
)
from .perlin import PerlinNoise

PI = math.pi


def seed_from_string(s: str) -> int:
    """Convert a string to an integer seed."""
    h = int(hashlib.md5(s.encode()).hexdigest()[:8], 16)
    return h if h != 0 else 1


def default_params() -> Dict[str, Any]:
    """Return default fish parameters."""
    return {
        'body_curve_type': 0,
        'body_curve_amount': 0.85,
        'body_length': 300,
        'body_height': 80,
        'scale_type': 0,
        'pattern_type': 0,
        'has_dorsal': True,
        'has_pectoral': True,
        'has_pelvic': True,
        'has_anal': True,
        'has_finlet': False,
        'has_adipose': False,
        'has_tail': True,
        'dorsal_start': 0.2,
        'dorsal_end': 0.7,
        'dorsal_height': 60,
        'dorsal_texture': True,
        'pectoral_start': 0.25,
        'pectoral_length': 50,
        'pectoral_angle': -0.3,
        'pelvic_start': 0.45,
        'pelvic_length': 30,
        'anal_start': 0.5,
        'anal_end': 0.8,
        'anal_height': 30,
        'tail_type': 0,
        'tail_length': 60,
        'tail_spread': 0.8,
        'eye_size': 15,
        'eye_pos': 0.15,
        'mouth_size': 0.3,
        'mouth_open': 0.2,
        'has_teeth': False,
        'has_whisker': False,
        'body_stripe_count': 5,
        'body_spot_count': 10,
        'body_texture_density': 1.0,
    }


def generate_params(seed: Optional[Any] = None) -> Dict[str, Any]:
    """
    Generate random fish parameters.

    Args:
        seed: Optional seed (string, int, or None for random)
    """
    if seed is not None:
        if isinstance(seed, str):
            seed_int = seed_from_string(seed)
        else:
            seed_int = int(seed)
        rng = random.Random(seed_int)
    else:
        rng = random.Random()

    def rndtri(a: float, b: float, c: float) -> float:
        """Triangular distribution."""
        return rng.triangular(a, c, b)

    def choice(options: list):
        return rng.choice(options)

    params = default_params()

    # Body shape
    params['body_curve_type'] = choice([0, 1])
    params['body_curve_amount'] = rndtri(0.5, 0.85, 0.98)
    params['body_length'] = rndtri(200, 300, 420)
    params['body_height'] = rndtri(45, 80, 150)

    # Scale/texture type
    params['scale_type'] = choice([0, 1, 2, 3])
    params['pattern_type'] = choice([0, 1, 2, 3, 4])

    # Fins
    params['has_dorsal'] = rng.random() > 0.1
    params['has_pectoral'] = rng.random() > 0.05
    params['has_pelvic'] = rng.random() > 0.3
    params['has_anal'] = rng.random() > 0.2
    params['has_finlet'] = rng.random() > 0.85
    params['has_adipose'] = rng.random() > 0.9
    params['has_tail'] = True

    # Dorsal fin parameters
    params['dorsal_start'] = rndtri(0.1, 0.2, 0.4)
    params['dorsal_end'] = rndtri(0.5, 0.7, 0.9)
    params['dorsal_height'] = rndtri(30, 60, 120)
    params['dorsal_texture'] = rng.random() > 0.3

    # Pectoral fin
    params['pectoral_start'] = rndtri(0.15, 0.25, 0.35)
    params['pectoral_length'] = rndtri(30, 50, 80)
    params['pectoral_angle'] = rndtri(-0.6, -0.3, 0.1)

    # Pelvic fin
    params['pelvic_start'] = rndtri(0.35, 0.45, 0.55)
    params['pelvic_length'] = rndtri(15, 30, 50)

    # Anal fin
    params['anal_start'] = rndtri(0.4, 0.55, 0.7)
    params['anal_end'] = rndtri(0.7, 0.8, 0.95)
    params['anal_height'] = rndtri(15, 30, 50)

    # Tail
    params['tail_type'] = choice([0, 1, 2])
    params['tail_length'] = rndtri(40, 60, 100)
    params['tail_spread'] = rndtri(0.5, 0.8, 1.2)

    # Head features
    params['eye_size'] = rndtri(8, 15, 25)
    params['eye_pos'] = rndtri(0.1, 0.15, 0.25)
    params['mouth_size'] = rndtri(0.15, 0.3, 0.5)
    params['mouth_open'] = rndtri(0, 0.2, 0.5)
    params['has_teeth'] = rng.random() > 0.8
    params['has_whisker'] = rng.random() > 0.9

    # Body patterns
    params['body_stripe_count'] = rng.randint(3, 8)
    params['body_spot_count'] = rng.randint(5, 20)
    params['body_texture_density'] = rndtri(0.5, 1.0, 1.5)

    return params


class FishGenerator:
    """Generates procedural fish drawings as polylines."""

    def __init__(self, params: Dict[str, Any], seed: Optional[int] = None):
        self.params = params
        self.rng = random.Random(seed) if seed else random.Random()
        self.noise = PerlinNoise(seed or 0x5EED)

        # Body curves
        self.curve_top: Polyline = []
        self.curve_bottom: Polyline = []
        self.outline: Polyline = []

        # Output polylines
        self.polylines: List[Polyline] = []

    def rand(self) -> float:
        return self.rng.random()

    def generate(self) -> List[Polyline]:
        """Generate complete fish drawing."""
        self._generate_body_curves()
        self._generate_body_outline()
        self._generate_body_texture()
        self._generate_fins()
        self._generate_head()
        return self.polylines

    def _generate_body_curves(self):
        """Generate upper and lower body curves."""
        n = 32
        p = self.params
        length = p['body_length']
        height = p['body_height']
        amount = p['body_curve_amount']

        self.curve_top = []
        self.curve_bottom = []

        for i in range(n):
            t = i / (n - 1)

            # X position along body
            x = (t - 0.5) * length

            # Body shape using sine waves with noise
            if p['body_curve_type'] == 0:
                # Type 0: Smooth sine-based body
                y_factor = math.sin(t * PI) * lerp(0.5, 1.0, self.noise.noise(t * 2, 1))
                y_top = height * (amount * y_factor + (1 - amount))
                y_bottom = -height * (amount * y_factor + (1 - amount))
            else:
                # Type 1: Bean-shaped body
                y_factor = math.sin(t * PI) * (1 - 0.3 * math.sin(t * PI * 2))
                y_top = height * y_factor * amount
                y_bottom = -height * y_factor * amount * 0.8

            self.curve_top.append((x, y_top))
            self.curve_bottom.append((x, y_bottom))

    def _generate_body_outline(self):
        """Create closed outline from top and bottom curves."""
        self.outline = list(self.curve_top) + list(reversed(self.curve_bottom))

    def _generate_body_texture(self):
        """Generate scales, stripes, or other body textures."""
        p = self.params
        scale_type = p['scale_type']

        # Add outline
        self.polylines.append(self.curve_top)
        self.polylines.append(list(reversed(self.curve_bottom)))

        if scale_type == 0:
            self._generate_scales()
        elif scale_type == 1:
            self._generate_stripes()
        elif scale_type == 2:
            self._generate_spots()
        else:
            self._generate_hatching()

    def _generate_scales(self):
        """Generate overlapping fish scales."""
        p = self.params
        density = p['body_texture_density']

        bbox = get_bbox(self.outline)
        min_x, min_y, max_x, max_y = bbox
        scale_size = 12 / density

        # Generate grid of scales
        y = min_y + scale_size
        row = 0
        while y < max_y - scale_size:
            x = min_x + scale_size + (row % 2) * scale_size * 0.5
            while x < max_x - scale_size:
                # Check if scale center is inside body
                if pt_in_poly((x, y), self.outline):
                    # Draw a scale (arc)
                    scale = self._draw_scale(x, y, scale_size * 0.8)
                    # Clip to body outline
                    clipped = clip(scale, self.outline)
                    self.polylines.extend(clipped['true'])

                x += scale_size
            y += scale_size * 0.6
            row += 1

    def _draw_scale(self, cx: float, cy: float, radius: float) -> Polyline:
        """Draw a single fish scale (arc shape)."""
        points = []
        segments = 12
        for i in range(segments + 1):
            t = i / segments
            angle = PI * 0.3 + t * PI * 0.4  # Partial arc
            x = cx + radius * math.cos(angle) * 0.8
            y = cy + radius * math.sin(angle) - radius * 0.3
            points.append((x, y))
        return points

    def _generate_stripes(self):
        """Generate vertical stripes on body."""
        p = self.params
        count = p['body_stripe_count']
        bbox = get_bbox(self.outline)
        min_x, min_y, max_x, max_y = bbox

        stripe_width = (max_x - min_x) / (count + 1)

        for i in range(count):
            x = min_x + stripe_width * (i + 1)

            # Create vertical stripe line
            stripe = [(x, min_y - 10), (x, max_y + 10)]

            # Clip to body
            clipped = clip(stripe, self.outline)
            for line in clipped['true']:
                if len(line) >= 2:
                    # Add some waviness
                    wavy = []
                    for j, pt in enumerate(resample(line, 5)):
                        wave = self.noise.noise(pt[1] * 0.1, i) * 3
                        wavy.append((pt[0] + wave, pt[1]))
                    if len(wavy) >= 2:
                        self.polylines.append(wavy)

    def _generate_spots(self):
        """Generate spots/dots on body."""
        p = self.params
        count = p['body_spot_count']
        bbox = get_bbox(self.outline)
        min_x, min_y, max_x, max_y = bbox

        for _ in range(count):
            # Random position
            x = min_x + self.rand() * (max_x - min_x)
            y = min_y + self.rand() * (max_y - min_y)

            # Check if inside body
            if pt_in_poly((x, y), self.outline):
                # Draw a small circle
                radius = 3 + self.rand() * 5
                spot = circle_points(x, y, radius, 12)
                self.polylines.append(spot)

    def _generate_hatching(self):
        """Generate diagonal hatching texture."""
        p = self.params
        density = p['body_texture_density']
        bbox = get_bbox(self.outline)
        min_x, min_y, max_x, max_y = bbox

        step = 8 / density
        angle = PI / 4  # 45 degrees

        # Generate diagonal lines
        start = min_x + min_y
        end = max_x + max_y

        pos = start
        while pos < end:
            # Line from bottom-left to top-right direction
            x1 = pos
            y1 = min_y - 10
            x2 = pos - (max_y - min_y + 20) * math.tan(angle)
            y2 = max_y + 10

            line = [(x1, y1), (x2, y2)]
            clipped = clip(line, self.outline)
            self.polylines.extend(clipped['true'])

            pos += step

    def _generate_fins(self):
        """Generate all fish fins."""
        p = self.params

        if p['has_dorsal']:
            self._generate_dorsal_fin()

        if p['has_pectoral']:
            self._generate_pectoral_fin()

        if p['has_pelvic']:
            self._generate_pelvic_fin()

        if p['has_anal']:
            self._generate_anal_fin()

        if p['has_tail']:
            self._generate_tail()

    def _generate_dorsal_fin(self):
        """Generate dorsal (top) fin."""
        p = self.params
        start_t = p['dorsal_start']
        end_t = p['dorsal_end']
        height = p['dorsal_height']

        # Find points on top curve for fin attachment
        n_top = len(self.curve_top)
        start_idx = int(start_t * n_top)
        end_idx = int(end_t * n_top)

        if start_idx >= end_idx:
            return

        # Base of fin follows body curve
        base = self.curve_top[start_idx:end_idx + 1]

        # Generate fin outline
        fin_outline = []

        # Start from body
        fin_outline.append(base[0])

        # Create fin edge with some variation
        for i, pt in enumerate(base):
            t = i / len(base)
            # Fin profile: starts low, rises, then drops
            profile = math.sin(t * PI) ** 0.5
            h = height * profile * (0.8 + 0.4 * self.noise.noise(t * 3, 0))

            fin_outline.append((pt[0], pt[1] + h))

        # Close back to body
        fin_outline.append(base[-1])

        self.polylines.append(fin_outline)

        # Add fin rays/texture
        if p['dorsal_texture']:
            num_rays = max(3, len(base) // 3)
            for i in range(num_rays):
                t = (i + 0.5) / num_rays
                idx = int(t * (len(base) - 1))
                base_pt = base[min(idx, len(base) - 1)]
                top_pt = fin_outline[min(idx + 1, len(fin_outline) - 2)]

                ray = [base_pt, top_pt]
                self.polylines.append(ray)

    def _generate_pectoral_fin(self):
        """Generate pectoral (side) fin."""
        p = self.params
        pos_t = p['pectoral_start']
        length = p['pectoral_length']
        angle = p['pectoral_angle']

        # Find attachment point on body
        n = len(self.curve_bottom)
        idx = int(pos_t * n)
        attach_pt = self.curve_bottom[min(idx, n - 1)]

        # Generate fin shape
        fin = self._generate_fin_shape(attach_pt, length, angle, 0.6)
        self.polylines.append(fin)

    def _generate_pelvic_fin(self):
        """Generate pelvic fin."""
        p = self.params
        pos_t = p['pelvic_start']
        length = p['pelvic_length']

        n = len(self.curve_bottom)
        idx = int(pos_t * n)
        attach_pt = self.curve_bottom[min(idx, n - 1)]

        fin = self._generate_fin_shape(attach_pt, length, -0.5, 0.4)
        self.polylines.append(fin)

    def _generate_anal_fin(self):
        """Generate anal fin (bottom rear)."""
        p = self.params
        start_t = p['anal_start']
        end_t = p['anal_end']
        height = p['anal_height']

        n = len(self.curve_bottom)
        start_idx = int(start_t * n)
        end_idx = int(end_t * n)

        if start_idx >= end_idx:
            return

        base = self.curve_bottom[start_idx:end_idx + 1]

        fin_outline = [base[0]]

        for i, pt in enumerate(base):
            t = i / len(base)
            profile = math.sin(t * PI) ** 0.7
            h = height * profile

            fin_outline.append((pt[0], pt[1] - h))

        fin_outline.append(base[-1])
        self.polylines.append(fin_outline)

    def _generate_tail(self):
        """Generate tail fin."""
        p = self.params
        tail_type = p['tail_type']
        length = p['tail_length']
        spread = p['tail_spread']

        # Tail attaches at the back of the body
        top_pt = self.curve_top[-1]
        bottom_pt = self.curve_bottom[-1]
        center_y = (top_pt[1] + bottom_pt[1]) / 2
        back_x = top_pt[0]

        if tail_type == 0:
            # Forked tail
            self._generate_forked_tail(back_x, center_y, top_pt[1], bottom_pt[1],
                                       length, spread)
        elif tail_type == 1:
            # Rounded tail
            self._generate_rounded_tail(back_x, center_y, top_pt[1], bottom_pt[1],
                                        length)
        else:
            # Pointed tail
            self._generate_pointed_tail(back_x, center_y, top_pt[1], bottom_pt[1],
                                        length)

    def _generate_forked_tail(self, x: float, cy: float, y_top: float, y_bottom: float,
                              length: float, spread: float):
        """Generate a forked tail fin."""
        # Upper fork
        upper = [
            (x, y_top),
            (x + length * 0.3, y_top + (y_top - cy) * spread * 0.3),
            (x + length * 0.7, y_top + (y_top - cy) * spread * 0.6),
            (x + length, y_top + (y_top - cy) * spread),
        ]

        # Lower fork
        lower = [
            (x, y_bottom),
            (x + length * 0.3, y_bottom + (y_bottom - cy) * spread * 0.3),
            (x + length * 0.7, y_bottom + (y_bottom - cy) * spread * 0.6),
            (x + length, y_bottom + (y_bottom - cy) * spread),
        ]

        # Center notch
        center = [(x + length * 0.4, cy)]

        # Smooth the curves
        upper_smooth = catmull_rom_spline(upper, 8)
        lower_smooth = catmull_rom_spline(lower, 8)

        # Build tail outline
        tail = upper_smooth + list(reversed(center)) + list(reversed(lower_smooth))
        self.polylines.append(tail)

        # Add tail rays
        num_rays = 5
        for i in range(num_rays):
            t = (i + 0.5) / num_rays
            start_y = lerp(y_top, y_bottom, t)
            end_y = lerp(y_top + (y_top - cy) * spread,
                         y_bottom + (y_bottom - cy) * spread, t)
            ray = [(x, start_y), (x + length * 0.9, end_y)]
            self.polylines.append(ray)

    def _generate_rounded_tail(self, x: float, cy: float, y_top: float, y_bottom: float,
                               length: float):
        """Generate a rounded tail fin."""
        points = []
        segments = 16

        for i in range(segments + 1):
            t = i / segments
            angle = -PI / 2 + t * PI  # From top to bottom
            px = x + length * math.cos(angle) * 0.5 + length * 0.5
            py = cy + (y_top - y_bottom) * 0.5 * math.sin(angle)
            points.append((px, py))

        tail = [(x, y_top)] + points + [(x, y_bottom)]
        self.polylines.append(tail)

    def _generate_pointed_tail(self, x: float, cy: float, y_top: float, y_bottom: float,
                               length: float):
        """Generate a pointed tail fin."""
        tail = [
            (x, y_top),
            (x + length, cy),
            (x, y_bottom)
        ]
        smooth = catmull_rom_spline(tail, 8)
        self.polylines.append(smooth)

    def _generate_fin_shape(self, attach: Point, length: float, angle: float,
                            width_ratio: float) -> Polyline:
        """Generate a generic fin shape."""
        cx, cy = attach
        end_x = cx + length * math.cos(angle)
        end_y = cy + length * math.sin(angle)

        # Perpendicular direction for width
        perp_angle = angle + PI / 2
        half_width = length * width_ratio * 0.5

        # Create fin outline
        fin = [
            (cx, cy),
            (cx + half_width * 0.3 * math.cos(perp_angle),
             cy + half_width * 0.3 * math.sin(perp_angle)),
            (end_x + half_width * math.cos(perp_angle),
             end_y + half_width * math.sin(perp_angle)),
            (end_x, end_y),
            (end_x - half_width * math.cos(perp_angle),
             end_y - half_width * math.sin(perp_angle)),
            (cx - half_width * 0.3 * math.cos(perp_angle),
             cy - half_width * 0.3 * math.sin(perp_angle)),
            (cx, cy)
        ]

        return catmull_rom_spline(fin, 6)

    def _generate_head(self):
        """Generate fish head features (eye, mouth)."""
        p = self.params

        # Find head region (front of body)
        head_x = self.curve_top[0][0]
        center_y = (self.curve_top[0][1] + self.curve_bottom[0][1]) / 2

        # Eye
        eye_offset_x = p['body_length'] * p['eye_pos']
        eye_x = head_x + eye_offset_x
        eye_y = center_y + p['body_height'] * 0.2
        eye_size = p['eye_size']

        # Eye outline
        eye = circle_points(eye_x, eye_y, eye_size, 16)
        self.polylines.append(eye)

        # Pupil
        pupil = circle_points(eye_x + eye_size * 0.15, eye_y, eye_size * 0.5, 12)
        self.polylines.append(pupil)

        # Mouth
        mouth_y = center_y - p['body_height'] * 0.1
        mouth_length = p['body_length'] * p['mouth_size']
        mouth_open = p['mouth_open']

        if mouth_open > 0.1:
            # Open mouth
            mouth_top = [
                (head_x - 5, mouth_y + mouth_open * 10),
                (head_x + mouth_length * 0.5, mouth_y + mouth_open * 5),
            ]
            mouth_bottom = [
                (head_x - 5, mouth_y - mouth_open * 10),
                (head_x + mouth_length * 0.5, mouth_y - mouth_open * 5),
            ]
            self.polylines.append(mouth_top)
            self.polylines.append(mouth_bottom)
        else:
            # Closed mouth line
            mouth = [
                (head_x - 5, mouth_y),
                (head_x + mouth_length, mouth_y + 2)
            ]
            self.polylines.append(mouth)

        # Gill line
        gill_x = head_x + p['body_length'] * 0.15
        gill_top_y = center_y + p['body_height'] * 0.6
        gill_bottom_y = center_y - p['body_height'] * 0.4
        gill = [(gill_x, gill_top_y), (gill_x + 5, center_y), (gill_x, gill_bottom_y)]
        gill_smooth = catmull_rom_spline(gill, 6)
        self.polylines.append(gill_smooth)


def fish(params: Optional[Dict[str, Any]] = None,
         seed: Optional[Any] = None) -> List[Polyline]:
    """
    Generate a procedural fish drawing.

    Args:
        params: Optional fish parameters dict. If None, generates random params.
        seed: Optional seed for random generation (string or int).

    Returns:
        List of polylines representing the fish drawing.
    """
    if params is None:
        params = generate_params(seed)

    # Determine seed for generator
    if seed is not None:
        if isinstance(seed, str):
            gen_seed = seed_from_string(seed)
        else:
            gen_seed = int(seed)
    else:
        gen_seed = None

    generator = FishGenerator(params, gen_seed)
    polylines = generator.generate()

    # Center the fish
    all_points = [pt for poly in polylines for pt in poly]
    if all_points:
        bbox = get_bbox(all_points)
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2

        centered = []
        for poly in polylines:
            centered.append([(p[0] - cx, p[1] - cy) for p in poly])
        polylines = centered

    return polylines
