# Tangem Animation — CLAUDE.md

## What This Is
A Remotion video animation project for Tangem. Renders a card scroll animation as MP4 or GIF.

- **Stack**: Remotion 4.x, React 19, TypeScript
- **Entry**: `src/index.ts` → `src/Root.tsx`
- **Composition**: `CardScroll`
- **Output**: `out/card-scroll.mp4` or `out/card-scroll.gif`

## Commands
```bash
npm start              # Open Remotion Studio (live preview)
npm run render         # Render as MP4
npm run render:gif     # Render as GIF
```

## Remotion Rules
- All animations are pure React — use `useCurrentFrame()` and `interpolate()` for timing
- `spring()` for natural motion, `interpolate()` with easing for linear/custom curves
- Keep compositions self-contained — no external runtime state
- Use `staticFile()` for any assets (images, fonts, videos)
- Frame rate: check `fps` in `Root.tsx` before timing calculations
- Test in Studio before rendering — rendering is slow

## Code Conventions
- TypeScript strict
- All animation values derived from `frame` — no `setTimeout`, no `useState` for animation
- Component per visual element

## Skills to Use
- `brainstorming` before adding new animation sequences
- `systematic-debugging` for timing/interpolation issues
- `verification-before-completion` — preview in Studio before final render
- `commit-commands` for commits

## Task Tracking
- Plan: `tasks/todo.md`
- Lessons: `tasks/lessons.md`
