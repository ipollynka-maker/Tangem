import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from 'remotion';

export function LogoReveal() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const logo_scale = spring({ frame: frame - 0, fps, config: { stiffness: 300, damping: 24, mass: 1 } }) * 20 + 80;
  const logo_opacity = interpolate(frame, [0, durationInFrames], [0, 1], { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* placeholder — set assets.logo in specs/logo-reveal.json */}
      <div style={{ position: 'absolute', transform: `scale(${logo_scale})`, opacity: logo_opacity, width: 200, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12 }}>logo</span>
      </div>
    </div>
  );
}
