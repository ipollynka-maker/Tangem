import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Easing, staticFile } from 'remotion';

export function CharSpringEnter() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const y = spring({ frame, fps, config: { stiffness: 160, damping: 16, mass: 1 } });
  const translateY = (1 - y) * 300;
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', background: '#f0ede8', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <img
        src={staticFile('character.png')}
        style={{
          height: '85%',
          width: 'auto',
          transform: `translateY(${translateY}px)`,
          opacity,
          objectFit: 'contain',
        }}
        alt="character"
      />
    </div>
  );
}
