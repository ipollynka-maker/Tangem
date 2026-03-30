import React from 'react';
import { useCurrentFrame, useVideoConfig, staticFile, interpolate, Easing, spring } from 'remotion';

export function CardSpringEnter() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const card_translateY = spring({ frame: frame - 0, fps, config: { stiffness: 200, damping: 22, mass: 1 } }) * -120 + 120;
  const card_opacity = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <img src={staticFile('card.png')} style={{ position: 'absolute', transform: `translateY(${card_translateY}px)`, opacity: card_opacity }} alt="card" />
    </div>
  );
}
