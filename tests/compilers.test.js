// tests/compilers.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { specToLottie } = require('../.claude/skills/animate/spec-to-lottie.js');

const SAMPLE_SPEC = {
  name: 'card-enter',
  duration: 1.0,
  fps: 30,
  lottie_compatible: true,
  assets: { card: 'card.png' },
  layers: [
    {
      id: 'card',
      property: 'translateY',
      from: 100,
      to: 0,
      easing: 'spring_overshoot',
      render_compatible: true,
      lottie_compatible: true,
    },
    {
      id: 'shimmer',
      property: 'opacity',
      from: 0,
      to: 1,
      to_final: 0,
      start_at: 0.5,
      easing: 'ease_in_out',
      render_compatible: true,
      lottie_compatible: true,
    },
  ],
};

test('specToLottie: output has correct Lottie v5 envelope', () => {
  const lottie = specToLottie(SAMPLE_SPEC);
  assert.equal(lottie.v, '5.7.4');
  assert.equal(lottie.fr, 30);
  assert.equal(lottie.ip, 0);
  assert.equal(lottie.op, 30); // 1.0s * 30fps
  assert.equal(lottie.nm, 'card-enter');
});

test('specToLottie: skips layers where lottie_compatible is false', () => {
  const spec = { ...SAMPLE_SPEC, layers: [
    { ...SAMPLE_SPEC.layers[0], lottie_compatible: false },
  ]};
  const lottie = specToLottie(spec);
  assert.equal(lottie.layers.length, 0);
});

test('specToLottie: opacity layer uses 0-100 range', () => {
  const spec = { ...SAMPLE_SPEC, assets: {}, layers: [
    { id: 'el', property: 'opacity', from: 0, to: 1, easing: 'ease_in_out',
      render_compatible: true, lottie_compatible: true },
  ]};
  const lottie = specToLottie(spec);
  const opacityLayer = lottie.layers[0];
  const kf = opacityLayer.ks.o.k[0];
  assert.equal(kf.s[0], 0);   // 0 * 100
  assert.equal(kf.e[0], 100); // 1 * 100
});

test('specToLottie: assets array populated from spec.assets', () => {
  const lottie = specToLottie(SAMPLE_SPEC);
  assert.ok(lottie.assets.length >= 1);
  assert.equal(lottie.assets[0].p, 'card.png');
});
