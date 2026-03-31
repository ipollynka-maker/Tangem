# Animation Pipeline Design
**Date:** 2026-03-30
**Status:** Approved

## What We're Building

A `/animate` Claude Code skill that converts a GIF/video reference + text description into production-ready animation outputs (Lottie JSON, AE ExtendScript, Remotion component) with a rendered MP4/GIF preview. Lives in the `tangem-animation` project. Used by colleagues who already have Claude Code installed.

---

## Usage

```bash
# With reference file
/animate refs/card.gif "card springs up from bottom, gold shimmer on land at t=0.8"

# With video reference
/animate refs/hero.mp4 "hero scales from center, 1.2s ease-out" --target ae

# Text-only (no reference)
/animate "logo fades in stroke by stroke, 2s" --target lottie
```

---

## 6-Step Pipeline

### 1. Input
- Reference file dropped in `refs/` folder (GIF or MP4), optional
- Text description (required) — carries timing intent, easing feel, sequence order
- Optional `--target` flag: `ae`, `lottie`, `remotion`, `all` (default: `all`)
- Animation name: derived from ref filename (e.g. `card.gif` → `card-enter`) or inferred by Claude from the description if no ref provided

### 2. Motion Analysis (when ref file provided)
- `motion-analyzer.py` runs before Claude
- Tracks moving regions frame-by-frame using OpenCV
- Outputs `motion-data.json` with:
  - `fps`, `duration`
  - Per-element position curves `[[frame, value], ...]`
  - `easing_hint`: detected pattern (`spring_overshoot`, `ease_in_out`, `linear`, etc.)
- Requires: Python 3, OpenCV (`pip install opencv-python`)

### 3. Claude — Spec Generation
- Claude receives: `motion-data.json` + text description + 3–5 key frames (visual reference only)
- Outputs: **Animation Spec JSON** saved to `specs/{name}.json`
- The spec is the source of truth — colleagues can edit it directly to iterate without re-running the full pipeline

### 4. Asset Binding (interactive)
- After generating the spec, Claude lists every layer it found and asks:
  > "I found 2 layers: `card`, `shimmer`. Map them to your assets, or press enter to use placeholders."
- User responds with paths: `card=assets/tangem-card.png shimmer=assets/shimmer.svg`
- Bindings are saved into the spec under `"assets": { "card": "...", "shimmer": "..." }`
- If user skips, compilers use placeholder boxes (visible in preview but clearly marked)
- Asset paths are relative to the project root

### 5. Library Resolver
- Claude maps each layer in the spec to the best available library:
  - `spring_overshoot` → Remotion `spring({ stiffness, damping })`
  - Standard easing → Lottie-compatible bezier
  - State-based / interactive → Rive (web-only flag, no render)
  - Complex custom → raw keyframes
- Adds `render_compatible: true/false` per layer
- If any layer is `render_compatible: false`, preview step is skipped with a clear message

### 6. Compile
Compilers run from the spec. Outputs saved alongside spec:

| File | Format | When generated |
|---|---|---|
| `animations/{name}.json` | Lottie JSON | Always (primary output) |
| `src/animations/{Name}.tsx` | Remotion component | When render-compatible |
| `ae-scripts/{name}.jsx` | AE ExtendScript | When exceeds Lottie capabilities or `--target ae` |
| `src/animations/{name}.css` | CSS keyframes | Web-only animations |

### 7. Preview
- Remotion renders `{Name}.tsx` → `out/{name}-preview.mp4`
- Auto-opens for review
- Skipped with note if animation is not render-compatible

---

## Animation Spec JSON Schema

```json
{
  "name": "card-enter",
  "duration": 1.2,
  "fps": 30,
  "lottie_compatible": true,
  "assets": {
    "card": "assets/tangem-card.png",
    "shimmer": "assets/shimmer.svg"
  },
  "layers": [
    {
      "id": "card",
      "property": "translateY",
      "from": 100,
      "to": 0,
      "easing": "spring",
      "spring": { "stiffness": 200, "damping": 22 },
      "render_compatible": true,
      "lottie_compatible": true
    },
    {
      "id": "shimmer",
      "property": "opacity",
      "start_at": 0.8,
      "from": 0,
      "to": 1,
      "to_final": 0,
      "easing": "ease-in-out",
      "render_compatible": true,
      "lottie_compatible": true
    }
  ]
}
```

---

## Project Structure

```
tangem-animation/
├── refs/                          ← drop GIFs/videos here
├── specs/                         ← generated Animation Spec JSON files
├── animations/                    ← generated Lottie JSON files
├── ae-scripts/                    ← generated AE ExtendScript files
├── src/animations/                ← generated Remotion components + CSS
├── out/                           ← rendered preview MP4s / GIFs
├── motion-analyzer.py             ← pre-analysis script (Python + OpenCV)
└── .claude/skills/animate/        ← the /animate skill
    ├── skill.md                   ← skill definition
    ├── spec-to-lottie.js          ← compiler: spec → Lottie JSON
    ├── spec-to-remotion.js        ← compiler: spec → Remotion TSX
    ├── spec-to-ae.js              ← compiler: spec → AE ExtendScript
    └── spec-to-css.js             ← compiler: spec → CSS keyframes
```

---

## Library Reference for Resolver

Claude uses these mappings when resolving spec layers:

| Detected easing | Library | Config example |
|---|---|---|
| Spring / overshoot | Remotion `spring()` | `{ stiffness: 200, damping: 22, mass: 1 }` |
| Standard easing | Lottie bezier | `[0.4, 0, 0.2, 1]` (Material ease) |
| Bounce | Remotion `spring()` | `{ stiffness: 400, damping: 10 }` |
| Linear | Lottie / CSS | `[0, 0, 1, 1]` |
| Interactive / state | Rive | web-only, no render |

Animation libraries Claude knows about: Lottie, Rive, GSAP, Framer Motion, Remotion, CSS `@keyframes`, AE ExtendScript.

---

## Constraints

- Python + OpenCV required for motion analysis (colleagues need this installed)
- GSAP configs → web/CSS output only, no Remotion render
- Rive / CSS keyframes → web-only, preview skipped
- Remotion Studio must be installed for preview

---

## Out of Scope (v1)

- Interactive Rive state machines
- Web UI
- Direct AE plugin
- Batch processing multiple refs at once
- CSS-only output as a first-class target
