import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';

export function CardSpringEnter() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const card_translateY = spring({ frame: frame - 0, fps, config: { stiffness: 180, damping: 18, mass: 1 } }) * -120 + 120;
  const card_opacity = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* placeholder — set assets.card in specs/card-spring-enter.json */}
      <div style={{ position: 'absolute', transform: `translateY(${card_translateY}px)`, opacity: card_opacity, width: 200, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12 }}>card</span>
      </div>
    </div>
  );
}
