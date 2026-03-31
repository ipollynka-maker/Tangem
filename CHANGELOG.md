# Changelog

## v1 — 2026-03-31 (3D, Quality & Bug Fix Release)

### Added
- **3D animation support** — four modes from a single spec:
  - `css3d` — CSS perspective + translateZ/rotateX/Y, compiled to `.css` and `.html`
  - `threejs` — Three.js WebGL scene with GSAP timeline, compiled to ES module `.js`
  - `parallax` — layered depth illusion via mousemove, compiled to standalone `.html`
  - `ae` — AE 3D layers (`threeDLayer = true`) + camera layer auto-generated
- **New compilers**: `spec-to-gsap.js`, `spec-to-motion.js`, `spec-to-html.js`, `spec-to-threejs.js`
- **Spec Wizard** (`~/.claude/skills/animate/spec-wizard.py`) — interactive Claude Agent SDK session; no API key required, uses local Claude Code session; saves specs directly via Write tool
- **Project portability** — `.animate.json` config file maps output paths per project; compile.js and spec-wizard work from any directory with fallback to Tangem defaults
- **Quality guidance** in spec-wizard: spring presets (ios_default, web_standard, playful…), directional easing rules, timing tables, "Good Taste" guide
- `--target=html` and `--target=threejs` compile targets

### Fixed (13 bugs across all compilers)
- `render_compatible` / `lottie_compatible` truthy filter silently dropped layers where field was absent; now `!== false`
- Lottie: scale values emitted as 0–1 instead of 0–100 (Lottie percentage unit)
- Lottie + Remotion: `frame_range` and `phase` timing fields completely ignored (always fell back to frame 0)
- Lottie: hardcoded `1294×720` dimensions; now uses `spec.width / spec.height`
- Lottie + Remotion: `keyframes[]` multi-stop arrays silently fell through to 2-stop `from/to`
- Remotion: `spring_bounce` missing from spring check — treated as linear interpolation
- Remotion: `spring()` called with negative frame before `start_at`; now `Math.max(0, frame - startFrame)`
- AE: camera position used JS string concat at codegen time → invalid ExtendScript syntax
- AE: 2D/3D position arity mismatch in multi-property comps; all layers now get `threeDLayer = true` when any spec layer is 3D
- GSAP: dead selector scoping code (unused `q`, `origTo`, `origFrom`)
- Three.js + HTML: `obj || path` fallback produced wrong GSAP tween target for single-segment property paths
- Three.js + HTML: keyframe arrays used invalid GSAP API (`{ prop: [v1,v2] }`); now `{ keyframes: [{…}] }`
- Motion: `duration: null` placeholder leaked into generated transition objects

### Changed
- `compile.js` now loads `.animate.json` for portable output paths
- `spec-to-ae.js` uses `spec.width / spec.height` for comp dimensions (was hardcoded 1294×720)
- `spec-to-css.js` adds `perspective` wrapper + `transform-style: preserve-3d` when spec has 3D layers

### Pipeline Architecture (v1)
```
GIF/Video ref  OR  text description
  └─ motion-analyzer.py         → refs/<name>-motion.json
  └─ spec-wizard.py             → specs/<name>.json  (interactive Claude agent)
  └─ manual spec                → specs/<name>.json
       └─ compile.js [--target=all|remotion|lottie|ae|css|gsap|motion|html|threejs]
            ├─ spec-to-remotion.js  → src/animations/<Name>.tsx  +  registry.ts
            ├─ spec-to-lottie.js    → animations/<name>.json
            ├─ spec-to-ae.js        → ae-scripts/<name>.jsx
            ├─ spec-to-css.js       → src/animations/<name>.css
            ├─ spec-to-gsap.js      → src/animations/gsap/<name>.js
            ├─ spec-to-motion.js    → src/animations/motion/<Name>.tsx
            ├─ spec-to-html.js      → src/animations/html/<name>.html  (standalone demo)
            └─ spec-to-threejs.js   → src/animations/threejs/<Name>.js
```

---

## v0 — 2026-03-31 (Pipeline Bootstrap)

### Added
- `/animate` skill — 7-step pipeline: motion analysis → spec → multi-format compile
- `motion-analyzer.py` — OpenCV-based motion analysis from GIF/video refs
- `compile.js` — CLI entry point; auto-registers compositions in `src/animations/registry.ts`
- Format compilers: `spec-to-remotion.js`, `spec-to-lottie.js`, `spec-to-ae.js`, `spec-to-css.js`
- Remotion 4.x + React 19 + TypeScript project scaffold
- Three GIF recreations:
  - `Gif1PhoneReveal.tsx` — phone springs up, 6 thumbnails orbit "Распознаем трек", collapse, result screen
  - `Gif2CardCarousel.tsx` — 3 photo cards fan/cycle with 3D perspective, label fades
  - `Gif3CardFlip.tsx` — 4 credit card designs flip one-at-a-time
- After Effects ExtendScript export: `ae-exports/Gif1PhoneReveal.jsx`
- Additional AE scripts: `ae-scripts/` for all early animation specs
- Public assets: `iphone-frame.png`, `character.png`, `photo1-3.jpg`
- Animation registry with auto-import: `src/animations/registry.ts`
- Spec files in `specs/` and motion analysis outputs in `refs/`

### Pipeline Architecture
```
GIF/Video ref
  └─ motion-analyzer.py     → refs/<name>-motion.json
  └─ manual spec            → specs/<name>.json
       └─ compile.js
            ├─ spec-to-remotion.js  → src/animations/<Name>.tsx  +  registry.ts
            ├─ spec-to-lottie.js    → animations/<name>.json
            ├─ spec-to-ae.js        → ae-exports/<Name>.jsx
            └─ spec-to-css.js       → src/animations/<name>.css
```
