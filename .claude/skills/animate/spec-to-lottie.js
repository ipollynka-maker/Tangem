// .claude/skills/animate/spec-to-lottie.js
'use strict';

const EASING_PRESETS = {
  spring_overshoot: { i: { x: [0.2], y: [1.3] }, o: { x: [0.4], y: [0.0] } },
  spring_bounce:    { i: { x: [0.2], y: [1.3] }, o: { x: [0.4], y: [0.0] } },
  bounce:           { i: { x: [0.2], y: [1.5] }, o: { x: [0.4], y: [0.0] } },
  ease_in_out:      { i: { x: [0.2], y: [1.0] }, o: { x: [0.4], y: [0.0] } },
  ease_in:          { i: { x: [1.0], y: [1.0] }, o: { x: [0.4], y: [0.0] } },
  ease_out:         { i: { x: [0.2], y: [1.0] }, o: { x: [0.0], y: [0.0] } },
  linear:           { i: { x: [1.0], y: [1.0] }, o: { x: [0.0], y: [0.0] } },
};

// ─── Timing helpers ───────────────────────────────────────────────────────────

function layerStartFrame(layer, spec) {
  if (layer.start_at != null) return Math.round(layer.start_at * spec.fps);
  if (layer.frame_range) return layer.frame_range[0];
  if (layer.phase && spec.phases) {
    const p = spec.phases.find(p => p.id === layer.phase);
    if (p) return Math.round(p.start * spec.fps);
  }
  return 0;
}

function layerEndFrame(layer, spec) {
  if (layer.frame_range) return layer.frame_range[1];
  if (layer.phase && spec.phases) {
    const p = spec.phases.find(p => p.id === layer.phase);
    if (p) return Math.round(p.end * spec.fps);
  }
  return Math.round(spec.duration * spec.fps);
}

// ─── Keyframe builder ─────────────────────────────────────────────────────────

function buildKeyframes(layer, spec) {
  const startFrame = layerStartFrame(layer, spec);
  const endFrame   = layerEndFrame(layer, spec);
  const ease = EASING_PRESETS[layer.easing] || EASING_PRESETS.ease_in_out;

  const isOpacity = layer.property === 'opacity';
  // Lottie scale and opacity are percentages (100 = 100% / fully opaque)
  const isScale = layer.property === 'scale' || layer.property === 'scaleX' || layer.property === 'scaleY';
  const mult = (isOpacity || isScale) ? 100 : 1;

  // Multi-stop keyframe path
  if (layer.keyframes && layer.keyframe_positions) {
    return layer.keyframe_positions.map((pos, i) => {
      const frame = Math.round(startFrame + (endFrame - startFrame) * pos);
      const val   = layer.keyframes[i] * mult;
      const next  = layer.keyframes[i + 1];
      if (next !== undefined) {
        return { t: frame, s: [val], e: [next * mult], ...ease };
      }
      return { t: frame, s: [val] };
    });
  }

  if (layer.to_final !== undefined) {
    const midFrame = Math.round(startFrame + (endFrame - startFrame) * 0.6);
    return [
      { t: startFrame, s: [layer.from * mult], e: [layer.to * mult],       ...ease },
      { t: midFrame,   s: [layer.to * mult],   e: [layer.to_final * mult],  ...ease },
      { t: endFrame,   s: [layer.to_final * mult] },
    ];
  }

  return [
    { t: startFrame, s: [layer.from * mult], e: [layer.to * mult], ...ease },
    { t: endFrame,   s: [layer.to * mult] },
  ];
}

// ─── Layer builder ────────────────────────────────────────────────────────────

function buildLottieLayer(layer, index, spec) {
  const kf = buildKeyframes(layer, spec);
  const totalFrames = Math.round(spec.duration * spec.fps);
  const ks = {};

  switch (layer.property) {
    case 'translateY': ks.p = { a: 1, k: kf.map(k => ({ ...k,
      s: k.s ? [0, k.s[0], 0] : undefined,
      e: k.e ? [0, k.e[0], 0] : undefined,
    }))}; break;
    case 'translateX': ks.p = { a: 1, k: kf.map(k => ({ ...k,
      s: k.s ? [k.s[0], 0, 0] : undefined,
      e: k.e ? [k.e[0], 0, 0] : undefined,
    }))}; break;
    case 'opacity':    ks.o = { a: 1, k: kf }; break;
    case 'scale':      ks.s = { a: 1, k: kf.map(k => ({ ...k,
      s: k.s ? [k.s[0], k.s[0], 100] : undefined,
      e: k.e ? [k.e[0], k.e[0], 100] : undefined,
    }))}; break;
    case 'rotate':
    case 'rotateZ':    ks.r = { a: 1, k: kf }; break;
    default:
      console.warn(`[spec-to-lottie] unknown property "${layer.property}", treating as translateX`);
      ks.p = { a: 1, k: kf.map(k => ({ ...k,
        s: k.s ? [k.s[0], 0, 0] : undefined,
        e: k.e ? [k.e[0], 0, 0] : undefined,
      }))};
      break;
  }

  const assetIndex = Object.keys(spec.assets || {}).indexOf(layer.id);
  const layer_ = {
    ddd: 0, ind: index + 1,
    ty: assetIndex >= 0 ? 2 : 4,
    nm: layer.id, ks, ao: 0,
    ip: 0, op: totalFrames, st: 0, bm: 0,
  };
  if (assetIndex >= 0) layer_.refId = `image_${assetIndex}`;
  return layer_;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

function specToLottie(spec) {
  const totalFrames = Math.round(spec.duration * spec.fps);
  const assets = Object.entries(spec.assets || {}).map(([, path], i) => ({
    id: `image_${i}`, u: '', p: path, e: 0,
  }));
  const layers = spec.layers
    .filter(l => l.lottie_compatible !== false)
    .map((layer, i) => buildLottieLayer(layer, i, spec));

  return {
    v: '5.7.4', fr: spec.fps,
    ip: 0, op: totalFrames,
    w: spec.width  || 1294,
    h: spec.height || 720,
    nm: spec.name, ddd: 0,
    assets, layers, markers: [],
  };
}

module.exports = { specToLottie };
