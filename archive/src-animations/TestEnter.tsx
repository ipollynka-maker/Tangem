import React from 'react';
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

export function TestEnter() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const box_translateY = spring({ frame: frame - 0, fps, config: { stiffness: 200, damping: 22, mass: 1 } }) * -100 + 100;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* placeholder — set assets.box in specs/test-enter.json */}
      <div style={{ position: 'absolute', transform: `translateY(${box_translateY}px)`, width: 200, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12 }}>box</span>
      </div>
    </div>
  );
}
