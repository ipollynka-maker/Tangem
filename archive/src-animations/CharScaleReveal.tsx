import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing, staticFile } from 'remotion';

export function CharScaleReveal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { stiffness: 260, damping: 22, mass: 1 } });
  const scale = interpolate(s, [0, 1], [0.3, 1]);
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={staticFile('character.png')}
        style={{
          height: '80%',
          width: 'auto',
          transform: `scale(${scale})`,
          opacity,
          objectFit: 'contain',
        }}
        alt="character"
      />
    </div>
  );
}
