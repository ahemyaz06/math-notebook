"""The few OpenCV image steps pdf_inspector uses, written with NumPy so the app can ship without OpenCV.

Each function gives exactly what the OpenCV call it replaces gives (test_image_ops.py compares them
pixel by pixel). The morphology steps work on black-and-white images (0 or 255), which is all
pdf_inspector passes them, so they work on runs: stretches of white pixels along a row.
"""
from __future__ import annotations

import numpy as np


def rgb_to_gray(rgb):
    """cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY) for an 8-bit image: OpenCV 5's rounded 15-bit weights
    (checked equal for all 16.7 million colours)."""
    rgb = np.asarray(rgb)
    total = rgb[..., 0] * np.uint32(9798)
    total += rgb[..., 1] * np.uint32(19235)
    total += rgb[..., 2] * np.uint32(3735)
    total += 16384
    total >>= 15
    return total.astype(np.uint8)


def _runs(on):
    """Every run of True along the rows: row, first column, column after the last; in reading order."""
    h, w = on.shape
    padded = np.zeros((h, w + 2), dtype=np.int8)
    padded[:, 1:-1] = on
    # Along a row, the changes alternate: a run's start, then the column after its end.
    change = np.flatnonzero(padded[:, 1:] != padded[:, :-1])
    rows, columns = np.divmod(change, w + 1)
    return rows[::2], columns[::2], columns[1::2]


def _paint(out, rows, first, last, transposed=False):
    """Make columns first to last (both included) white on each given row of out (0/255).
    Only the painted pixels are touched: an opening keeps few runs, so this beats a full pass."""
    lengths = last - first + 1
    run = np.repeat(np.arange(len(rows)), lengths)
    column = first[run] + (np.arange(len(run)) - np.repeat(np.cumsum(lengths) - lengths, lengths))
    if transposed:
        out[column, rows[run]] = 255
    else:
        out[rows[run], column] = 255
    return out


# OpenCV's anchor is the kernel's middle (length // 2) and, for both erosion and dilation, a
# pixel's window runs from `before = anchor` pixels back to `after = length - 1 - anchor` on.
# Outside the image, erosion ignores pixels and dilation sees them as black.

def _open_rows(on, length, out, transposed=False):
    rows, starts, stops = _runs(on)
    w = on.shape[1]
    before, after = length // 2, length - 1 - length // 2
    last = stops - 1
    # The pixels erosion keeps: those whose whole window (inside the image) is in the run.
    low = np.where(starts > 0, starts + before, 0)
    high = np.where(last < w - 1, last - after, w - 1)
    keep = low <= high
    # Dilation grows them back by the window, the other way round.
    return _paint(out, rows[keep], np.maximum(0, low[keep] - after), np.minimum(w - 1, high[keep] + before), transposed)


def open_line(image, length, horizontal):
    """cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel) for a kernel of ones that is one line:
    np.ones((1, length)) when horizontal, np.ones((length, 1)) when not."""
    on = np.asarray(image) != 0
    out = np.zeros(on.shape, dtype=np.uint8)
    if horizontal:
        return _open_rows(on, length, out)
    return _open_rows(np.ascontiguousarray(on.T), length, out, transposed=True)  # columns as rows


def _dilate_shift(on, axis, length):
    # A pixel is white when any pixel of its window is: the image shifted by each offset, combined.
    before, after = length // 2, length - 1 - length // 2
    out = on.copy()
    n = on.shape[axis]
    for d in range(-before, after + 1):
        if d == 0 or abs(d) >= n:
            continue
        src = [slice(None)] * on.ndim
        dst = [slice(None)] * on.ndim
        src[axis], dst[axis] = (slice(d, None), slice(0, n - d)) if d > 0 else (slice(0, n + d), slice(-d, None))
        out[tuple(dst)] |= on[tuple(src)]
    return out


def dilate_square(image, size):
    """cv2.dilate(image, np.ones((size, size), np.uint8)): a square of ones is a row then a column."""
    on = np.asarray(image) != 0
    return _dilate_shift(_dilate_shift(on, 1, size), 0, size).astype(np.uint8) * 255


def connected_components_with_stats(image):
    """cv2.connectedComponentsWithStats(image) (8-connectivity): count, labels, stats.

    stats has OpenCV's columns (left, top, width, height, area), row 0 being the background.
    Components are numbered the way OpenCV numbers them (see below).
    """
    on = np.asarray(image) != 0
    h, w = on.shape
    labels = np.zeros((h, w), dtype=np.int32)
    rows, starts, stops = _runs(on)
    if not len(rows):
        return 1, labels, np.array([[0, 0, w, h, h * w]], dtype=np.int32)
    # Runs on neighbouring rows touch (diagonals included) when they overlap after widening by one.
    width = w + 2
    start_key = rows.astype(np.int64) * width + starts
    stop_key = rows.astype(np.int64) * width + stops
    above = rows - 1
    first = np.searchsorted(stop_key, above * width + starts, side='left')
    last = np.searchsorted(start_key, above * width + stops, side='right') - 1
    parent = list(range(len(rows)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for run in np.nonzero((above >= 0) & (first <= last))[0].tolist():
        for other in range(int(first[run]), int(last[run]) + 1):
            if rows[other] != above[run]:
                continue
            a, b = root(run), root(other)
            if a != b:
                parent[max(a, b)] = min(a, b)
    roots = np.array([root(i) for i in range(len(rows))])
    first_runs, component = np.unique(roots, return_inverse=True)
    # OpenCV scans 2x2 blocks (two rows at a time) and numbers components in the order the scan
    # first meets them. Two components never share a block, since a block's pixels all touch.
    block = (rows // 2).astype(np.int64) * w + starts // 2
    first_block = np.full(len(first_runs), np.iinfo(np.int64).max)
    np.minimum.at(first_block, component, block)
    number = np.empty(len(first_runs), dtype=np.int64)
    number[np.argsort(first_block)] = np.arange(1, len(first_runs) + 1)
    run_label = number[component]
    count = len(first_runs) + 1
    lengths = stops - starts
    stats = np.zeros((count, 5), dtype=np.int64)
    left = np.full(count, w); top = np.full(count, h); right = np.zeros(count, dtype=np.int64); bottom = np.zeros(count, dtype=np.int64)
    np.minimum.at(left, run_label, starts)
    np.minimum.at(top, run_label, rows)
    np.maximum.at(right, run_label, stops)
    np.maximum.at(bottom, run_label, rows + 1)
    np.add.at(stats[:, 4], run_label, lengths)
    stats[:, 0], stats[:, 1], stats[:, 2], stats[:, 3] = left, top, right - left, bottom - top
    # Paint each run's label into the label image.
    pixel_run = np.repeat(np.arange(len(rows)), lengths)
    offset = np.arange(len(pixel_run)) - np.repeat(np.cumsum(lengths) - lengths, lengths)
    labels[rows[pixel_run], starts[pixel_run] + offset] = run_label[pixel_run]
    background = ~on
    cols, lines = np.nonzero(background.any(axis=0))[0], np.nonzero(background.any(axis=1))[0]
    stats[0] = [cols[0], lines[0], cols[-1] - cols[0] + 1, lines[-1] - lines[0] + 1, h * w - lengths.sum()] if len(cols) else [-1, 2147483647, 0, 0, 0]  # OpenCV's values when there is no background
    return count, labels, stats.astype(np.int32)
