import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Easing, staticFile } from 'remotion';

export function CharSlideIn() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const translateX = interpolate(frame, [0, 22], [-700, 0], {
    easing: Easing.out(Easing.cubic),
    extrapolateRight: 'clamp',
  });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ width: '100%', height: '100%', background: '#e8f4f0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
      <img
        src={staticFile('character.png')}
        style={{
          height: '85%',
          width: 'auto',
          transform: `translateX(${translateX}px)`,
          opacity,
          objectFit: 'contain',
        }}
        alt="character"
      />
    </div>
  );
}
