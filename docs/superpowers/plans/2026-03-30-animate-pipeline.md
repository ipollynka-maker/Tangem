# Animation Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/animate` Claude Code skill that converts a GIF/video reference + text description into Lottie JSON, AE ExtendScript, and Remotion component outputs with a rendered MP4 preview.

**Architecture:** A Python pre-analysis script extracts motion curves from GIF/MP4 files. Claude reads those curves plus a text description to generate an Animation Spec JSON (the source of truth). Four Node.js compilers translate the spec into Lottie JSON (primary), Remotion TSX, AE ExtendScript, and CSS. Remotion renders the preview MP4.

**Tech Stack:** Remotion 4.x, React 19, TypeScript strict, Python 3 + OpenCV + Pillow, Node.js `node:test`, pytest

---

## File Map

| File | Role |
|---|---|
| `src/animations/types.ts` | TypeScript types for AnimationSpec (used by generated components) |
| `src/animations/registry.ts` | Auto-generated list of all animations; Root.tsx imports this |
| `src/Root.tsx` | Updated to register compositions from registry |
| `motion-analyzer.py` | Python: reads GIF/MP4, outputs `refs/motion-data.json` |
| `tests/test_motion_analyzer.py` | pytest tests for motion-analyzer |
| `.claude/skills/animate/spec-to-lottie.js` | Compiler: AnimationSpec → Lottie JSON |
| `.claude/skills/animate/spec-to-remotion.js` | Compiler: AnimationSpec → Remotion TSX string |
| `.claude/skills/animate/spec-to-ae.js` | Compiler: AnimationSpec → AE ExtendScript string |
| `.claude/skills/animate/spec-to-css.js` | Compiler: AnimationSpec → CSS @keyframes string |
| `.claude/skills/animate/compile.js` | CLI runner: reads spec JSON, calls compilers, writes output files |
| `.claude/skills/animate/skill.md` | The Claude Code skill definition |
| `tests/compilers.test.js` | Node `node:test` tests for all four compilers |

**Directories to create:** `refs/`, `specs/`, `animations/`, `ae-scripts/`, `src/animations/`, `.claude/skills/animate/`, `tests/`

---

## Task 1: Scaffold Directories and Install Dependencies

**Files:**
- Modify: `package.json`
- Create: `refs/.gitkeep`, `specs/.gitkeep`, `animations/.gitkeep`, `ae-scripts/.gitkeep`

- [ ] **Step 1: Create directories**

```bash
mkdir -p refs specs animations ae-scripts src/animations .claude/skills/animate tests
touch refs/.gitkeep specs/.gitkeep animations/.gitkeep ae-scripts/.gitkeep
```

- [ ] **Step 2: Install @remotion/lottie**

```bash
npm install @remotion/lottie
```

Expected: `added 1 package` (or similar). Check `package.json` now lists `"@remotion/lottie"`.

- [ ] **Step 3: Verify install**

```bash
node -e "require('@remotion/lottie'); console.log('ok')" 2>/dev/null || echo "ESM only - ok"
cat package.json | grep lottie
```

Expected: `"@remotion/lottie"` appears in dependencies.

- [ ] **Step 4: Commit**

```bash
git add refs/.gitkeep specs/.gitkeep animations/.gitkeep ae-scripts/.gitkeep package.json package-lock.json
git commit -m "chore: scaffold pipeline directories, add @remotion/lottie"
```

---

## Task 2: AnimationSpec TypeScript Types

**Files:**
- Create: `src/animations/types.ts`

These types are imported by all generated Remotion components and can be used to validate specs at runtime.

- [ ] **Step 1: Write the types file**

```typescript
// src/animations/types.ts

export type EasingHint =
  | 'spring_overshoot'
  | 'bounce'
  | 'ease_in_out'
  | 'ease_in'
  | 'ease_out'
  | 'linear'
  | 'custom';

export type AnimationProperty =
  | 'translateX' | 'translateY' | 'translateZ'
  | 'scale' | 'scaleX' | 'scaleY'
  | 'rotate' | 'rotateX' | 'rotateY' | 'rotateZ'
  | 'opacity';

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
}

export interface AnimationLayer {
  id: string;
  property: AnimationProperty;
  from: number;
  to: number;
  to_final?: number;
  start_at?: number;          // delay in seconds before this layer animates
  easing: EasingHint;
  spring?: SpringConfig;
  render_compatible: boolean; // false = Rive/GSAP/CSS-only, skip Remotion render
  lottie_compatible: boolean;
}

export interface AnimationSpec {
  name: string;
  duration: number;           // total duration in seconds
  fps: number;
  lottie_compatible: boolean; // true if ALL layers are lottie_compatible
  assets: Record<string, string>; // layerId → path relative to public/
  layers: AnimationLayer[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/animations/types.ts
git commit -m "feat: add AnimationSpec TypeScript types"
```

---

## Task 3: motion-analyzer.py

**Files:**
- Create: `motion-analyzer.py`
- Create: `tests/test_motion_analyzer.py`

Reads a GIF or MP4, detects moving regions frame-by-frame, and outputs a `motion-data.json` with position curves and easing hints.

- [ ] **Step 1: Verify Python dependencies are available**

```bash
python3 -c "import cv2; import PIL; import numpy; print('deps ok')"
```

If this fails: `pip install opencv-python Pillow numpy`

- [ ] **Step 2: Write the failing tests first**

```python
# tests/test_motion_analyzer.py
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
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
cd /Users/ll1pa/tangem-animation && python3 -m pytest tests/test_motion_analyzer.py -v 2>&1 | head -20
```

