import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, staticFile } from 'remotion';

// GIF 1: Music recognition UI
// Phase 1 (0-25):   Phone enters from bottom
// Phase 2 (25-75):  Album thumbnails orbit around "Распознаем трек" text
// Phase 3 (75-90):  Thumbnails collapse inward and vanish
// Phase 4 (90-120): Result screen fades in

const ALBUM_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
const NUM = 6;
const RADIUS = 62;
const THUMB = 36;

export function Gif1PhoneReveal() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Phase 1: phone enters ──────────────────────────────────────────────────
  const phoneSpring = spring({ frame, fps, config: { stiffness: 140, damping: 18 } });
  const phoneY = (1 - phoneSpring) * 280;
  const phoneOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  // ── Phase 2: screen fades in ───────────────────────────────────────────────
  const screenOpacity = interpolate(frame, [22, 32], [0, 1], { extrapolateRight: 'clamp' });

  // ── Orbit progress ─────────────────────────────────────────────────────────
  // Thumbnails orbit from frame 28 to 75, then collapse 75-90
  const orbitProgress = interpolate(frame, [28, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const collapseProgress = interpolate(frame, [75, 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Orbit: full 360° over 47 frames
  const orbitAngle = orbitProgress * 360;

  // ── Phase 4: result screen ─────────────────────────────────────────────────
  const resultOpacity = interpolate(frame, [90, 104], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const resultY = interpolate(frame, [90, 104], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Thumbnail enter (stagger per image)
  const thumbs = ALBUM_COLORS.map((color, i) => {
    const baseAngle = (i / NUM) * 360;
    const angle = ((baseAngle + orbitAngle) * Math.PI) / 180;

    const enterDelay = 28 + i * 3;
    const enterSpring = spring({ frame: Math.max(0, frame - enterDelay), fps, config: { stiffness: 220, damping: 24 } });

    // Collapse: move toward center and scale down
    const tx = Math.cos(angle) * RADIUS * (1 - collapseProgress) * enterSpring;
    const ty = Math.sin(angle) * RADIUS * (1 - collapseProgress) * enterSpring;
    const scale = enterSpring * (1 - collapseProgress);
    const opacity = scale;

    return { color, tx, ty, scale, opacity };
  });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(160deg, #111 0%, #1e1e2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'relative',
        width: 260,
        transform: `translateY(${phoneY}px)`,
        opacity: phoneOpacity,
      }}>
        {/* Screen contents */}
        <div style={{
          position: 'absolute',
          top: '2.8%', left: '5%', right: '5%', bottom: '2.8%',
          background: '#000',
          borderRadius: 38,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* Status bar */}
          <div style={{
            position: 'absolute', top: 14, left: 0, right: 0,
            display: 'flex', justifyContent: 'space-between',
            padding: '0 24px', fontSize: 11, color: '#fff',
            fontFamily: '-apple-system, sans-serif',
          }}>
            <span>9:41</span>
            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 8 }}>●●●</span><span>WiFi</span><span>■</span>
            </div>
          </div>

          {/* Main area */}
          <div style={{ opacity: screenOpacity, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

            {/* Orbiting thumbnails */}
            {thumbs.map(({ color, tx, ty, scale, opacity }, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: THUMB, height: THUMB,
                borderRadius: 8,
                background: color,
                transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                opacity,
                boxShadow: `0 4px 16px ${color}66`,
              }} />
            ))}

            {/* Center text */}
            <div style={{
              color: '#fff',
              fontFamily: '-apple-system, SF Pro Display, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              textAlign: 'center',
              lineHeight: 1.4,
              letterSpacing: 0.3,
              zIndex: 2,
              textShadow: '0 0 20px rgba(0,0,0,0.8)',
            }}>
              Распознаем{'\n'}трек
            </div>
          </div>

          {/* Result screen */}
          {frame >= 88 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(160deg, #1a0533 0%, #0d1b4a 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: resultOpacity,
              transform: `translateY(${resultY}px)`,
            }}>
              {/* Album art placeholder */}
              <div style={{
                width: 70, height: 70,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #6c5ce7, #fd79a8)',
                boxShadow: '0 8px 32px rgba(108,92,231,0.5)',
                marginBottom: 4,
              }} />
              <div style={{
                color: '#fff',
                fontFamily: '-apple-system, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}>
                Blinding Lights
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.55)',
                fontFamily: '-apple-system, sans-serif',
                fontSize: 11,
              }}>
                The Weeknd
              </div>
            </div>
          )}
        </div>

        {/* Phone frame on top */}
        <img
          src={staticFile('iphone-frame.png')}
          style={{ width: '100%', position: 'relative', zIndex: 2 }}
          alt="phone"
        />
      </div>
    </div>
  );
}
