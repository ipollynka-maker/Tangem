import { useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';
import React from 'react';

const CARD_W = 520;
const CARD_H = 328;
const CARD_ASPECT = CARD_W / CARD_H;

// One card pass: enters bottom, focuses center, exits top
// passProgress: 0 = just off screen bottom, 0.5 = center focus, 1 = just off screen top
function CardInstance({ passProgress }: { passProgress: number }) {
  const { width, height } = useVideoConfig();

  // Y translation: from below screen to above
  const translateY = interpolate(passProgress, [0, 0.5, 1], [height * 0.72, 0, -height * 0.72]);

  // Perspective tilt: tilted toward viewer from below, flat at center, tilted away on top
  const rotateX = interpolate(passProgress, [0, 0.35, 0.5, 0.65, 1], [28, 6, 0, -6, -28]);

  // Constant slight counter-clockwise tilt (matching card_00.png)
  const rotateZ = interpolate(passProgress, [0, 0.5, 1], [-12, -6, -2]);

  // Scale: smaller when entering/exiting, full size at center
  const scale = interpolate(passProgress, [0, 0.25, 0.5, 0.75, 1], [0.55, 0.85, 1, 0.85, 0.55]);

  // Opacity: fade in/out at extremes
  const opacity = interpolate(passProgress, [0, 0.12, 0.88, 1], [0, 1, 1, 0]);

  const cardW = CARD_W;
  const cardH = CARD_H;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: cardW,
        height: cardH,
        marginLeft: -cardW / 2,
        marginTop: -cardH / 2,
        opacity,
        transform: `translateY(${translateY}px) rotateX(${rotateX}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
        transformOrigin: 'center center',
        backfaceVisibility: 'hidden',
      }}
    >
      <img
        src="card.png"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 24,
          display: 'block',
          objectFit: 'cover',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 8px 24px rgba(0,0,0,0.6)',
        }}
      />
    </div>
  );
}

export function CardScroll() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // We show N card passes across the duration
  // Each pass takes passFrames to complete, with some overlap
  const NUM_PASSES = 4;
  const PASS_DURATION = durationInFrames / (NUM_PASSES - 0.4); // overlap between passes
  const OVERLAP = PASS_DURATION * 0.25;

  const passes = Array.from({ length: NUM_PASSES }, (_, i) => {
    const passStart = i * (PASS_DURATION - OVERLAP);
    const passEnd = passStart + PASS_DURATION;
    const passProgress = (frame - passStart) / PASS_DURATION;
    return { passProgress, i };
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at 60% 40%, #1a1a1f 0%, #0a0a0d 60%, #050507 100%)',
        overflow: 'hidden',
        perspective: '1200px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
        }}
      >
        {passes.map(({ passProgress, i }) =>
          passProgress >= -0.05 && passProgress <= 1.05 ? (
            <CardInstance key={i} passProgress={Math.max(0, Math.min(1, passProgress))} />
          ) : null
        )}
      </div>
    </div>
  );
}
