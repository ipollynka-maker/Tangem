import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from 'remotion';

export function CardFadeSlideUp() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const card_translateY = interpolate(frame, [0, durationInFrames], [120, 0], { easing: Easing.linear, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const card_opacity = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* placeholder — set assets.card in specs/card-fade-slide-up.json */}
      <div style={{ position: 'absolute', transform: `translateY(${card_translateY}px)`, opacity: card_opacity, width: 200, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12 }}>card</span>
      </div>
    </div>
  );
}
