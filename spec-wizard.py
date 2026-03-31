#!/usr/bin/env python3
"""
spec-wizard.py — Animation Spec Translator

Uses the Claude Agent SDK — no API key needed,
runs via your existing Claude Code installation.

Usage:
    python3 spec-wizard.py
    npm run spec
"""

import anyio
import os
import sys
from claude_agent_sdk import (
    query,
    ClaudeAgentOptions,
    ResultMessage,
    SystemMessage,
    AssistantMessage,
    TextBlock,
)

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))

SYSTEM_PROMPT = rf"""You are an animation spec writer for the Tangem animation pipeline.

Your role: take a vague animation description (e.g. "carousel like on iPhone") and
translate it into a precise JSON spec, then SAVE IT as a file using the Write tool.

---

## Pipeline Spec Format

\`\`\`json
{{
  "name": "kebab-case-name",
  "duration": 1.5,
  "fps": 30,
  "width": 800,
  "height": 600,
  "lottie_compatible": false,
  "assets": {{
    "key": "filename.png"
  }},
  "_comment": "Optional human description of animation phases",

  "carousel": {{          // optional — for 3D rig animations
    "radius": 280,
    "card_count": 5,
    "axis": "Y",
    "perspective": 900
  }},

  "phases": [             // optional — for phased animations
    {{ "id": "phase-name", "start": 0.0, "end": 2.5 }}
  ],

  "layers": [
    {{
      "id": "element-name",
      "property": "translateY",
      "from": 0,
      "to": 100,
      "easing": "spring_bounce",
      "spring": {{ "stiffness": 200, "damping": 12, "mass": 1 }},

      // OR multi-keyframe:
      "keyframes": [0, 100, 50],
      "keyframe_positions": [0, 0.6, 1.0],

      // Optional timing:
      "frame_range": [0, 15],
      "start_at": 2.5,
      "phase": "phase-name",

      // Optional repeat:
      "passes": 4,
      "overlap": 0.25,

      "render_compatible": true,
      "lottie_compatible": false,
      "_note": "optional explanation"
    }}
  ]
}}
\`\`\`

---

## Layer Properties
translateX, translateY, translateZ, rotateX, rotateY, rotateZ,
scale, scaleX, scaleY, opacity, width, height, borderRadius

---

## Easing Values

| Value            | Behaviour                            | Lottie |
|------------------|--------------------------------------|--------|
| ease_in_out      | Smooth S-curve                       | ✓      |
| ease_out         | Fast start, eases to rest            | ✓      |
| ease_in          | Slow start, accelerates              | ✓      |
| linear           | Constant speed                       | ✓      |
| spring_bounce    | Bouncy settle, slight overshoot      | ✗      |
| spring_overshoot | Strong overshoot, then settles       | ✗      |

Spring parameter guide:
- stiffness 80–120: slow/heavy  |  180–250: snappy  |  300+: instant
- damping 8–14: very bouncy     |  18–26: gentle    |  30+: no bounce
- mass: 1 almost always correct

---

## Output Formats & Compatibility

| Format          | Tool             | Spring | 3D | Notes                    |
|-----------------|------------------|--------|----|--------------------------|
| Remotion (.tsx) | npm start        | ✓      | ✓  | Full support             |
| After Effects   | Run .jsx in AE   | ✓      | ✓  | Expressions handle math  |
| CSS (@keyframes)| Browser          | ✗      | ~  | translate/opacity/scale  |
| Lottie (.json)  | LottieFiles SDK  | ✗      | ✗  | lottie_compatible only   |

---

## Your Workflow

1. When the description is vague, ask 2–4 targeted questions IN ONE MESSAGE:
   - Output format (Remotion / AE / CSS / Lottie)
   - Duration and speed feel (snappy 0.3s, medium 0.8–1.2s, cinematic 2–4s)
   - Platform/visual reference (iOS, Material, web app, specific app)
   - Elements: what objects, how many, any assets/images

2. If description is already specific, skip questions.

3. After gathering info: write a brief plain-English explanation of your motion
   choices, then SAVE the spec using the Write tool to:
   {PROJECT_DIR}/specs/<name>.json

4. After saving, print the compile command:
   node .claude/skills/animate/compile.js specs/<name>.json

---

## Platform Conventions
- iOS / UIKit: spring_bounce, stiffness 180, damping 20 (UISpringTimingParameters default)
- Material Design: ease_out for enters, ease_in for exits, 300ms standard
- Web micro-interactions: ease_out, 150–250ms
- Cinematic/marketing: ease_in_out, 800–2000ms

---

## Spec Rules
- Layer ids must be descriptive: "card-front", "overlay-ring" — not "layer1"
- Always include opacity on elements that enter or exit the screen
- Use frame_range for short opacity transitions (e.g. [0, 12]) even when main motion is longer
- For Lottie output: set lottie_compatible: false at root if ANY layer is not compatible
- Duration guide: UI micro 0.3–0.8s | reveals 0.8–1.5s | carousels 2–5s
"""


# ─── Colours ────────────────────────────────────────────────────────────────

def c(text, code): return f"\x1b[{code}m{text}\x1b[0m"


# ─── Main loop ──────────────────────────────────────────────────────────────

async def main():
    session_id = None
    first_turn = True

    print(c("\n  ✦ Animation Spec Wizard", "1;36"))
    print(c("  Describe any animation — I'll translate it into a pipeline spec.", "2;37"))
    print(c("  Uses your Claude Code session. No API key needed.\n", "2;90"))
    print(c("  Type 'quit' to exit.\n", "2;90"))

    while True:
        try:
            user_input = input(c("You › ", "1;33")).strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit"):
            break

        if first_turn:
            options = ClaudeAgentOptions(
                cwd=PROJECT_DIR,
                allowed_tools=["Write"],
                system_prompt=SYSTEM_PROMPT,
            )
            first_turn = False
        else:
            options = ClaudeAgentOptions(
                cwd=PROJECT_DIR,
                allowed_tools=["Write"],
                resume=session_id,
            )

        print(c("\nSpec Wizard › ", "1;35"), end="", flush=True)

        try:
            async for message in query(prompt=user_input, options=options):
                if isinstance(message, SystemMessage) and message.subtype == "init":
                    session_id = message.data.get("session_id")

                elif isinstance(message, AssistantMessage):
                    for block in message.content:
                        if isinstance(block, TextBlock):
                            print(block.text, end="", flush=True)

                elif isinstance(message, ResultMessage):
                    pass  # session complete for this turn

        except Exception as e:
            print(c(f"\n  Error: {e}\n", "31"))
            # Reset session on error so next turn starts fresh
            session_id = None
            first_turn = True
            continue

        print("\n")


if __name__ == "__main__":
    anyio.run(main)
