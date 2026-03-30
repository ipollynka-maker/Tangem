import sys, os, json, importlib.util
import numpy as np
import pytest

# motion-analyzer.py uses a hyphen — not importable via normal 'import'.
# Load it explicitly so tests can call its functions directly.
_spec = importlib.util.spec_from_file_location(
    "motion_analyzer",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "motion-analyzer.py"),
)
motion_analyzer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(motion_analyzer)

def test_detect_easing_linear():
    detect_easing = motion_analyzer.detect_easing
    path = [i / 10.0 for i in range(11)]
    assert detect_easing(path) == 'linear'

def test_detect_easing_spring_overshoot():
    detect_easing = motion_analyzer.detect_easing
    path = [0, 0.3, 0.7, 1.1, 1.05, 0.98, 1.0]
    assert detect_easing(path) == 'spring_overshoot'

def test_detect_easing_ease_out():
    detect_easing = motion_analyzer.detect_easing
    path = [0, 0.6, 0.85, 0.95, 0.98, 1.0]
    assert detect_easing(path) == 'ease_out'

def test_detect_easing_ease_in():
    detect_easing = motion_analyzer.detect_easing
    path = [0, 0.02, 0.05, 0.15, 0.4, 1.0]
    assert detect_easing(path) == 'ease_in'

def test_analyze_returns_expected_shape():
    """Creates a synthetic frame sequence and checks output schema."""
    analyze_frames = motion_analyzer.analyze_frames

    # 20 frames, 30fps, single white rectangle moving downward
    frames = []
    fps = 30.0
    for i in range(20):
        frame = np.zeros((100, 100), dtype=np.uint8)
        y = 10 + i * 3
        frame[y:y+10, 40:60] = 255
        frames.append(frame)

    result = analyze_frames(frames, fps)

    assert 'fps' in result
    assert 'duration' in result
    assert 'elements' in result
    assert result['fps'] == 30.0
    assert abs(result['duration'] - 20/30.0) < 0.01
    # Should detect at least one moving element
    assert len(result['elements']) >= 1
    assert 'easing_hint' in result['elements'][0]
    assert result['elements'][0]['easing_hint'] == 'linear', \
        f"Expected linear for uniform motion, got: {result['elements'][0]['easing_hint']}"
