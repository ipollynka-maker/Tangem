import { useCurrentFrame, useVideoConfig, interpolate, Easing, staticFile } from 'remotion';
import React from 'react';

// 3:4 portrait card — matches 1536×2048 source images
const CARD_W = 420;
const CARD_H = 560;

// Images cycle per pass
const IMAGES = ['1.png', '2.png', '3.png'];

// Number of card passes across the 6-second composition
const NUM_PASSES = 4;

function CardPass({ passProgress, src }: { passProgress: number; src: string }) {
  const { width, height } = useVideoConfig();
  const ease = Easing.inOut(Easing.ease);

  // Vertical travel: enter from below center, exit above center
  const translateY = interpolate(
    passProgress,
    [0, 0.5, 1],
    [height * 0.75, 0, -height * 0.75],
    { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 3D tilt: tilted toward viewer on entry, flat at peak, tilted away on exit
  const rotateX = interpolate(
    passProgress,
    [0, 0.3, 0.5, 0.7, 1],
    [30, 8, 0, -8, -30],
    { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Slight counter-clockwise lean that straightens on exit
  const rotateZ = interpolate(
    passProgress,
    [0, 0.5, 1],
    [-10, -5, -2],
    { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Scale: small on entry/exit, full at center
  const scale = interpolate(
    passProgress,
    [0, 0.22, 0.5, 0.78, 1],
    [0.5, 0.82, 1, 0.82, 0.5],
    { easing: ease, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Fade in/out at extremes
  const opacity = interpolate(
    passProgress,
    [0, 0.1, 0.9, 1],
    [0, 1, 1, 0],
    { easing: Easing.out(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: CARD_W,
        height: CARD_H,
        marginLeft: -CARD_W / 2,
        marginTop: -CARD_H / 2,
        opacity,
        transform: `translateY(${translateY}px) rotateX(${rotateX}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
        transformOrigin: 'center center',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* TODO: customize shadow color or add a glow per-image for brand variety */}
      <img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 20,
          display: 'block',
          objectFit: 'cover',
          boxShadow: '0 28px 72px rgba(0,0,0,0.85), 0 8px 20px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}

export function Cards() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Each pass gets an equal slice, with 25% overlap between consecutive passes
  const PASS_DURATION = durationInFrames / (NUM_PASSES - 0.4);
  const OVERLAP = PASS_DURATION * 0.25;

  const passes = Array.from({ length: NUM_PASSES }, (_, i) => {
    const passStart = i * (PASS_DURATION - OVERLAP);
    const passProgress = (frame - passStart) / PASS_DURATION;
    return { passProgress, src: IMAGES[i % IMAGES.length] };
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(ellipse at 55% 40%, #1c1c22 0%, #0d0d10 55%, #06060a 100%)',
        overflow: 'hidden',
        perspective: '1400px',
        perspectiveOrigin: '50% 50%',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d' }}>
        {passes.map(({ passProgress, src }, i) =>
          passProgress >= -0.05 && passProgress <= 1.05 ? (
            <CardPass
              key={i}
              passProgress={Math.max(0, Math.min(1, passProgress))}
              src={src}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
