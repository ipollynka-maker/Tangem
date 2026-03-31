import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile } from 'remotion';

export function CharBounce() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({ frame, fps, config: { stiffness: 380, damping: 9, mass: 1 } });
  const translateY = (1 - s) * 500;
  const squash = spring({ frame, fps, config: { stiffness: 380, damping: 9, mass: 1 } });
  const scaleY = interpolate(squash, [0, 0.5, 1], [0.7, 1.08, 1]);
  const scaleX = interpolate(squash, [0, 0.5, 1], [1.2, 0.95, 1]);
  const opacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', background: '#f5f0ff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <img
        src={staticFile('character.png')}
        style={{
          height: '85%',
          width: 'auto',
          transform: `translateY(${translateY}px) scaleX(${scaleX}) scaleY(${scaleY})`,
          opacity,
          objectFit: 'contain',
          transformOrigin: 'bottom center',
        }}
        alt="character"
      />
    </div>
  );
}
