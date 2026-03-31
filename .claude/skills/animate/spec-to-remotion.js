// .claude/skills/animate/spec-to-remotion.js
'use strict';

const EASING_FN = {
  spring_overshoot: 'Easing.out(Easing.ease)',
  spring_bounce:    'Easing.out(Easing.ease)',
  bounce:           'Easing.out(Easing.ease)',
  ease_in_out: 'Easing.inOut(Easing.ease)',
  ease_in:     'Easing.in(Easing.ease)',
  ease_out:    'Easing.out(Easing.ease)',
  linear:      'Easing.linear',
  custom:      'Easing.linear',
};

/** Pascal-case a kebab-case name: 'card-enter' → 'CardEnter' */
function toPascalCase(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

/** Camel-case a kebab/hyphen id to a valid JS identifier: 'visa-card' → 'visaCard' */
function toVarId(id) {
  return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// ─── Timing helpers ───────────────────────────────────────────────────────────

function layerStartFrame(layer, fps, phases) {
  if (layer.start_at != null) return Math.round(layer.start_at * fps);
  if (layer.frame_range) return layer.frame_range[0];
  if (layer.phase && phases) {
    const p = phases.find(p => p.id === layer.phase);
    if (p) return Math.round(p.start * fps);
  }
  return 0;
}

function layerEndFrameExpr(layer, fps, phases) {
  // Returns a JS expression string (may reference durationInFrames)
  if (layer.frame_range) return String(layer.frame_range[1]);
  if (layer.phase && phases) {
    const p = phases.find(p => p.id === layer.phase);
    if (p) return String(Math.round(p.end * fps));
  }
  return 'durationInFrames';
}

// ─── Value expression generator ───────────────────────────────────────────────

/** Generate the value expression for one layer property. */
function layerValueExpr(layer, spec) {
  const { fps, phases } = spec;
  const startFrame = layerStartFrame(layer, fps, phases);
  const endExpr    = layerEndFrameExpr(layer, fps, phases);
  const isSpring   = layer.easing === 'spring_overshoot' || layer.easing === 'spring_bounce' || layer.easing === 'bounce';
  const easing     = EASING_FN[layer.easing] || 'Easing.linear';

  // Spring — one-directional, can't do to_final. Fall back to interpolate if to_final is set.
  if (isSpring && layer.to_final === undefined && !layer.keyframes) {
    const { stiffness = 200, damping = 22, mass = 1 } = layer.spring || {};
    const range = layer.to - layer.from;
    // Math.max(0, ...) prevents spring from animating before startFrame
    return `spring({ frame: Math.max(0, frame - ${startFrame}), fps, config: { stiffness: ${stiffness}, damping: ${damping}, mass: ${mass} } }) * ${range} + ${layer.from}`;
  }

  // Multi-stop keyframes
  if (layer.keyframes && layer.keyframe_positions) {
    const frames = layer.keyframe_positions.map(pos =>
      startFrame === 0 && endExpr === 'durationInFrames'
        ? `Math.round(${pos} * durationInFrames)`
        : `Math.round(${startFrame} + ${pos} * (${endExpr} - ${startFrame}))`
    );
    return `interpolate(frame, [${frames.join(', ')}], [${layer.keyframes.join(', ')}], { easing: ${easing}, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`;
  }

  if (layer.to_final !== undefined) {
    const midExpr = `Math.round(${startFrame} + (${endExpr} - ${startFrame}) * 0.6)`;
    return `interpolate(frame, [${startFrame}, ${midExpr}, ${endExpr}], [${layer.from}, ${layer.to}, ${layer.to_final}], { easing: ${easing}, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`;
  }

  return `interpolate(frame, [${startFrame}, ${endExpr}], [${layer.from}, ${layer.to}], { easing: ${easing}, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`;
}

/** Build transform string for non-opacity properties of one layer id. */
function transformExpr(layers, id) {
  return layers
    .filter(l => l.id === id && l.property !== 'opacity')
    .map((l) => {
      const varName = `${toVarId(l.id)}_${l.property}`;
      if (l.property.startsWith('translate')) return `${l.property}(\${${varName}}px)`;
      if (l.property.startsWith('rotate'))    return `${l.property}(\${${varName}}deg)`;
      return `${l.property}(\${${varName}})`;
    })
    .join(' ');
}

function specToRemotionTsx(spec) {
  const componentName = toPascalCase(spec.name);
  const renderLayers = spec.layers.filter(l => l.render_compatible !== false);

  const isSpring = l => (l.easing === 'spring_overshoot' || l.easing === 'spring_bounce' || l.easing === 'bounce') && l.to_final === undefined && !l.keyframes;
  const needsSpring     = renderLayers.some(isSpring);
  const needsInterp     = renderLayers.some(l => !isSpring(l));
  const needsStaticFile = Object.keys(spec.assets || {}).length > 0;

  const remotionImports = [
    'useCurrentFrame', 'useVideoConfig',
    needsStaticFile && 'staticFile',
    needsInterp && 'interpolate',
    needsInterp && 'Easing',
    needsSpring && 'spring',
  ].filter(Boolean).join(', ');

  const valueDecls = renderLayers.map(l =>
    `  const ${toVarId(l.id)}_${l.property} = ${layerValueExpr(l, spec)};`
  ).join('\n');

  const layerIds = [...new Set(renderLayers.map(l => l.id))];

  const jsxElements = layerIds.map(id => {
    const props = renderLayers.filter(l => l.id === id);
    const opacity = props.find(l => l.property === 'opacity');
    const transforms = transformExpr(props, id);
    const assetPath = spec.assets?.[id];
    const varId = toVarId(id);

    const styleLines = [
      `position: 'absolute'`,
      transforms && `transform: \`${transforms}\``,
      opacity && `opacity: ${varId}_opacity`,
    ].filter(Boolean).join(', ');

    if (assetPath) {
      return `      <img src={staticFile('${assetPath}')} style={{ ${styleLines} }} alt="${id}" />`;
    }
    return `      {/* placeholder — set assets.${id} in specs/${spec.name}.json */}
      <div style={{ ${styleLines}, width: 200, height: 100, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 12 }}>${id}</span>
      </div>`;
  }).join('\n');

  return `import React from 'react';
import { ${remotionImports} } from 'remotion';

export function ${componentName}() {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

${valueDecls}

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
${jsxElements}
    </div>
  );
}
`;
}

module.exports = { specToRemotionTsx };
