# Changelog

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