Expected: `ImportError: No module named 'motion_analyzer'`

- [ ] **Step 4: Write motion-analyzer.py**

```python
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
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
python3 -m pytest tests/test_motion_analyzer.py -v
```

Expected:
```
PASSED tests/test_motion_analyzer.py::test_detect_easing_linear
PASSED tests/test_motion_analyzer.py::test_detect_easing_spring_overshoot
PASSED tests/test_motion_analyzer.py::test_detect_easing_ease_out
PASSED tests/test_motion_analyzer.py::test_detect_easing_ease_in
PASSED tests/test_motion_analyzer.py::test_analyze_returns_expected_shape
```

- [ ] **Step 6: Commit**

```bash
git add motion-analyzer.py tests/test_motion_analyzer.py
git commit -m "feat: add motion-analyzer.py with pytest coverage"
```

---

## Task 4: spec-to-lottie.js

**Files:**
- Create: `.claude/skills/animate/spec-to-lottie.js`
- Create (partial): `tests/compilers.test.js`

Translates an AnimationSpec into a Lottie 5.x JSON file. Lottie is the primary output: it plays in After Effects (via Bodymovin), Remotion (`@remotion/lottie`), and web (`lottie-web`).

Lottie uses frame numbers (not seconds), opacity in 0-100 (not 0-1), scale in percentages (100 = normal), and bezier easing per keyframe pair via `i`/`o` control handles.

- [ ] **Step 1: Write the failing test**

```javascript
// tests/compilers.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { specToLottie } = require('../.claude/skills/animate/spec-to-lottie.js');

const SAMPLE_SPEC = {
  name: 'card-enter',
  duration: 1.0,
  fps: 30,
  lottie_compatible: true,
  assets: { card: 'card.png' },
  layers: [
    {
      id: 'card',
      property: 'translateY',
      from: 100,
      to: 0,
      easing: 'spring_overshoot',
      render_compatible: true,
      lottie_compatible: true,
    },
    {
      id: 'shimmer',
      property: 'opacity',
      from: 0,
      to: 1,
      to_final: 0,
      start_at: 0.5,
      easing: 'ease_in_out',
      render_compatible: true,
      lottie_compatible: true,
    },
  ],
};

test('specToLottie: output has correct Lottie v5 envelope', () => {
  const lottie = specToLottie(SAMPLE_SPEC);
  assert.equal(lottie.v, '5.7.4');
  assert.equal(lottie.fr, 30);
  assert.equal(lottie.ip, 0);
  assert.equal(lottie.op, 30); // 1.0s * 30fps
  assert.equal(lottie.nm, 'card-enter');
});

test('specToLottie: skips layers where lottie_compatible is false', () => {
  const spec = { ...SAMPLE_SPEC, layers: [
    { ...SAMPLE_SPEC.layers[0], lottie_compatible: false },
  ]};
  const lottie = specToLottie(spec);
  assert.equal(lottie.layers.length, 0);
});

test('specToLottie: opacity layer uses 0-100 range', () => {
  const spec = { ...SAMPLE_SPEC, assets: {}, layers: [
    { id: 'el', property: 'opacity', from: 0, to: 1, easing: 'ease_in_out',
      render_compatible: true, lottie_compatible: true },
  ]};
  const lottie = specToLottie(spec);
  const opacityLayer = lottie.layers[0];
  const kf = opacityLayer.ks.o.k[0];
  assert.equal(kf.s[0], 0);   // 0 * 100
  assert.equal(kf.e[0], 100); // 1 * 100
});

test('specToLottie: assets array populated from spec.assets', () => {
  const lottie = specToLottie(SAMPLE_SPEC);
  assert.ok(lottie.assets.length >= 1);
  assert.equal(lottie.assets[0].p, 'card.png');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node --test tests/compilers.test.js 2>&1 | head -15
```

Expected: `Error: Cannot find module '../.claude/skills/animate/spec-to-lottie.js'`

- [ ] **Step 3: Write spec-to-lottie.js**

