import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing, staticFile } from 'remotion';

// GIF 2: Card carousel — 3 cards in a fan stack, cycling with 3D rotation
// Each card holds for ~2s then transitions to next

const CARDS = [
  { img: 'photo1.jpg', label: '01  Shop' },
  { img: 'photo2.jpg', label: '02  About' },
  { img: 'photo3.jpg', label: '03  Work' },
];

const CARD_DURATION = 50; // frames per card

function Card({
  img, rotateY, translateX, scale, zIndex, opacity,
}: {
  img: string; rotateY: number; translateX: number;
  scale: number; zIndex: number; opacity: number;
}) {
  return (
    <div style={{
      position: 'absolute',
      width: 280, height: 360,
      borderRadius: 20,
      overflow: 'hidden',
      transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
      zIndex,
      opacity,
      boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      backfaceVisibility: 'hidden',
    }}>
      <img src={staticFile(img)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
    </div>
  );
}

export function Gif2CardCarousel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Which card is active (0,1,2 cycling)
  const activeIdx = Math.floor(frame / CARD_DURATION) % CARDS.length;
  const transitionFrame = frame % CARD_DURATION;

  // Transition progress (0→1 over first 18 frames of each card)
  const t = spring({
    frame: transitionFrame,
    fps,
    config: { stiffness: 200, damping: 26 },
  });

  // Label fade
  const labelOpacity = interpolate(transitionFrame, [0, 12, 40, 50], [0, 1, 1, 0], { extrapolateRight: 'clamp' });
  const currentLabel = CARDS[activeIdx].label;

  // For each card, compute position relative to active
  const cardProps = CARDS.map((_, i) => {
    const offset = ((i - activeIdx) % CARDS.length + CARDS.length) % CARDS.length;
    // 0 = front, 1 = back-right, 2 = back-left
    const positions = [
      { rx: 0,    tx: 0,    scale: 1,    z: 3, opacity: 1 },
      { rx: -28,  tx: 90,   scale: 0.88, z: 2, opacity: 0.9 },
      { rx: 28,   tx: -90,  scale: 0.88, z: 1, opacity: 0.9 },
    ];
    const target = positions[offset] || positions[2];
    // Interpolate between previous and target during transition
    const prev = positions[(offset + 1) % 3];
    return {
      img: CARDS[i].img,
      rotateY: interpolate(t, [0, 1], [prev.rx, target.rx]),
      translateX: interpolate(t, [0, 1], [prev.tx, target.tx]),
      scale: interpolate(t, [0, 1], [prev.scale, target.scale]),
      zIndex: target.z,
      opacity: interpolate(t, [0, 1], [prev.opacity, target.opacity]),
    };
  });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#f5f4f2',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 40,
    }}>
      {/* Card stack with 3D perspective */}
      <div style={{
        position: 'relative',
        width: 280, height: 360,
        perspective: 900,
      }}>
        {cardProps.map((props, i) => (
          <Card key={i} {...props} />
        ))}
      </div>

      {/* Label */}
      <div style={{
        opacity: labelOpacity,
        background: 'rgba(0,0,0,0.06)',
        borderRadius: 100,
        padding: '8px 20px',
        fontFamily: '-apple-system, sans-serif',
        fontSize: 13,
        color: '#111',
        letterSpacing: 0.3,
      }}>
        {currentLabel}
      </div>
    </div>
  );
}
