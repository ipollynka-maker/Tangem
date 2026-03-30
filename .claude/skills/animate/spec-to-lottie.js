// .claude/skills/animate/spec-to-lottie.js
'use strict';

const EASING_PRESETS = {
  spring_overshoot: { i: { x: [0.2], y: [1.3] }, o: { x: [0.4], y: [0.0] } },
  bounce:           { i: { x: [0.2], y: [1.5] }, o: { x: [0.4], y: [0.0] } },
  ease_in_out:      { i: { x: [0.2], y: [1.0] }, o: { x: [0.4], y: [0.0] } },
  ease_in:          { i: { x: [1.0], y: [1.0] }, o: { x: [0.4], y: [0.0] } },
  ease_out:         { i: { x: [0.2], y: [1.0] }, o: { x: [0.0], y: [0.0] } },
  linear:           { i: { x: [1.0], y: [1.0] }, o: { x: [0.0], y: [0.0] } },
};

function buildKeyframes(layer, totalFrames, fps) {
  const startFrame = Math.round((layer.start_at || 0) * fps);
  const ease = EASING_PRESETS[layer.easing] || EASING_PRESETS.ease_in_out;
  const isOpacity = layer.property === 'opacity';
  const scale = isOpacity ? 100 : 1;

  if (layer.to_final !== undefined) {
    const midFrame = Math.round(startFrame + (totalFrames - startFrame) * 0.6);
    return [
      { t: startFrame, s: [layer.from * scale], e: [layer.to * scale],       ...ease },
      { t: midFrame,   s: [layer.to * scale],   e: [layer.to_final * scale],  ...ease },
      { t: totalFrames, s: [layer.to_final * scale] },
    ];
  }
  return [
    { t: startFrame,   s: [layer.from * scale], e: [layer.to * scale], ...ease },
    { t: totalFrames,  s: [layer.to * scale] },
  ];
}

function buildLottieLayer(layer, index, spec) {
  const totalFrames = Math.round(spec.duration * spec.fps);
  const kf = buildKeyframes(layer, totalFrames, spec.fps);
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
    default:           ks.p = { a: 1, k: kf };
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

function specToLottie(spec) {
  const totalFrames = Math.round(spec.duration * spec.fps);
  const assets = Object.entries(spec.assets || {}).map(([, path], i) => ({
    id: `image_${i}`, u: '', p: path, e: 0,
  }));
  const layers = spec.layers
    .filter(l => l.lottie_compatible)
    .map((layer, i) => buildLottieLayer(layer, i, spec));

  return {
    v: '5.7.4', fr: spec.fps,
    ip: 0, op: totalFrames,
    w: 1294, h: 720,
    nm: spec.name, ddd: 0,
    assets, layers, markers: [],
  };
}

module.exports = { specToLottie };