```javascript
// .claude/skills/animate/spec-to-lottie.js
'use strict';

const EASING_PRESETS = {
  spring_overshoot: { i: { x: [0.2], y: [1.3] }, o: { x: [0.4], y: [0.0] } },
  bounce:           { i: { x: [0.2], y: [1.5] }, o: { x: [0.4], y: [0.0] } },
  ease_in_out:      { i: { x: [0.2], y: [1.0] }, o: { x: [0.4], y: [0.0] } },
  ease_in:          { i: { x: [1.0], y: [1.0] }, o: { x: [0.4], y: [0.0] } },
  ease_out:         { i: { x: [0.2], y: [1.0] }, o: { x: [0.0], y: [0.0] } },
  linear:           { i: { x: [1.0], y: [1.0] }, o: { x: [0.0], y: [0.0] } },
};

/**
 * Build an array of Lottie keyframes for a single layer property.
 * Lottie keyframe: { t, s, e, i, o } where s/e are arrays of values.
 */
function buildKeyframes(layer, totalFrames, fps) {
  const startFrame = Math.round((layer.start_at || 0) * fps);
  const ease = EASING_PRESETS[layer.easing] || EASING_PRESETS.ease_in_out;
  const isOpacity = layer.property === 'opacity';
  const scale = isOpacity ? 100 : 1;

  if (layer.to_final !== undefined) {
    const midFrame = Math.round(startFrame + (totalFrames - startFrame) * 0.6);
    return [
      { t: startFrame, s: [layer.from * scale], e: [layer.to * scale],       ...ease },
      { t: midFrame,   s: [layer.to * scale],   e: [layer.to_final * scale],  ...ease },
      { t: totalFrames, s: [layer.to_final * scale] },
    ];
  }
  return [
    { t: startFrame,   s: [layer.from * scale], e: [layer.to * scale], ...ease },
    { t: totalFrames,  s: [layer.to * scale] },
  ];
}

function buildLottieLayer(layer, index, spec) {
  const totalFrames = Math.round(spec.duration * spec.fps);
  const kf = buildKeyframes(layer, totalFrames, spec.fps);
  const ks = {};

  switch (layer.property) {
    case 'translateY': ks.p = { a: 1, k: kf.map(k => ({ ...k,
      s: k.s ? [0, k.s[0], 0] : undefined,
      e: k.e ? [0, k.e[0], 0] : undefined,
    }))}; break;
    case 'translateX': ks.p = { a: 1, k: kf.map(k => ({ ...k,
      s: k.s ? [k.s[0], 0, 0] : undefined,
      e: k.e ? [k.e[0], 0, 0] : undefined,
    }))}; break;
    case 'opacity':    ks.o = { a: 1, k: kf }; break;
    case 'scale':      ks.s = { a: 1, k: kf.map(k => ({ ...k,
      s: k.s ? [k.s[0], k.s[0], 100] : undefined,
      e: k.e ? [k.e[0], k.e[0], 100] : undefined,
    }))}; break;
    case 'rotate':
    case 'rotateZ':    ks.r = { a: 1, k: kf }; break;
    default:           ks.p = { a: 1, k: kf };
  }

  const assetIndex = Object.keys(spec.assets || {}).indexOf(layer.id);
  const layer_ = {
    ddd: 0, ind: index + 1,
    ty: assetIndex >= 0 ? 2 : 4,
    nm: layer.id, ks, ao: 0,
    ip: 0, op: totalFrames, st: 0, bm: 0,
  };
  if (assetIndex >= 0) layer_.refId = `image_${assetIndex}`;
  return layer_;
}

function specToLottie(spec) {
  const totalFrames = Math.round(spec.duration * spec.fps);
  const assets = Object.entries(spec.assets || {}).map(([, path], i) => ({
    id: `image_${i}`, u: '', p: path, e: 0,
  }));
  const layers = spec.layers
    .filter(l => l.lottie_compatible)
    .map((layer, i) => buildLottieLayer(layer, i, spec));

  return {
    v: '5.7.4', fr: spec.fps,
    ip: 0, op: totalFrames,
    w: 1294, h: 720,
    nm: spec.name, ddd: 0,
    assets, layers, markers: [],
  };
}

module.exports = { specToLottie };
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
node --test tests/compilers.test.js 2>&1 | grep -E "pass|fail|ok"
```

Expected: all 4 `spec-to-lottie` tests pass.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/animate/spec-to-lottie.js tests/compilers.test.js
git commit -m "feat: spec-to-lottie compiler with node:test coverage"
```

---

## Task 5: spec-to-remotion.js

**Files:**
- Modify: `tests/compilers.test.js` (append tests)
- Create: `.claude/skills/animate/spec-to-remotion.js`

Generates a `.tsx` file string for a Remotion composition. Uses `spring()` for spring/bounce easings and `interpolate()` with `Easing.*` for all others. Assets are referenced via `staticFile()` which resolves from `public/`.

- [ ] **Step 1: Append tests to compilers.test.js**

Add this block at the end of `tests/compilers.test.js`:

```javascript
const { specToRemotionTsx } = require('../.claude/skills/animate/spec-to-remotion.js');

test('specToRemotionTsx: exports a named function matching spec.name', () => {
  const tsx = specToRemotionTsx(SAMPLE_SPEC);
  assert.ok(tsx.includes('export function CardEnter('), `got: ${tsx.slice(0, 200)}`);
});

test('specToRemotionTsx: uses spring() for spring_overshoot easing', () => {
  const tsx = specToRemotionTsx(SAMPLE_SPEC);
  assert.ok(tsx.includes('spring('), `expected spring(), got: ${tsx.slice(0, 300)}`);
});

test('specToRemotionTsx: uses interpolate() for ease_in_out easing', () => {
  const spec = { ...SAMPLE_SPEC, layers: [
    { id: 'el', property: 'opacity', from: 0, to: 1, easing: 'ease_in_out',
      render_compatible: true, lottie_compatible: true },
  ]};
  const tsx = specToRemotionTsx(spec);
  assert.ok(tsx.includes('interpolate('));
});

test('specToRemotionTsx: uses staticFile() for bound assets', () => {
  const tsx = specToRemotionTsx(SAMPLE_SPEC);
  assert.ok(tsx.includes('staticFile('));
});

test('specToRemotionTsx: skips render_compatible=false layers', () => {
  const spec = { ...SAMPLE_SPEC, layers: [
    { ...SAMPLE_SPEC.layers[0], render_compatible: false },
  ]};
  const tsx = specToRemotionTsx(spec);
  // no spring/interpolate calls if no render-compatible layers
  assert.ok(!tsx.includes('spring(') && !tsx.includes('interpolate('));
});
```

- [ ] **Step 2: Run tests — verify new ones fail**

```bash
node --test tests/compilers.test.js 2>&1 | grep -E "fail|Error" | head -10
```

Expected: `Cannot find module '../.claude/skills/animate/spec-to-remotion.js'`

- [ ] **Step 3: Write spec-to-remotion.js**

```javascript
// .claude/skills/animate/spec-to-remotion.js
'use strict';

