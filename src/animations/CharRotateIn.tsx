import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile } from 'remotion';

export function CharRotateIn() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { stiffness: 120, damping: 14, mass: 1 } });
  const rotate = interpolate(s, [0, 1], [-18, 0]);
  const scale = interpolate(s, [0, 1], [0.6, 1]);
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', background: '#fff8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={staticFile('character.png')}
        style={{
          height: '80%',
          width: 'auto',
          transform: `rotate(${rotate}deg) scale(${scale})`,
          opacity,
          objectFit: 'contain',
          transformOrigin: 'bottom center',
        }}
        alt="character"
      />
    </div>
  );
}
