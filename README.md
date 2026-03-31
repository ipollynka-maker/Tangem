# Animation Pipeline — Team Guide

A tool that turns a JSON description of an animation into code for any platform: React, Lottie, After Effects, CSS, GSAP, Framer Motion, Three.js, or a standalone HTML demo.

---

## Install

**Requirements:** Node.js 18+, Python 3.10+, Claude Code

```bash
# Clone the repo
git clone https://github.com/ipollynka-maker/Tangem.git
cd Tangem

# Install Node deps (for Remotion preview)
npm install

# Install Python dep (for the Spec Wizard)
pip install claude-agent-sdk anyio
```

That's it. No API key needed — the pipeline uses your Claude Code session.

---

## Two ways to create an animation

### Option A — Spec Wizard (recommended)

Run this from the project directory:

```bash
npm run spec
# or directly:
python3 ~/.claude/skills/animate/spec-wizard.py
```

Type a plain description of what you want. The wizard will ask a few questions and write the spec file for you.

**Example conversation:**
```
You › card that bounces onto screen like on iOS, for Lottie
Spec Wizard › What's the card size and background color? Is this an enter or exit?
You › enter, 375x812, dark background, 0.5s
Spec Wizard › [saves specs/card-ios-enter.json]
             Run: node ~/.claude/skills/animate/compile.js specs/card-ios-enter.json
```

### Option B — Write the spec manually

Copy an existing spec from `specs/` and edit it. See the spec format below.

---

## How to write a good description

The wizard understands natural language but more detail = better result.

**Weak:**
> "card animation"

**Good:**
> "Card enters from the bottom, bounces slightly, fades in over 0.4s. iOS feel. Output: Lottie."

**Include:**
- What enters/exits/moves (card, modal, icon, text)
- Direction or starting position (from bottom, scale from 0, rotate in)
- Feel: snappy, bouncy, smooth, cinematic
- Duration hint: fast (0.2–0.4s), normal (0.5–0.8s), slow (1–2s)
- Output format you need (Lottie, AE, CSS, HTML demo...)
- Platform reference if helpful: iOS, Material Design, Stripe, etc.

---

## Compile a spec to output files

```bash
# All formats at once
node ~/.claude/skills/animate/compile.js specs/my-animation.json

# Specific format only
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=lottie
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=remotion
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=ae
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=css
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=gsap
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=motion
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=html
node ~/.claude/skills/animate/compile.js specs/my-animation.json --target=threejs
```

### Output locations

| Target | Output path |
|--------|-------------|
| `remotion` | `src/animations/<Name>.tsx` |
| `lottie` | `animations/<name>.json` |
| `ae` | `ae-scripts/<name>.jsx` |
| `css` | `src/animations/<name>.css` |
| `gsap` | `src/animations/gsap/<name>.js` |
| `motion` | `src/animations/motion/<Name>.tsx` |
| `html` | `src/animations/html/<name>.html` |
| `threejs` | `src/animations/threejs/<Name>.js` |

---

## Including assets (images)

Add your image files to the `public/` folder, then reference them in the spec:

```json
{
  "name": "card-spring-enter",
  "assets": {
    "card": "card.png"
  }
}
```

The key (`"card"`) must match the layer `id` that uses the image. The value is the filename in `public/`.

The compiler will wire up `staticFile('card.png')` in Remotion and the correct asset reference in Lottie automatically.

---

## Preview and export

**Remotion Studio (live preview):**
```bash
npm start
# Opens in browser at localhost:3000
```

**Render to MP4:**
```bash
npx remotion render MyAnimation out/my-animation.mp4
```

**Render to GIF:**
```bash
npm run render:gif
```

**HTML demo — just open in a browser:**
```
src/animations/html/my-animation.html
```
Double-click or drag to any browser. No server needed. Good for sharing with stakeholders.

**Lottie file** — ready to drop into iOS/Android/Web SDK:
```
animations/my-animation.json
```

**After Effects script:**
1. Open After Effects
2. `File → Scripts → Run Script File`
3. Select the `.jsx` from `ae-scripts/`

---

## Spec format reference

Minimal working spec:

```json
{
  "name": "my-animation",
  "duration": 0.8,
  "fps": 30,
  "lottie_compatible": true,
  "layers": [
    {
      "id": "card",
      "property": "translateY",
      "from": 100,
      "to": 0,
      "easing": "spring_bounce"
    }
  ]
}
```

### Layer properties

| Property | What it animates |
|----------|-----------------|
| `translateX` / `translateY` | Position in px |
| `translateZ` | Depth (3D only) in px |
| `rotateX` / `rotateY` / `rotateZ` | Rotation in degrees |
| `scale` | Uniform scale (1 = 100%) |
| `scaleX` / `scaleY` | Non-uniform scale |
| `opacity` | 0 = invisible, 1 = visible |

### Easing options

| Value | Feel | Works in Lottie? |
|-------|------|:---:|
| `spring_bounce` | Bouncy, iOS-style | ✗ |
| `spring_overshoot` | Overshoots then settles | ✗ |
| `ease_out` | Fast start, soft landing | ✓ |
| `ease_in` | Slow start, exits fast | ✓ |
| `ease_in_out` | Smooth S-curve | ✓ |
| `linear` | Constant speed | ✓ |

**Rule:** use `ease_out` for things entering, `ease_in` for things leaving. Springs only for interactive/bouncy UI.

### Timing

```json
{ "start_at": 0.3 }           // delay in seconds
{ "frame_range": [0, 12] }    // start/end frame numbers
{ "phase": "intro" }          // reference a named phase
```

### 3D animations

Add a `"3d"` block to enable depth:

```json
{
  "3d": { "type": "css3d", "perspective": 900 },
  "layers": [
    { "id": "card", "property": "rotateY", "from": -30, "to": 0, "easing": "spring_bounce" }
  ]
}
```

Types: `css3d` (CSS perspective), `threejs` (WebGL), `parallax` (mouse-tracked depth).

---

## Using the pipeline in a different project

Create a `.animate.json` file in your project root to redirect outputs:

```json
{
  "specs":    "specs",
  "remotion": "src/animations",
  "lottie":   "public/animations",
  "ae":       "ae-exports",
  "css":      "src/styles/animations",
  "gsap":     "src/animations/gsap",
  "motion":   "src/components/animations",
  "html":     "public/demos"
}
```

Then run the compile and spec-wizard from that project directory. They will pick up the config automatically.