const EASING_FN = {
  ease_in_out: 'Easing.inOut(Easing.ease)',
  ease_in:     'Easing.in(Easing.ease)',
  ease_out:    'Easing.out(Easing.ease)',
  linear:      'Easing.linear',
  custom:      'Easing.linear',
};

/** Pascal-case a kebab-case name: 'card-enter' → 'CardEnter' */
function toPascalCase(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

/** Generate the value expression for one layer property. */
function layerValueExpr(layer, fps) {
  const startFrame = Math.round((layer.start_at || 0) * fps);
  const isSpring = layer.easing === 'spring_overshoot' || layer.easing === 'bounce';

  // Spring is one-directional — can't do to_final. Fall back to interpolate if to_final is set.
  if (isSpring && layer.to_final === undefined) {
    const { stiffness = 200, damping = 22, mass = 1 } = layer.spring || {};
    const range = layer.to - layer.from;
    return `spring({ frame: frame - ${startFrame}, fps, config: { stiffness: ${stiffness}, damping: ${damping}, mass: ${mass} } }) * ${range} + ${layer.from}`;
  }

  const easing = EASING_FN[layer.easing] || 'Easing.linear';
  if (layer.to_final !== undefined) {
    const midFrame = `Math.round(durationInFrames * 0.6)`;
    return `interpolate(frame, [${startFrame}, ${midFrame}, durationInFrames], [${layer.from}, ${layer.to}, ${layer.to_final}], { easing: ${easing}, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`;
  }
  return `interpolate(frame, [${startFrame}, durationInFrames], [${layer.from}, ${layer.to}], { easing: ${easing}, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`;
}

/** Build transform string for non-opacity properties of one layer id. */
function transformExpr(layers, id) {
  return layers
    .filter(l => l.id === id && l.property !== 'opacity')
    .map(l => {
      const varName = `${l.id}_${l.property}`;
      if (l.property.startsWith('translate')) return `\${${varName}}px`;
      if (l.property.startsWith('rotate'))    return `\${${varName}}deg`;
      return `\${${varName}}`;  // scale etc.
    })
    .map((val, idx, arr) => {
      const prop = layers.filter(l => l.id === id && l.property !== 'opacity')[idx].property;
      return `${prop}(${val})`;
    })
    .join(' ');
}

function specToRemotionTsx(spec) {
  const componentName = toPascalCase(spec.name);
  const fps = spec.fps;
  const renderLayers = spec.layers.filter(l => l.render_compatible);

  const needsSpring    = renderLayers.some(l => l.easing === 'spring_overshoot' || l.easing === 'bounce');
  const needsInterp    = renderLayers.some(l => l.easing !== 'spring_overshoot' && l.easing !== 'bounce');
  const needsStaticFile = Object.keys(spec.assets || {}).length > 0;

  const remotionImports = [
    'useCurrentFrame', 'useVideoConfig',
    needsStaticFile && 'staticFile',
    needsInterp && 'interpolate',
    needsInterp && 'Easing',
    needsSpring && 'spring',
  ].filter(Boolean).join(', ');

  const valueDecls = renderLayers.map(l =>
    `  const ${l.id}_${l.property} = ${layerValueExpr(l, fps)};`
  ).join('\n');

  const layerIds = [...new Set(renderLayers.map(l => l.id))];

  const jsxElements = layerIds.map(id => {
    const props = renderLayers.filter(l => l.id === id);
    const opacity = props.find(l => l.property === 'opacity');
    const transforms = transformExpr(props, id);
    const assetPath = spec.assets?.[id];

    const styleLines = [
      `position: 'absolute'`,
      transforms && `transform: \`${transforms}\``,
      opacity && `opacity: ${id}_opacity`,
    ].filter(Boolean).join(', ');

    if (assetPath) {
      return `      <img src={staticFile('${assetPath}')} style={{ ${styleLines} }} alt="${id}" />`;
    }
    return `      {/* placeholder — set assets.${id} in specs/${spec.name}.json */}
      <div style={{ ${styleLines}, width: 200, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12 }}>${id}</span>
      </div>`;
  }).join('\n');

  return `import React from 'react';
import { ${remotionImports} } from 'remotion';

export function ${componentName}() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

${valueDecls}

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
${jsxElements}
    </div>
  );
}
`;
}

module.exports = { specToRemotionTsx };
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
node --test tests/compilers.test.js 2>&1 | grep -E "✓|✗|pass|fail"
```

Expected: all 9 tests pass (4 lottie + 5 remotion).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/animate/spec-to-remotion.js tests/compilers.test.js
git commit -m "feat: spec-to-remotion compiler with node:test coverage"
```

---

## Task 6: spec-to-ae.js

**Files:**
- Modify: `tests/compilers.test.js` (append tests)
- Create: `.claude/skills/animate/spec-to-ae.js`

Generates an After Effects ExtendScript (`.jsx`) that runs inside AE to build a composition. Uses AE's DOM: `app.project.items.addComp()`, layer properties, and `KeyframeEase`. The script is self-contained — colleagues open AE and run `File > Scripts > Run Script File`.

- [ ] **Step 1: Append tests to compilers.test.js**

```javascript
const { specToAeScript } = require('../.claude/skills/animate/spec-to-ae.js');

test('specToAeScript: output is a string containing IIFE wrapper', () => {
  const script = specToAeScript(SAMPLE_SPEC);
  assert.ok(typeof script === 'string');
  assert.ok(script.includes('(function()'), `got: ${script.slice(0, 100)}`);
  assert.ok(script.includes('})();'));
});

test('specToAeScript: creates comp with correct duration and fps', () => {
  const script = specToAeScript(SAMPLE_SPEC);
  assert.ok(script.includes(`${SAMPLE_SPEC.duration}`));
  assert.ok(script.includes(`${SAMPLE_SPEC.fps}`));
});

test('specToAeScript: references each layer id', () => {
  const script = specToAeScript(SAMPLE_SPEC);
  assert.ok(script.includes('"card"'));
  assert.ok(script.includes('"shimmer"'));
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/compilers.test.js 2>&1 | grep -E "fail|Error" | head -5
```

Expected: `Cannot find module '../.claude/skills/animate/spec-to-ae.js'`

- [ ] **Step 3: Write spec-to-ae.js**

```javascript
// .claude/skills/animate/spec-to-ae.js
'use strict';

// AE temporal ease influence values per easing type
const AE_EASE = {
  spring_overshoot: { outInfluence: 40, inInfluence: 20 },
  bounce:           { outInfluence: 40, inInfluence: 20 },
  ease_in_out:      { outInfluence: 33, inInfluence: 33 },
  ease_in:          { outInfluence: 60, inInfluence: 10 },
  ease_out:         { outInfluence: 10, inInfluence: 60 },
  linear:           { outInfluence: 0,  inInfluence: 0  },
};

// AE transform property names inside "ADBE Transform Group"
const AE_PROP = {
  translateX: 'Position', translateY: 'Position',
  translateZ: 'Position',
  scale: 'Scale', scaleX: 'Scale', scaleY: 'Scale',
  opacity: 'Opacity',
  rotate: 'Rotation', rotateX: 'X Rotation',
  rotateY: 'Y Rotation', rotateZ: 'Z Rotation',
};

function layerScript(layer, index, spec) {
  const totalFrames = Math.round(spec.duration * spec.fps);
  const startFrame  = Math.round((layer.start_at || 0) * spec.fps);
  const ease = AE_EASE[layer.easing] || AE_EASE.ease_in_out;
  const prop = AE_PROP[layer.property] || 'Position';
  const assetNote = spec.assets?.[layer.id]
    ? `// asset: ${spec.assets[layer.id]} — copy to project, link manually`
    : '// no asset — using placeholder solid';

  const isOpacity = layer.property === 'opacity';
  const mult = isOpacity ? 100 : 1;

  const keyframeLines = layer.to_final !== undefined
    ? `  prop${index}.setValueAtTime(${startFrame} / comp.frameRate, ${layer.from * mult});
  prop${index}.setValueAtTime(${Math.round(totalFrames * 0.6)} / comp.frameRate, ${layer.to * mult});
  prop${index}.setValueAtTime(${totalFrames} / comp.frameRate, ${layer.to_final * mult});`
    : `  prop${index}.setValueAtTime(${startFrame} / comp.frameRate, ${layer.from * mult});
  prop${index}.setValueAtTime(${totalFrames} / comp.frameRate, ${layer.to * mult});`;

  return `
  // --- Layer ${index}: ${layer.id} (${layer.property}) ---
  ${assetNote}
  var layer${index} = comp.layers.addSolid([0.18, 0.18, 0.18], "${layer.id}", comp.width, comp.height, 1.0);
  layer${index}.name = "${layer.id}";
  var tg${index} = layer${index}.property("ADBE Transform Group");
  var prop${index} = tg${index}.property("${prop}");
${keyframeLines}
  if (prop${index}.numKeys >= 2) {
    var easeOut = new KeyframeEase(0, ${ease.outInfluence});
    var easeIn  = new KeyframeEase(0, ${ease.inInfluence});
    prop${index}.setTemporalEaseAtKey(1, [easeOut], [easeIn]);
    prop${index}.setTemporalEaseAtKey(2, [easeOut], [easeIn]);
  }`;
}

