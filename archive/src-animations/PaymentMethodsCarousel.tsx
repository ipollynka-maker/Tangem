import React from 'react';
import { useCurrentFrame, useVideoConfig, staticFile, interpolate, spring, Easing } from 'remotion';

// Card display dimensions (scaled from 780×500 source SVGs)
const CARD_W = 260;
const CARD_H = Math.round(CARD_W * (500 / 780)); // 167

// Carousel geometry
const R        = 240;   // orbit radius px
const CENTER_X = 400;   // composition horizontal center
const CENTER_Y = 300;   // composition vertical center

// Phase boundaries in frames (30 fps)
const CAROUSEL_END = 75;  // 2.5 s — rig completes one full rotation, Visa returns to front
const SELECT_END   = 90;  // 3.0 s — selection hold ends, resolve begins
// Resolve phase: 90–135 (3.0–4.5 s)

const CARDS = [
  { id: 'visa',       asset: 'cards/visa.svg',       baseAngle: 0   },
  { id: 'mastercard', asset: 'cards/mastercard.svg',  baseAngle: 72  },
  { id: 'applepay',   asset: 'cards/apple-pay.svg',   baseAngle: 144 },
  { id: 'wire',       asset: 'cards/wire.svg',         baseAngle: 216 },
  { id: 'ach',        asset: 'cards/ach.svg',          baseAngle: 288 },
] as const;

// Horizontal positions each non-Visa card springs to when unwinding
const LINE_X: Record<string, number> = {
  mastercard: CENTER_X + 160,
  applepay:   CENTER_X + 320,
  wire:       CENTER_X - 160,
  ach:        CENTER_X - 320,
};

export function PaymentMethodsCarousel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Carousel rig: 0 → 360° over the first 2.5 s, then freezes
  const rigAngle = interpolate(frame, [0, CAROUSEL_END], [0, 360], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Selection ring: pops in when carousel halts
  const ringPop     = spring({ frame: frame - CAROUSEL_END, fps, config: { stiffness: 220, damping: 16, mass: 1 } });
  const ringOpacity = interpolate(frame, [CAROUSEL_END, CAROUSEL_END + 6], [0, 0.9], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const ringScale = 1.35 - ringPop * 0.30; // springs from 1.35 → ~1.05

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(160deg, #0d0d18 0%, #141428 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {CARDS.map((card) => {
        const effectiveAngle = card.baseAngle + rigAngle;
        const rad        = (effectiveAngle * Math.PI) / 180;
        const z          = R * Math.cos(rad);                    // depth component
        const carouselX  = CENTER_X + R * Math.sin(rad);        // horizontal position on orbit

        // Proximity scale: 1.0 at back, 1.2 at front
        const proximityScale = 1.0 + 0.2 * (z + R) / (2 * R);

        // Depth cue: far cards slightly dimmed
        const depthAlpha = 0.55 + 0.45 * (z + R) / (2 * R);

        // Z-index based on depth so closer cards render on top
        const depthZ = Math.round(10 + (z / R) * 8);

        const isVisa = card.id === 'visa';

        // ── Visa ─────────────────────────────────────────────────────────
        if (isVisa) {
          // After rigAngle=360°, Visa's effectiveAngle=360°=0° → sin=0, so carouselX=CENTER_X already.
          // Spring smoothly settles scale from 1.2 → 1.0 during resolve.
          const resolveSpring = spring({
            frame: frame - SELECT_END,
            fps,
            config: { stiffness: 200, damping: 24, mass: 1 },
          });
          const cardX = frame < SELECT_END
            ? carouselX
            : interpolate(resolveSpring, [0, 1], [carouselX, CENTER_X]);
          const cardScale = frame < SELECT_END
            ? proximityScale
            : interpolate(resolveSpring, [0, 1], [proximityScale, 1.0]);

          return (
            <React.Fragment key={card.id}>
              {/* Glow ring behind Visa card */}
              <div style={{
                position: 'absolute',
                width:    CARD_W + 36,
                height:   CARD_H + 36,
                left:     cardX - (CARD_W + 36) / 2,
                top:      CENTER_Y - (CARD_H + 36) / 2,
                borderRadius: 20,
                border: '2px solid rgba(255,255,255,0.75)',
                boxShadow: '0 0 28px 6px rgba(160,180,255,0.25)',
                opacity: ringOpacity,
                transform: `scale(${ringScale})`,
                transformOrigin: 'center center',
                zIndex: depthZ,
                pointerEvents: 'none',
              }} />
              <img
                src={staticFile(card.asset)}
                style={{
                  position: 'absolute',
                  width:    CARD_W,
                  height:   CARD_H,
                  left:     cardX - CARD_W / 2,
                  top:      CENTER_Y - CARD_H / 2,
                  borderRadius: 14,
                  transform: `scale(${cardScale})`,
                  transformOrigin: 'center center',
                  zIndex: frame < SELECT_END ? depthZ + 1 : 30,
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                }}
              />
            </React.Fragment>
          );
        }

        // ── Non-Visa cards ────────────────────────────────────────────────
        const lineX = LINE_X[card.id];

        // Spring: carousel x-position → flat line position
        const unwindSpring = spring({
          frame: frame - SELECT_END,
          fps,
          config: { stiffness: 150, damping: 20, mass: 1 },
        });
        const cardX = frame < SELECT_END
          ? carouselX
          : interpolate(unwindSpring, [0, 1], [carouselX, lineX]);

        // Exit: slide down after brief unwind settle
        const EXIT_START = SELECT_END + 10;
        const exitT = interpolate(frame, [EXIT_START, 135], [0, 1], {
          easing: Easing.in(Easing.ease),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const cardY  = CENTER_Y + (frame >= EXIT_START ? exitT * 620 : 0);
        const cardOp = frame < EXIT_START
          ? depthAlpha
          : interpolate(exitT, [0, 0.45, 1], [1, 0.7, 0]);
        const cardScale = frame < SELECT_END ? proximityScale : 1.0;

        return (
          <img
            key={card.id}
            src={staticFile(card.asset)}
            style={{
              position: 'absolute',
              width:    CARD_W,
              height:   CARD_H,
              left:     cardX - CARD_W / 2,
              top:      cardY - CARD_H / 2,
              borderRadius: 14,
              transform: `scale(${cardScale})`,
              transformOrigin: 'center center',
              opacity: cardOp,
              zIndex: frame < SELECT_END ? depthZ : 5,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          />
        );
      })}
    </div>
  );
}
