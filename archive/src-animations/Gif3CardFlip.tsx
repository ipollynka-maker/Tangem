import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

// GIF 3: Visa-style card designs, one at a time, flipping in 3D on dark background

const CARDS = [
  {
    bg: 'linear-gradient(135deg, #1a1040 0%, #2d1b6e 100%)',
    accent: '#c8a84b',
    pattern: 'snake',
    label: 'TANGEM',
    num: '4892 1234 5678 9010',
  },
  {
    bg: 'linear-gradient(135deg, #7b2ff7 0%, #f107a3 100%)',
    accent: '#fff',
    pattern: 'abstract',
    label: 'TANGEM',
    num: '4892 9876 5432 1000',
  },
  {
    bg: 'linear-gradient(135deg, #c8f507 0%, #a0d400 100%)',
    accent: '#000',
    pattern: 'topographic',
    label: 'TANGEM',
    num: '4892 5555 6666 7777',
  },
  {
    bg: 'linear-gradient(135deg, #e8e8e8 0%, #f8f8f8 100%)',
    accent: '#333',
    pattern: 'minimal',
    label: 'TANGEM',
    num: '4892 0000 1111 2222',
  },
];

const CARD_DURATION = 55;
const FLIP_FRAMES = 18;

function CreditCard({ bg, accent, pattern, label, num }: any) {
  return (
    <div style={{
      width: 380, height: 240,
      borderRadius: 18,
      background: bg,
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)',
    }}>
      {pattern === 'topographic' && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.25,
          backgroundImage: `repeating-radial-gradient(circle at 60% 50%, transparent 0, transparent 20px, rgba(0,0,0,0.2) 20px, rgba(0,0,0,0.2) 22px)`,
        }} />
      )}
      {pattern === 'snake' && (
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.2,
          backgroundImage: `repeating-linear-gradient(45deg, #c8a84b 0, #c8a84b 2px, transparent 0, transparent 50%)`,
          backgroundSize: '12px 12px',
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <span style={{ color: accent, fontFamily: '-apple-system, sans-serif', fontSize: 13, fontWeight: 600, letterSpacing: 1.5, opacity: 0.9 }}>{label}</span>
        <span style={{ color: accent, fontFamily: 'serif', fontWeight: 700, fontSize: 18 }}>VISA</span>
      </div>

      <div style={{
        width: 38, height: 28, borderRadius: 5,
        background: `linear-gradient(135deg, ${accent}55, ${accent}99)`,
        border: `1px solid ${accent}66`,
        position: 'relative', zIndex: 1,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ color: accent, fontFamily: 'monospace', fontSize: 14, letterSpacing: 3, marginBottom: 8 }}>
          {num}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: accent, fontSize: 11, opacity: 0.7, fontFamily: '-apple-system, sans-serif' }}>VALID THRU 12/28</span>
          <span style={{ color: accent, fontSize: 11, opacity: 0.7, fontFamily: '-apple-system, sans-serif' }}>CARDHOLDER</span>
        </div>
      </div>
    </div>
  );
}

export function Gif3CardFlip() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIdx = Math.floor(frame / CARD_DURATION) % CARDS.length;
  const nextIdx = (cardIdx + 1) % CARDS.length;
  const frameInCard = frame % CARD_DURATION;

  const flipStart = CARD_DURATION - FLIP_FRAMES;
  const isFlipping = frameInCard >= flipStart;
  const flipFrame = frameInCard - flipStart;
  const halfFlip = FLIP_FRAMES / 2;

  // Subtle float
  const floatY = Math.sin(frame / 35) * 5;
  const floatX = Math.cos(frame / 50) * 3;

  let displayCard = cardIdx;
  let rotateY: number;

  if (!isFlipping) {
    // Resting: gentle tilt
    rotateY = floatX * 0.8;
  } else if (flipFrame < halfFlip) {
    // Current card flips out (0 → 90)
    rotateY = interpolate(flipFrame, [0, halfFlip], [floatX * 0.8, 90], { extrapolateRight: 'clamp' });
  } else {
    // Next card flips in (−90 → 0)
    displayCard = nextIdx;
    rotateY = interpolate(flipFrame, [halfFlip, FLIP_FRAMES], [-90, 0], { extrapolateRight: 'clamp' });
  }

  // Entry spring on first appearance of each card
  const entryFrame = isFlipping && flipFrame >= halfFlip ? flipFrame - halfFlip : frameInCard;
  const entrySpring = spring({ frame: Math.min(entryFrame, 20), fps, config: { stiffness: 200, damping: 26 } });
  const entryScale = interpolate(entrySpring, [0, 1], [0.88, 1]);

  const card = CARDS[displayCard];

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        perspective: 1000,
        transform: `translateY(${floatY}px)`,
      }}>
        <div style={{
          transform: `rotateY(${rotateY}deg) scale(${entryScale})`,
          transformStyle: 'preserve-3d',
        }}>
          <CreditCard {...card} />
        </div>
      </div>
    </div>
  );
}