function specToAeScript(spec) {
  const layerBlocks = spec.layers
    .map((layer, i) => layerScript(layer, i, spec))
    .join('\n');

  return `// Generated by animate-pipeline — ${spec.name}
// Run in After Effects: File > Scripts > Run Script File

(function() {
  var comp = app.project.items.addComp(
    "${spec.name}",
    1294, 720, 1,
    ${spec.duration}, ${spec.fps}
  );
${layerBlocks}

  comp.openInViewer();
  alert("Created: ${spec.name}\\nLayers: ${spec.layers.length}\\nDuration: ${spec.duration}s @ ${spec.fps}fps");
})();
`;
}

module.exports = { specToAeScript };
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
node --test tests/compilers.test.js 2>&1 | grep -E "✓|✗|pass|fail"
```

Expected: all 12 tests pass.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/animate/spec-to-ae.js tests/compilers.test.js
git commit -m "feat: spec-to-ae ExtendScript compiler with tests"
```

---

## Task 7: spec-to-css.js

**Files:**
- Modify: `tests/compilers.test.js` (append tests)
- Create: `.claude/skills/animate/spec-to-css.js`

Generates CSS `@keyframes` + class rules. Used for web-only layers where `render_compatible: false`. Named classes follow `.{spec.name}-{layer.id}`.

- [ ] **Step 1: Append tests to compilers.test.js**

