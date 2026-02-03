# Skeleton Tracing - Extract centerlines from binary images
# Ported from https://github.com/LingDong-/skeleton-tracing

import numpy as np
from typing import List, Tuple, Optional

Polyline = List[Tuple[float, float]]

HORIZONTAL = 1
VERTICAL = 2


def thinning_zs_iteration(im: np.ndarray, iteration: int) -> np.ndarray:
    """
    Single pass of Zhang-Suen thinning algorithm.

    Args:
        im: Binary image (0 or 1)
        iteration: 0 for first pass, 1 for second pass

    Returns:
        Thinned image
    """
    marker = np.zeros(im.shape, dtype=np.uint8)
    rows, cols = im.shape

    for i in range(1, rows - 1):
        for j in range(1, cols - 1):
            if im[i, j] == 0:
                continue

            # Get 8-connected neighbors
            p2 = im[i - 1, j]
            p3 = im[i - 1, j + 1]
            p4 = im[i, j + 1]
            p5 = im[i + 1, j + 1]
            p6 = im[i + 1, j]
            p7 = im[i + 1, j - 1]
            p8 = im[i, j - 1]
            p9 = im[i - 1, j - 1]

            # Count 0->1 transitions in clockwise order
            A = int(
                (p2 == 0 and p3 == 1) +
                (p3 == 0 and p4 == 1) +
                (p4 == 0 and p5 == 1) +
                (p5 == 0 and p6 == 1) +
                (p6 == 0 and p7 == 1) +
                (p7 == 0 and p8 == 1) +
                (p8 == 0 and p9 == 1) +
                (p9 == 0 and p2 == 1)
            )

            # Count neighbor pixels
            B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9

            # Phase-dependent conditions
            if iteration == 0:
                m1 = p2 * p4 * p6
                m2 = p4 * p6 * p8
            else:
                m1 = p2 * p4 * p8
                m2 = p2 * p6 * p8

            if A == 1 and 2 <= B <= 6 and m1 == 0 and m2 == 0:
                marker[i, j] = 1

    return im & ~marker


def thinning_zs(im: np.ndarray) -> np.ndarray:
    """
    Zhang-Suen binary image thinning algorithm.

    Reduces binary image to single-pixel wide skeleton.

    Args:
        im: Binary image (0 or 1)

    Returns:
        Skeletonized image
    """
    im = im.copy().astype(np.uint8)
    prev = np.zeros(im.shape, dtype=np.uint8)

    while True:
        im = thinning_zs_iteration(im, 0)
        im = thinning_zs_iteration(im, 1)
        diff = np.sum(np.abs(prev.astype(np.int32) - im.astype(np.int32)))
        if diff == 0:
            break
        prev = im.copy()

    return im


def thinning(im: np.ndarray) -> np.ndarray:
    """
    Skeletonize a binary image.

    Tries to use scikit-image's skeletonize if available,
    falls back to Zhang-Suen implementation.

    Args:
        im: Binary image (0 or 1, or 0 or 255)

    Returns:
        Skeletonized binary image (0 or 1)
    """
    # Ensure binary
    binary = (im > 0).astype(np.uint8)

    try:
        from skimage.morphology import skeletonize
        return skeletonize(binary).astype(np.uint8)
    except ImportError:
        return thinning_zs(binary)


def _not_empty(im: np.ndarray, x: int, y: int, w: int, h: int) -> bool:
    """Check if region contains any white pixels."""
    return np.sum(im[y:y + h, x:x + w]) > 0


