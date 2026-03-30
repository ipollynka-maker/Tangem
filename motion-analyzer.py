#!/usr/bin/env python3
"""
motion-analyzer.py — Analyze GIF/MP4 for motion curves.

Usage:
  python motion-analyzer.py <input_file> [output.json]

Output JSON shape:
  { fps, duration, frame_count, elements: [{ id, path, easing_hint }] }
"""
import sys
import json
import numpy as np
from pathlib import Path


def load_frames(path: str) -> tuple:
    """Returns (frames: list[np.ndarray gray], fps: float)."""
    p = Path(path)
    if p.suffix.lower() == '.gif':
        return _load_gif_frames(path)
    return _load_video_frames(path)


def _load_gif_frames(path: str) -> tuple:
    from PIL import Image
    frames, durations = [], []
    with Image.open(path) as img:
        try:
            while True:
                frames.append(np.array(img.convert('L')))
                durations.append(img.info.get('duration', 100))
                img.seek(img.tell() + 1)
        except EOFError:
            pass
    avg_ms = sum(durations) / len(durations) if durations else 100
    return frames, round(1000.0 / avg_ms, 2)


def _load_video_frames(path: str) -> tuple:
    import cv2
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY))
    cap.release()
    return frames, fps


def detect_moving_regions(frames: list) -> list:
    """Track centroids of moving regions. Returns [{ id, path: [[frame,cx,cy], ...] }]."""
    import cv2
    if len(frames) < 2:
        return []
    h, w = frames[0].shape
    regions = []
    kernel = np.ones((5, 5), np.uint8)

    for i in range(1, len(frames)):
        diff = cv2.absdiff(frames[i - 1], frames[i])
        _, thresh = cv2.threshold(diff, 20, 255, cv2.THRESH_BINARY)
        thresh = cv2.dilate(thresh, kernel, iterations=2)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for c in contours:
            if cv2.contourArea(c) < 100:
                continue
            M = cv2.moments(c)
            if M['m00'] == 0:
                continue
            cx = M['m10'] / M['m00'] / w
            cy = M['m01'] / M['m00'] / h

            matched = False
            for r in regions:
                last = r['path'][-1]
                if abs(last[1] - cx) < 0.15 and abs(last[2] - cy) < 0.15:
                    r['path'].append([i, round(cx, 4), round(cy, 4)])
                    matched = True
                    break
            if not matched:
                regions.append({
                    'id': f'region_{len(regions)}',
                    'path': [[i, round(cx, 4), round(cy, 4)]],
                })

    return [r for r in regions if len(r['path']) >= 3]


def detect_easing(path_1d: list) -> str:
    """
    Classify a normalized position sequence (start≈0, end≈1) into an easing hint.
    """
    if len(path_1d) < 3:
        return 'linear'
    arr = np.array(path_1d, dtype=float)

    if np.any(arr > 1.05) or np.any(arr < -0.05):
        return 'spring_overshoot'

    velocity = np.abs(np.diff(arr))
    if velocity.sum() < 1e-6:
        return 'linear'

    # Uniform velocity — all steps equal within tolerance
    if np.std(velocity) / (velocity.mean() + 1e-9) < 0.1:
        return 'linear'

    peak_idx = int(np.argmax(velocity))
    rel_peak = peak_idx / max(len(velocity) - 1, 1)

    if rel_peak < 0.35:
        return 'ease_out'
    if rel_peak > 0.65:
        return 'ease_in'
    return 'ease_in_out'


def analyze_frames(frames: list, fps: float) -> dict:
    """Core analysis — separated from file I/O so tests can call it directly."""
    duration = len(frames) / fps
    regions = detect_moving_regions(frames)

    elements = []
    for r in regions:
        y_vals = [pt[2] for pt in r['path']]
        mn, mx = min(y_vals), max(y_vals)
        if mx - mn < 0.01:
            continue
        normalized = [(v - mn) / (mx - mn) for v in y_vals]
        elements.append({
            'id': r['id'],
            'path': r['path'],
            'easing_hint': detect_easing(normalized),
        })

    return {
        'fps': fps,
        'duration': round(duration, 3),
        'frame_count': len(frames),
        'elements': elements,
    }


def analyze(input_path: str) -> dict:
    frames, fps = load_frames(input_path)
    return analyze_frames(frames, fps)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python motion-analyzer.py <input> [output.json]')
        sys.exit(1)
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'refs/motion-data.json'
    result = analyze(input_path)
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)
    print(f'Written to {output_path}: {len(result["elements"])} element(s), {result["duration"]}s @ {result["fps"]}fps')