```javascript
const { specToCss } = require('../.claude/skills/animate/spec-to-css.js');

test('specToCss: output contains @keyframes block', () => {
  const css = specToCss(SAMPLE_SPEC);
  assert.ok(css.includes('@keyframes'), `got: ${css.slice(0, 200)}`);
});

test('specToCss: opacity uses 0-1 values (not 0-100)', () => {
  const spec = { ...SAMPLE_SPEC, assets: {}, layers: [
    { id: 'el', property: 'opacity', from: 0, to: 1, easing: 'ease_in_out',
      render_compatible: false, lottie_compatible: false },
  ]};
  const css = specToCss(spec);
  assert.ok(css.includes('opacity: 0') && css.includes('opacity: 1'));
  assert.ok(!css.includes('opacity: 100'));
});

test('specToCss: class rule references animation name', () => {
  const css = specToCss(SAMPLE_SPEC);
  assert.ok(css.includes('.card-enter-card'));
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
node --test tests/compilers.test.js 2>&1 | grep -E "fail|Error" | head -5
```

- [ ] **Step 3: Write spec-to-css.js**

```javascript
// .claude/skills/animate/spec-to-css.js
'use strict';

const CSS_EASING = {
  spring_overshoot: 'cubic-bezier(0.2, 1.3, 0.4, 0)',
  bounce:           'cubic-bezier(0.2, 1.5, 0.4, 0)',
  ease_in_out:      'cubic-bezier(0.4, 0, 0.2, 1)',
  ease_in:          'cubic-bezier(0.4, 0, 1.0, 1)',
  ease_out:         'cubic-bezier(0.0, 0, 0.2, 1)',
  linear:           'linear',
};

function propValue(property, value) {
  if (property === 'opacity')                 return `opacity: ${value}`;
  if (property === 'scale')                   return `transform: scale(${value})`;
  if (property === 'scaleX')                  return `transform: scaleX(${value})`;
  if (property === 'scaleY')                  return `transform: scaleY(${value})`;
  if (property === 'translateX')              return `transform: translateX(${value}px)`;
  if (property === 'translateY')              return `transform: translateY(${value}px)`;
  if (property.startsWith('rotate'))          return `transform: ${property}(${value}deg)`;
  return `transform: ${property}(${value})`;
}

function specToCss(spec) {
  const blocks = spec.layers.map(layer => {
    const animName = `${spec.name}-${layer.id}-${layer.property}`;
    const className = `.${spec.name}-${layer.id}`;
    const easing = CSS_EASING[layer.easing] || 'ease';
    const delay = layer.start_at ? `${layer.start_at}s` : '0s';

    let keyframes;
    if (layer.to_final !== undefined) {
      keyframes = `@keyframes ${animName} {
  0%   { ${propValue(layer.property, layer.from)}; }
  60%  { ${propValue(layer.property, layer.to)}; }
  100% { ${propValue(layer.property, layer.to_final)}; }
}`;
    } else {
      keyframes = `@keyframes ${animName} {
  from { ${propValue(layer.property, layer.from)}; }
  to   { ${propValue(layer.property, layer.to)}; }
}`;
    }

    const rule = `${className} {
  animation: ${animName} ${spec.duration}s ${easing} ${delay} both;
}`;

    return `${keyframes}\n\n${rule}`;
  });

  return `/* Generated by animate-pipeline: ${spec.name} */\n\n${blocks.join('\n\n')}`;
}

module.exports = { specToCss };
```

- [ ] **Step 4: Run all tests — verify they pass**

```bash
node --test tests/compilers.test.js 2>&1 | grep -E "✓|✗|pass|fail"
```

Expected: all 15 tests pass.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/animate/spec-to-css.js tests/compilers.test.js
git commit -m "feat: spec-to-css compiler with tests"
```

---

## Task 8: compile.js CLI + Root.tsx Registry

**Files:**
- Create: `.claude/skills/animate/compile.js`
- Create: `src/animations/registry.ts`
- Modify: `src/Root.tsx`

`compile.js` is the CLI that the skill invokes: it reads a spec JSON, runs all relevant compilers, writes output files, updates `registry.ts`, and triggers the Remotion preview render.

`registry.ts` is a generated file that lists all animations. `Root.tsx` imports it to register Remotion compositions without manual edits.

- [ ] **Step 1: Write registry.ts (initial empty state)**

```typescript
// src/animations/registry.ts
// AUTO-GENERATED by animate-pipeline — do not edit manually
// Each entry registers one animation composition in Remotion.

import type { ComponentType } from 'react';
import type { AnimationSpec } from './types';

export interface AnimationRegistration {
  id: string;             // Remotion composition ID
  component: ComponentType;
  spec: AnimationSpec;
}

