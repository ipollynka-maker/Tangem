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