def _chunk_to_frags(im: np.ndarray, x: int, y: int, w: int, h: int
                    ) -> List[List[List[int]]]:
    """
    Convert a small chunk into polyline fragments by tracing the perimeter.

    Returns list of fragments, where each fragment is [[start], [end]].
    """
    frags = []
    on = False

    li, lj = -1, -1

    # Walk perimeter clockwise
    perimeter_length = 2 * (h + w) - 4
    for k in range(perimeter_length):
        if k < w:
            i, j = y, x + k
        elif k < w + h - 1:
            i, j = y + k - w + 1, x + w - 1
        elif k < w + h + w - 2:
            i, j = y + h - 1, x + w - (k - w - h + 3)
        else:
            i, j = y + h - (k - w - h - w + 4), x

        # Bounds check
        if i < 0 or i >= im.shape[0] or j < 0 or j >= im.shape[1]:
            continue

        if im[i, j]:  # Found white pixel
            if not on:
                on = True
                frags.append([[j, i], [x + w // 2, y + h // 2]])
        else:
            if on:
                # Average the start position with last white pixel
                if frags and lj >= 0:
                    frags[-1][0][0] = (frags[-1][0][0] + lj) // 2
                    frags[-1][0][1] = (frags[-1][0][1] + li) // 2
                on = False

        li, lj = i, j

    # Handle case where perimeter ends while "on"
    if on and frags and lj >= 0:
        frags[-1][0][0] = (frags[-1][0][0] + lj) // 2
        frags[-1][0][1] = (frags[-1][0][1] + li) // 2

    # Post-process fragments
    if len(frags) == 2:
        # Simple line: connect the two endpoints
        frags = [[frags[0][0], frags[1][0]]]
    elif len(frags) > 2:
        # Junction: find brightest 3x3 blob as center
        ms = 0
        mi, mj = y + h // 2, x + w // 2

        for i in range(y + 1, y + h - 1):
            for j in range(x + 1, x + w - 1):
                if i < 1 or i >= im.shape[0] - 1 or j < 1 or j >= im.shape[1] - 1:
                    continue

                # Sum of 3x3 neighborhood
                s = 0
                for di in [-1, 0, 1]:
                    for dj in [-1, 0, 1]:
                        s += im[i + di, j + dj]

                if s > ms:
                    ms = s
                    mi, mj = i, j
                elif s == ms:
                    # Prefer center of chunk
                    if abs(j - (x + w // 2)) + abs(i - (y + h // 2)) < \
                       abs(mj - (x + w // 2)) + abs(mi - (y + h // 2)):
                        mi, mj = i, j

        # Update all fragment endpoints to point to center
        for frag in frags:
            frag[1] = [mj, mi]

    return frags


def _merge_frags(c0: List, c1: List, sx: int, dr: int):
    """Merge fragment pairs across chunk boundaries."""
    for i in range(len(c1) - 1, -1, -1):
        isv = (dr == VERTICAL)
        for mode in [1, 3, 0, 2]:
            if _merge_impl(c0, c1, i, sx, isv, mode):
                break

    c0.extend(c1)


def _merge_impl(c0: List, c1: List, i: int, sx: int, isv: bool, mode: int) -> bool:
    """Attempt to merge a single fragment pair."""
    b0 = (mode >> 1) & 1
    b1 = mode & 1

    p1 = c1[i][0 if b1 else -1]

    # Check if fragment is at the seam
    if abs(p1[1 if isv else 0] - sx) > 0:
        return False

    mj = -1
    md = 4

    for j in range(len(c0)):
        p0 = c0[j][0 if b0 else -1]
        if abs(p0[1 if isv else 0] - sx) > 1:
            continue

        d = abs(p0[0 if isv else 1] - p1[0 if isv else 1])
        if d < md:
            mj, md = j, d

    if mj != -1:
        if b0 and b1:
            c0[mj] = list(reversed(c1[i])) + c0[mj]
        elif not b0 and b1:
            c0[mj] = c0[mj] + c1[i]
        elif b0 and not b1:
            c0[mj] = c1[i] + c0[mj]
        else:
            c0[mj] = c0[mj] + list(reversed(c1[i]))

        c1.pop(i)
        return True

    return False


def _trace_skeleton_recursive(im: np.ndarray, x: int, y: int, w: int, h: int,
                              csize: int, max_iter: int,
                              rects: Optional[List] = None) -> List:
    """
    Recursively trace skeleton into polylines via divide-and-conquer.

    Args:
        im: Binary skeleton image
        x, y: Top-left corner of region
        w, h: Width and height of region
        csize: Minimum chunk size
        max_iter: Maximum recursion depth
        rects: Optional list to store chunk rectangles for debugging

    Returns:
        List of polyline fragments
    """
    frags = []

    if max_iter == 0:
        return frags

    # Base case: chunk is small enough
    if w <= csize and h <= csize:
        frags.extend(_chunk_to_frags(im, x, y, w, h))
        return frags

    # Find optimal seam to split
    ms = im.shape[0] + im.shape[1]  # Minimum seam cost
    mi = -1  # Horizontal seam index
    mj = -1  # Vertical seam index

    # Try horizontal seams
    if h > csize:
        for i in range(y + 3, y + h - 3):
            # Check if seam intersects boundary pixels
            if (i >= im.shape[0] or x >= im.shape[1] or
                x + w - 1 >= im.shape[1]):
                continue

            if (im[i, x] or im[i - 1, x] or
                im[i, min(x + w - 1, im.shape[1] - 1)] or
                im[i - 1, min(x + w - 1, im.shape[1] - 1)]):
                continue

            # Calculate seam cost
            s = 0
            for j in range(x, min(x + w, im.shape[1])):
                if i < im.shape[0] and j < im.shape[1]:
                    s += im[i, j] + im[i - 1, j]

            if s < ms:
                ms = s
                mi = i
            elif s == ms and abs(i - (y + h // 2)) < abs(mi - (y + h // 2)):
                mi = i

    # Try vertical seams
    if w > csize:
        for j in range(x + 3, x + w - 2):
            if (j >= im.shape[1] or y >= im.shape[0] or
                y + h - 1 >= im.shape[0]):
                continue

            if (im[y, j] or im[min(y + h - 1, im.shape[0] - 1), j] or
                im[y, j - 1] or im[min(y + h - 1, im.shape[0] - 1), j - 1]):
                continue

            s = 0
            for i in range(y, min(y + h, im.shape[0])):
                if i < im.shape[0] and j < im.shape[1]:
                    s += im[i, j] + im[i, j - 1]

            if s < ms:
                ms = s
                mi = -1
                mj = j
            elif s == ms and abs(j - (x + w // 2)) < abs(mj - (x + w // 2)):
                mj = j

    nf = []

    # Split horizontally
    if h > csize and mi != -1:
        l_rect = [x, y, w, mi - y]
        r_rect = [x, mi, w, y + h - mi]

        if _not_empty(im, l_rect[0], l_rect[1], l_rect[2], l_rect[3]):
            if rects is not None:
                rects.append(l_rect)
            nf.extend(_trace_skeleton_recursive(
                im, l_rect[0], l_rect[1], l_rect[2], l_rect[3],
                csize, max_iter - 1, rects
            ))

        if _not_empty(im, r_rect[0], r_rect[1], r_rect[2], r_rect[3]):
            if rects is not None:
                rects.append(r_rect)
            r_frags = _trace_skeleton_recursive(
                im, r_rect[0], r_rect[1], r_rect[2], r_rect[3],
                csize, max_iter - 1, rects
            )
            _merge_frags(nf, r_frags, mi, VERTICAL)

    # Split vertically
    elif w > csize and mj != -1:
        l_rect = [x, y, mj - x, h]
        r_rect = [mj, y, x + w - mj, h]

        if _not_empty(im, l_rect[0], l_rect[1], l_rect[2], l_rect[3]):
            if rects is not None:
                rects.append(l_rect)
            nf.extend(_trace_skeleton_recursive(
                im, l_rect[0], l_rect[1], l_rect[2], l_rect[3],
                csize, max_iter - 1, rects
            ))

        if _not_empty(im, r_rect[0], r_rect[1], r_rect[2], r_rect[3]):
            if rects is not None:
                rects.append(r_rect)
            r_frags = _trace_skeleton_recursive(
                im, r_rect[0], r_rect[1], r_rect[2], r_rect[3],
                csize, max_iter - 1, rects
            )
            _merge_frags(nf, r_frags, mj, HORIZONTAL)

    frags.extend(nf)

    # Fallback when no good seam found
    if mi == -1 and mj == -1:
        frags.extend(_chunk_to_frags(im, x, y, w, h))

    return frags


def trace_skeleton(im: np.ndarray, offset_x: float = 0, offset_y: float = 0,
                   chunk_size: int = 10, max_iterations: int = 999,
                   do_thinning: bool = True) -> List[Polyline]:
    """
    Extract polylines from a binary or grayscale image by skeleton tracing.

    This function first thins the image to a single-pixel skeleton,
    then traces the skeleton into polylines.

    Args:
        im: Input image (grayscale or binary, 0-255)
        offset_x: X offset for output coordinates
        offset_y: Y offset for output coordinates
        chunk_size: Minimum chunk size for divide-and-conquer
        max_iterations: Maximum recursion depth
        do_thinning: Whether to apply thinning (set False if already skeletonized)

    Returns:
        List of polylines representing the skeleton
    """
    # Convert to binary
    if im.max() > 1:
        binary = (im < 128).astype(np.uint8)  # Dark pixels become 1
    else:
        binary = im.astype(np.uint8)

    # Apply thinning to get skeleton
    if do_thinning:
        skeleton = thinning(binary)
    else:
        skeleton = binary

    # Trace skeleton
    height, width = skeleton.shape
    frags = _trace_skeleton_recursive(
        skeleton, 0, 0, width, height,
        chunk_size, max_iterations, None
    )

    # Convert fragments to polylines with offset
    polylines = []
    for frag in frags:
        if len(frag) >= 2:
            polyline = []
            for point in frag:
                x, y = point
                # Flip Y coordinate
                polyline.append((x + offset_x, (height - y) + offset_y))
            polylines.append(polyline)

    return polylines
