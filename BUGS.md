# Bugs & Improvements Log

## Open Bugs

### BUG-001 — AE script: Gif1PhoneReveal.jsx property names (UNTESTED FIX)
- **File:** `ae-exports/Gif1PhoneReveal.jsx`
- **Symptom:** "not associated with a layer" error when running in After Effects
- **Root cause:** Wrong AE internal property names (`ADBE Root Vectors Group` / `ADBE Vectors Group`) and incorrect `TextDocument` instantiation (`new TextDocument()` → must use `.value`)
- **Fix applied:** Rewrote property access + TextDocument handling in last session
- **Status:** Fix written, NOT tested in After Effects yet

### BUG-002 — Gif3CardFlip: transparency not rendering correctly (UNTESTED FIX)
- **File:** `src/animations/Gif3CardFlip.tsx`
- **Symptom:** Card background shows as opaque/white instead of transparent between card designs
- **Fix applied:** Rewrote card rendering to avoid transparency bleed
- **Status:** Fix written, NOT confirmed in Remotion Studio

### BUG-003 — Gif1PhoneReveal: orbiting thumbnails not confirmed
- **File:** `src/animations/Gif1PhoneReveal.tsx`
- **Symptom:** Orbiting thumbnail animation added but not verified in Remotion Studio
- **Status:** Needs Studio preview confirmation

---

## Planned Improvements

### IMP-001 — Test all AE scripts in After Effects
- Run `ae-exports/Gif1PhoneReveal.jsx` in AE and validate output
- Run all `ae-scripts/*.jsx` and document any errors

### IMP-002 — Remotion Studio sign-off on all 3 GIF recreations
- Preview Gif1, Gif2, Gif3 in Studio and compare to original refs in `refs/`
- Record confirmed frame-by-frame match

### IMP-003 — Add Gif2CardCarousel AE export
- `ae-exports/Gif2CardCarousel.jsx` not yet generated
- Requires 3D card layer expressions in AE

### IMP-004 — Add Gif3CardFlip AE export
- `ae-exports/Gif3CardFlip.jsx` not yet generated

### IMP-005 — Lottie output validation
- `animations/*.json` files generated but not tested in LottieFiles player
- Validate Lottie-compatibility flag in specs

### IMP-006 — motion-analyzer.py: improve orbit/rotation detection
- Current motion analysis doesn't reliably detect orbital paths (affects Gif1)
- Consider adding polar-coordinate tracking mode

### IMP-007 — compile.js: watch mode
- Add `--watch` flag to recompile specs on save
- Useful during rapid iteration

### IMP-008 — Registry: auto-import Gif* components
- `Gif1PhoneReveal`, `Gif2CardCarousel`, `Gif3CardFlip` exist in `src/animations/`
  but are not yet registered in `registry.ts`
- Add them so they show up in Remotion Studio

---

## Notes
- Pipeline is v0 — spec format and compiler APIs may change
- AE scripts use ExtendScript (ES3) — no modern JS features
- Remotion compositions use `fps: 30` globally; change in spec to override
