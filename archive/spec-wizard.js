#!/usr/bin/env node
/**
 * spec-wizard.js — Animation Spec Translator
 *
 * Interactive agent: takes a vague animation description, asks targeted
 * clarifying questions, and outputs a precise JSON spec for the pipeline.
 *
 * Usage:
 *   node spec-wizard.js
 *   ANTHROPIC_API_KEY=sk-... node spec-wizard.js
 */

import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\x1b[31m  ANTHROPIC_API_KEY not set.\x1b[0m');
  console.error('\x1b[2m  Set it in your shell: export ANTHROPIC_API_KEY=sk-...\x1b[0m');
  console.error('\x1b[2m  Or create a .env file:  echo "ANTHROPIC_API_KEY=sk-..." > .env\x1b[0m\n');
  process.exit(1);
}

const client = new Anthropic();

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an animation spec writer for the Tangem animation pipeline.

Your role: take a vague animation description (e.g. "carousel like on iPhone") and translate it into a precise, production-ready JSON spec for the pipeline compiler.

---

## Pipeline Spec Format

A spec is a JSON object. Full schema:

\`\`\`json
{
  "name": "kebab-case-name",
  "duration": 1.5,       // seconds
  "fps": 30,
  "width": 800,          // optional, default 800
  "height": 600,         // optional, default 600
  "lottie_compatible": false,  // true only if ALL layers are lottie_compatible
  "assets": {
    "key": "filename.png"  // asset keys referenced by layer id
  },
  "_comment": "Optional human-readable description of animation phases",

  // Optional: for 3D carousel/rig-style animations
  "carousel": {
    "radius": 280,
    "card_count": 5,
    "axis": "Y",
    "perspective": 900
  },

  // Optional: for phased animations (e.g. spin → select → resolve)
  "phases": [
    { "id": "phase-name", "start": 0.0, "end": 2.5 }
  ],

  "layers": [
    {
      "id": "element-name",        // matches asset key or is a descriptive name
      "property": "translateY",    // see Properties below
      "from": 0,                   // start value
      "to": 100,                   // end value
      "easing": "spring_bounce",   // see Easing Values below

      // For spring easing only:
      "spring": { "stiffness": 200, "damping": 12, "mass": 1 },

      // For multi-keyframe animations (alternative to from/to):
      "keyframes": [0, 100, 50, 75],
      "keyframe_positions": [0, 0.3, 0.7, 1.0],  // 0.0–1.0, must match keyframes length

      // Optional timing:
      "frame_range": [0, 15],   // clamp to specific frames (at fps)
      "start_at": 2.5,          // delay start in seconds
      "phase": "phase-name",    // tie to a phase

      // Optional repeating:
      "passes": 4,              // how many times to repeat
      "overlap": 0.25,          // 0–1 overlap between passes

      // Compat flags (required on every layer):
      "render_compatible": true,   // works in Remotion
      "lottie_compatible": true,   // works as Lottie JSON

      // Optional notes:
      "_note": "explanation"
    }
  ]
}
\`\`\`

---

## Properties (layer.property values)

Transform: translateX, translateY, translateZ, rotateX, rotateY, rotateZ, scaleX, scaleY, scale
Visual: opacity, width, height, borderRadius
3D rig: rotateY (for carousel rig containers)

---

## Easing Values

| Value | Behaviour | Lottie? |
|---|---|---|
| ease_in_out | Smooth S-curve, balanced acceleration and deceleration | ✓ |
| ease_out | Starts fast, eases to rest | ✓ |
| ease_in | Starts slow, accelerates away | ✓ |
| linear | Constant speed | ✓ |
| spring_bounce | Underdamped spring — bouncy settle, slight overshoot | ✗ |
| spring_overshoot | Strong spring — overshoots target, settles on it | ✗ |

Spring params guide:
- stiffness 80–120: slow/heavy. 180–250: snappy. 300+: very fast
- damping 8–14: very bouncy. 18–26: light settle. 30+: no bounce
- mass 1 almost always correct; increase for sluggish elements

---

## Output Formats

After spec is compiled, the user may export to:

| Format | How to use | Limitations |
|---|---|---|
| Remotion (React/TSX) | npm start → Studio | Full spring support, 3D perspective, all properties |
| After Effects (ExtendScript) | Run .jsx in AE | All properties; expressions handle orbit/3D math manually |
| CSS (keyframes) | Static @keyframes | translate/opacity/scale only; no 3D in older browsers |
| Lottie (JSON) | LottieFiles player | No spring, no 3D transforms, no passes/overlap |

Set render_compatible: true for Remotion support.
Set lottie_compatible: true ONLY when: no spring easing, no 3D transforms, no passes.

---

## Your Workflow

1. **First response**: read the description carefully. If you need more information, ask 2–4 targeted questions IN A SINGLE MESSAGE. Cover:
   - Visual reference / platform inspiration (iOS, Android, web, specific app)
   - Primary output format (Remotion for preview, AE for handoff, Lottie for mobile SDK, CSS for web)
   - Duration and speed feel (snappy 0.3s, medium 0.8–1.2s, cinematic 2–4s)
   - Number and type of elements, their assets
   - Easing style preference (bouncy spring, smooth ease, instant snap)

2. **If description is already specific enough**, skip questions and output the spec directly.

3. **After answers are received**, output the complete spec as a \`\`\`json code block. Add a brief plain-English summary BEFORE the block explaining the key motion choices you made and why.

4. **Format output format flag**: always include a comment "// EXPORT: remotion|ae|css|lottie" at the top of the JSON block based on what the user said.

---

## Spec Writing Rules

- Name layers descriptively: "card-front", "overlay-ring", "label-text" — not "layer1"
- When referencing iOS: use spring_bounce (stiffness 180, damping 20) — iOS UIKit default
- When referencing Material Design: use ease_out for enters, ease_in for exits
- For carousels with 3+ items: use passes + overlap pattern OR explicit phases
- Always include opacity on elements that enter/exit
- Use frame_range for opacity (short 0.3s fade) even when main motion is longer
- Keep duration realistic: UI micro-animations 0.3–0.8s, reveals 0.8–1.5s, carousels 2–5s
- When lottie output requested, set lottie_compatible: false at root if ANY layer is not lottie-compatible, and note which layers need substitution
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractJsonBlock(text) {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function saveSpec(jsonStr) {
  try {
    const spec = JSON.parse(jsonStr);
    const name = spec.name || `spec-${Date.now()}`;
    const filename = `${name}.json`;
    const filepath = path.join(__dirname, 'specs', filename);
    fs.writeFileSync(filepath, JSON.stringify(spec, null, 2));
    return filepath;
  } catch {
    return null;
  }
}

function colorize(text, code) {
  return `\x1b[${code}m${text}\x1b[0m`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  const messages = [];

  console.log(colorize('\n  ✦ Animation Spec Wizard', '1;36'));
  console.log(colorize('  Describe any animation. I\'ll translate it into a pipeline spec.\n', '2;37'));
  console.log(colorize('  Commands: quit / exit / save (saves last spec)\n', '2;90'));

  let lastJsonBlock = null;

  const prompt = () => {
    rl.question(colorize('You › ', '1;33'), async (input) => {
      input = input.trim();

      if (!input) { prompt(); return; }
      if (input === 'quit' || input === 'exit') { rl.close(); process.exit(0); }

      if (input === 'save') {
        if (!lastJsonBlock) {
          console.log(colorize('\n  No spec to save yet.\n', '33'));
        } else {
          const saved = saveSpec(lastJsonBlock);
          if (saved) {
            console.log(colorize(`\n  Saved → ${path.relative(__dirname, saved)}\n`, '32'));
          } else {
            console.log(colorize('\n  Could not parse JSON.\n', '31'));
          }
        }
        prompt();
        return;
      }

      messages.push({ role: 'user', content: input });

      process.stdout.write(colorize('\nSpec Wizard › ', '1;35'));

      let fullResponse = '';

      try {
        const stream = client.messages.stream({
          model: 'claude-opus-4-6',
          max_tokens: 4096,
          thinking: { type: 'adaptive' },
          system: SYSTEM_PROMPT,
          messages,
        });

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            process.stdout.write(event.delta.text);
            fullResponse += event.delta.text;
          }
        }

        process.stdout.write('\n\n');

        messages.push({ role: 'assistant', content: fullResponse });

        // Detect JSON spec block
        const jsonBlock = extractJsonBlock(fullResponse);
        if (jsonBlock) {
          lastJsonBlock = jsonBlock;
          const saved = saveSpec(jsonBlock);
          if (saved) {
            console.log(
              colorize(`  ↳ Spec auto-saved → ${path.relative(__dirname, saved)}`, '2;32')
            );
            console.log(
              colorize(`  ↳ Compile with: node .claude/skills/animate/compile.js ${path.relative(__dirname, saved)}\n`, '2;90')
            );
          }
        }
      } catch (err) {
        console.error(colorize(`\n  Error: ${err.message}\n`, '31'));
      }

      prompt();
    });
  };

  prompt();
}

main();