export const animationRegistry: AnimationRegistration[] = [];
```

- [ ] **Step 2: Update Root.tsx to import from registry**

Replace the contents of `src/Root.tsx` with:

```typescript
import { Composition } from 'remotion';
import { CardScroll } from './CardScroll';
import { animationRegistry } from './animations/registry';

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="CardScroll"
        component={CardScroll}
        durationInFrames={240}
        fps={30}
        width={1294}
        height={720}
      />
      {animationRegistry.map(({ id, component, spec }) => (
        <Composition
          key={id}
          id={id}
          component={component}
          durationInFrames={Math.round(spec.duration * spec.fps)}
          fps={spec.fps}
          width={1294}
          height={720}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Write compile.js**

```javascript
// .claude/skills/animate/compile.js
// CLI: node .claude/skills/animate/compile.js <spec.json> [--target all|lottie|remotion|ae|css]
'use strict';

const fs   = require('fs');
const path = require('path');

const { specToLottie }      = require('./spec-to-lottie.js');
const { specToRemotionTsx } = require('./spec-to-remotion.js');
const { specToAeScript }    = require('./spec-to-ae.js');
const { specToCss }         = require('./spec-to-css.js');

function toPascalCase(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ ${filePath}`);
}

/** Append an import + entry to src/animations/registry.ts */
function updateRegistry(spec, projectRoot) {
  const registryPath = path.join(projectRoot, 'src/animations/registry.ts');
  const componentName = toPascalCase(spec.name);
  const importLine = `import { ${componentName} } from './${componentName}';`;
  const specJson = JSON.stringify(spec, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
  const entry = `  { id: '${componentName}', component: ${componentName}, spec: ${specJson} },`;

  let content = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';

  // Idempotent: skip if already registered
  if (content.includes(`id: '${componentName}'`)) {
    console.log(`  ↩ registry: ${componentName} already registered`);
    return;
  }

  // Insert import after last existing import line
  content = content.replace(/(import.*\n)(?!import)/, `$1${importLine}\n`);
  // Insert entry before closing bracket of animationRegistry array
  content = content.replace(/(\nexport const animationRegistry[^=]+=\s*\[)([^\]]*?)(\];)/s,
    (_, open, body, close) => `${open}${body}${entry}\n${close}`);

  writeFile(registryPath, content);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node compile.js <spec.json> [--target all|lottie|remotion|ae|css]');
    process.exit(1);
  }

  const specPath   = args[0];
  const targetFlag = (args.find(a => a.startsWith('--target=')) || '--target=all').split('=')[1];
  const projectRoot = path.resolve(__dirname, '../../..');

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const name = spec.name;
  const shouldOutput = (t) => targetFlag === 'all' || targetFlag === t;

  console.log(`\nCompiling: ${name} (target: ${targetFlag})\n`);

  // --- Lottie (always primary) ---
  if (shouldOutput('lottie') && spec.lottie_compatible) {
    writeFile(path.join(projectRoot, `animations/${name}.json`),
      JSON.stringify(specToLottie(spec), null, 2));
  }

  // --- Remotion component ---
  if (shouldOutput('remotion')) {
    const renderLayers = spec.layers.filter(l => l.render_compatible);
    if (renderLayers.length > 0) {
      const componentName = toPascalCase(name);
      writeFile(path.join(projectRoot, `src/animations/${componentName}.tsx`),
        specToRemotionTsx(spec));
      updateRegistry(spec, projectRoot);
    } else {
      console.log('  ⚠ No render-compatible layers — Remotion component skipped');
    }
  }

  // --- AE ExtendScript ---
  if (shouldOutput('ae')) {
    writeFile(path.join(projectRoot, `ae-scripts/${name}.jsx`),
      specToAeScript(spec));
  }

  // --- CSS ---
  if (shouldOutput('css')) {
    writeFile(path.join(projectRoot, `src/animations/${name}.css`),
      specToCss(spec));
  }

  console.log('\nDone. Run `npm start` to preview in Remotion Studio.');
  console.log(`Run: npx remotion render ${toPascalCase(name)} out/${name}-preview.mp4`);
}

main();
```

- [ ] **Step 5: Smoke-test compile.js with a sample spec**

```bash
cd /Users/ll1pa/tangem-animation
cat > /tmp/test-spec.json << 'EOF'
{
  "name": "test-enter",
  "duration": 1.0,
  "fps": 30,
  "lottie_compatible": true,
  "assets": {},
  "layers": [{
    "id": "box",
    "property": "translateY",
    "from": 100, "to": 0,
    "easing": "spring_overshoot",
    "spring": { "stiffness": 200, "damping": 22 },
    "render_compatible": true,
    "lottie_compatible": true
  }]
}
EOF
node .claude/skills/animate/compile.js /tmp/test-spec.json
```

Expected output:
```
Compiling: test-enter (target: all)

  ✓ animations/test-enter.json
  ✓ src/animations/TestEnter.tsx
  ✓ ae-scripts/test-enter.jsx

Done. Run `npm start` to preview in Remotion Studio.
```

- [ ] **Step 6: Verify TypeScript compiles after registry change**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add .claude/skills/animate/compile.js src/animations/registry.ts src/Root.tsx
git commit -m "feat: compile.js CLI, registry.ts auto-update, Root.tsx composition registration"
```

---

## Task 9: skill.md — The /animate Claude Code Skill

**Files:**
- Create: `.claude/skills/animate/skill.md`

This is the Claude Code skill prompt. It defines exactly what Claude does when a colleague runs `/animate`. It must be self-contained — Claude reads it and follows it without any other context.

- [ ] **Step 1: Write skill.md**

