import { useCurrentFrame, interpolate, Easing, staticFile } from 'remotion';
import React from 'react';

const CARD_W = 290;
const CARD_H = 390;

const IMAGES = ['photo1.png', 'photo2.png', 'photo3.png'];
const LABELS = ['01', '02', '03'];

const NUM_CARDS = 3;
// 42 hold + 18 transition = 60 frames per state (2s @ 30fps)
const HOLD_F = 42;
const TRANS_F = 18;
const STATE_F = HOLD_F + TRANS_F;
const TOTAL_F = NUM_CARDS * STATE_F; // 180 frames = 6s

// Slot layout: index 0 = center, 1 = right, 2 = left
const SLOTS = [
  { x: 0,    y: 0,   rotZ: -2,  scale: 1.0,  opacity: 1.0,  zIndex: 3 },
  { x: 172,  y: 18,  rotZ: 12,  scale: 0.74, opacity: 0.88, zIndex: 2 },
  { x: -158, y: 14,  rotZ: -14, scale: 0.74, opacity: 0.88, zIndex: 1 },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

interface CardProps {
  src: string;
  slotFrom: number;
  slotTo: number;
  transProgress: number;
}

function Card({ src, slotFrom, slotTo, transProgress }: CardProps) {
  const t = Easing.inOut(Easing.ease)(transProgress);
  const from = SLOTS[slotFrom];
  const to = SLOTS[slotTo];

  const x = lerp(from.x, to.x, t);
  const y = lerp(from.y, to.y, t);
  const rotZ = lerp(from.rotZ, to.rotZ, t);
  const scale = lerp(from.scale, to.scale, t);
  const opacity = lerp(from.opacity, to.opacity, t);
  const zIndex = transProgress < 0.5 ? from.zIndex : to.zIndex;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: CARD_W,
        height: CARD_H,
        marginLeft: -CARD_W / 2,
        marginTop: -CARD_H / 2,
        transform: `translateX(${x}px) translateY(${y}px) rotateZ(${rotZ}deg) scale(${scale})`,
        opacity,
        zIndex,
      }}
    >
      <img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 18,
          display: 'block',
          objectFit: 'cover',
          boxShadow: '0 22px 58px rgba(0,0,0,0.20), 0 6px 18px rgba(0,0,0,0.10)',
        }}
      />
    </div>
  );
}

export function CardsFan() {
  const frame = useCurrentFrame();

  const cycleFrame = frame % TOTAL_F;
  const state = Math.floor(cycleFrame / STATE_F);
  const frameInState = cycleFrame % STATE_F;
  const transProgress = Math.max(0, (frameInState - HOLD_F) / TRANS_F);
  const nextState = (state + 1) % NUM_CARDS;

  // Label: fade in on entry, hold, fade out before transition
  const labelOpacity = interpolate(
    frameInState,
    [0, 6, HOLD_F - 4, HOLD_F],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#ecebe6',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {IMAGES.map((src, i) => {
          const slotFrom = (i - state + NUM_CARDS) % NUM_CARDS;
          const slotTo = (i - nextState + NUM_CARDS) % NUM_CARDS;
          return (
            <Card
              key={i}
              src={src}
              slotFrom={slotFrom}
              slotTo={slotTo}
              transProgress={transProgress}
            />
          );
        })}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 72,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: labelOpacity,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 13,
          letterSpacing: '0.15em',
          color: '#99978f',
          userSelect: 'none',
        }}
      >
        {LABELS[state]}
      </div>
    </div>
  );
}
