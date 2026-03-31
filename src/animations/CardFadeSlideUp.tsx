import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';

export function CardFadeSlideUp() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const card_translateY = spring({ frame: Math.max(0, frame - 0), fps, config: { stiffness: 200, damping: 12, mass: 1 } }) * -120 + 120;
  const card_opacity = interpolate(frame, [0, 15], [0, 1], { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* placeholder — set assets.card in specs/card-fade-slide-up.json */}
      <div style={{ position: 'absolute', transform: `translateY(${card_translateY}px)`, opacity: card_opacity, width: 200, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12 }}>card</span>
      </div>
    </div>
  );
}