```markdown
<!-- .claude/skills/animate/skill.md -->
# /animate — Animation Pipeline Skill

You are the `/animate` skill for the tangem-animation project. When invoked, follow these steps exactly.

## Invocation format

```
/animate [ref_file] "description" [--target ae|lottie|remotion|css|all]
```

- `ref_file` — optional path to a GIF or MP4 in `refs/`. Omit for text-only.
- `description` — required. Plain language describing the animation intent, easing feel, timing.
- `--target` — optional. Default: `all`.

## Step 1 — Parse arguments

Extract:
- `ref` = file path or null
- `description` = the quoted string
- `target` = value after `--target` or `"all"`

## Step 2 — Motion analysis (skip if no ref)

If `ref` is provided, run:
```bash
python3 motion-analyzer.py {ref} refs/motion-data.json
```

Read `refs/motion-data.json`. You will use `fps`, `duration`, and `elements[].easing_hint` to inform the spec.

If the file has no moving elements detected, proceed with description only and set `duration` from the description (default: 1.0s if unspecified).

## Step 3 — Generate Animation Spec JSON

Based on the motion data (if available) and the description, generate an `AnimationSpec` JSON object. Rules:

- `name`: kebab-case, derived from ref filename stem or first 2-3 words of description
- `duration`: from motion-data.json if available, otherwise parse from description or default 1.0
- `fps`: from motion-data.json if available, otherwise 30
- `lottie_compatible`: true only if ALL layers use standard transforms (no 3D, no filters)
- `layers`: one entry per animated property per visual element
  - `render_compatible: false` for: GSAP, Rive, CSS-only animations
  - `render_compatible: true` for: spring, standard easing on opacity/transform
  - `lottie_compatible: false` for: 3D transforms, layer effects, Rive
- For spring/bounce easings, always include `spring: { stiffness, damping, mass }` — choose values that match the feel described (stiff: 300+, soft: 80-150, damping: low=bouncy, high=smooth)

Save to `specs/{name}.json`.

## Step 4 — Asset binding (interactive)

After saving the spec, list the layer IDs you found and ask:

> I found these layers in the animation:
> {list each layer.id}
>
> Map them to your assets, or press enter to use placeholders.
> Format: `layerId=public/path.png layerId2=public/path.svg`

Wait for the user's response.

- If they provide mappings: update `spec.assets` with the provided paths (relative to `public/`)
- If they press enter / skip: leave `spec.assets` as `{}`
- Re-save `specs/{name}.json` with updated assets

## Step 5 — Compile

Run:
```bash
node .claude/skills/animate/compile.js specs/{name}.json --target={target}
```

## Step 6 — Preview render (if Remotion component was generated)

If any layers were `render_compatible: true`, run:
```bash
npx remotion render {ComponentName} out/{name}-preview.mp4
```

Where `{ComponentName}` is the PascalCase of the spec name (e.g. `card-enter` → `CardEnter`).

Tell the user: "Preview rendered to `out/{name}-preview.mp4`"

If no render-compatible layers: tell the user which outputs were generated and that preview is not available (e.g. Rive/GSAP outputs are web-only).

## Step 7 — Summary

Print a concise summary:
```
Animation: {name}
Outputs:
  ✓ animations/{name}.json      (Lottie — use in AE via Bodymovin, web, Remotion)
  ✓ src/animations/{Name}.tsx   (Remotion component)
  ✓ ae-scripts/{name}.jsx       (After Effects script)
  ✓ out/{name}-preview.mp4      (rendered preview)

To preview: npm start → select {Name} in Remotion Studio
To use in AE: run ae-scripts/{name}.jsx via File > Scripts > Run Script File
```
```

- [ ] **Step 2: Verify skill is discoverable**

```bash
ls .claude/skills/animate/
```

Expected: `compile.js  skill.md  spec-to-ae.js  spec-to-css.js  spec-to-lottie.js  spec-to-remotion.js`

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/animate/skill.md
git commit -m "feat: /animate skill.md — full 7-step pipeline prompt"
```

---

## Task 10: End-to-End Smoke Test

Verify the full pipeline works using the existing `card.png` asset and a text-only invocation (no GIF needed for first test).

- [ ] **Step 1: Create a minimal test spec manually**

```bash
cat > specs/card-spring-enter.json << 'EOF'
{
  "name": "card-spring-enter",
  "duration": 1.2,
  "fps": 30,
  "lottie_compatible": true,
  "assets": { "card": "card.png" },
  "layers": [
    {
      "id": "card",
      "property": "translateY",
      "from": 120, "to": 0,
      "easing": "spring_overshoot",
      "spring": { "stiffness": 200, "damping": 22, "mass": 1 },
      "render_compatible": true,
      "lottie_compatible": true
    },
    {
      "id": "card",
      "property": "opacity",
      "from": 0, "to": 1,
      "easing": "ease_out",
      "render_compatible": true,
      "lottie_compatible": true
    }
  ]
}
EOF
```

- [ ] **Step 2: Run the compiler**

```bash
node .claude/skills/animate/compile.js specs/card-spring-enter.json
```

Expected:
```
Compiling: card-spring-enter (target: all)

  ✓ animations/card-spring-enter.json
  ✓ src/animations/CardSpringEnter.tsx
  ✓ ae-scripts/card-spring-enter.jsx

Done.
```

- [ ] **Step 3: Verify generated files are valid**

```bash
# Lottie JSON is valid
node -e "const j = require('./animations/card-spring-enter.json'); console.log('Lottie layers:', j.layers.length, '| op:', j.op)"

# Remotion TSX compiles
npx tsc --noEmit
```

Expected:
```
Lottie layers: 2 | op: 36
(no TypeScript errors)
```

- [ ] **Step 4: Render preview MP4**

```bash
npx remotion render CardSpringEnter out/card-spring-enter-preview.mp4
```

Expected: renders without errors. Check `out/card-spring-enter-preview.mp4` exists.

- [ ] **Step 5: Run all tests one final time**

```bash
node --test tests/compilers.test.js && python3 -m pytest tests/test_motion_analyzer.py -v
```

Expected: all 15 JS tests pass, all 5 Python tests pass.

- [ ] **Step 6: Final commit**

```bash
git add specs/card-spring-enter.json animations/ src/animations/ ae-scripts/ out/
git commit -m "test: add end-to-end smoke test spec and generated outputs"
```

---

## Done

The `/animate` skill is live. Colleagues can invoke it from any Claude Code session inside the `tangem-animation` project:

```bash
/animate refs/my-animation.gif "card springs up, shimmer on land"
```
