// .claude/skills/animate/spec-to-remotion.js
'use strict';

const EASING_FN = {
  spring_overshoot: 'Easing.out(Easing.ease)',
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

/** Generate the value expression for one layer property. */
function layerValueExpr(layer, fps) {
  const startFrame = Math.round((layer.start_at || 0) * fps);
  const isSpring = layer.easing === 'spring_overshoot' || layer.easing === 'bounce';

  // Spring is one-directional — can't do to_final. Fall back to interpolate if to_final is set.
  if (isSpring && layer.to_final === undefined) {
    const { stiffness = 200, damping = 22, mass = 1 } = layer.spring || {};
    const range = layer.to - layer.from;
    return `spring({ frame: frame - ${startFrame}, fps, config: { stiffness: ${stiffness}, damping: ${damping}, mass: ${mass} } }) * ${range} + ${layer.from}`;
  }

  const easing = EASING_FN[layer.easing] || 'Easing.linear';
  if (layer.to_final !== undefined) {
    const midFrame = `Math.round(durationInFrames * 0.6)`;
    return `interpolate(frame, [${startFrame}, ${midFrame}, durationInFrames], [${layer.from}, ${layer.to}, ${layer.to_final}], { easing: ${easing}, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`;
  }
  return `interpolate(frame, [${startFrame}, durationInFrames], [${layer.from}, ${layer.to}], { easing: ${easing}, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })`;
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
  const fps = spec.fps;
  const renderLayers = spec.layers.filter(l => l.render_compatible);

  const needsSpring     = renderLayers.some(l => (l.easing === 'spring_overshoot' || l.easing === 'bounce') && l.to_final === undefined);
  const needsInterp     = renderLayers.some(l => !(l.easing === 'spring_overshoot' || l.easing === 'bounce') || l.to_final !== undefined);
  const needsStaticFile = Object.keys(spec.assets || {}).length > 0;

  const remotionImports = [
    'useCurrentFrame', 'useVideoConfig',
    needsStaticFile && 'staticFile',
    needsInterp && 'interpolate',
    needsInterp && 'Easing',
    needsSpring && 'spring',
  ].filter(Boolean).join(', ');

  const valueDecls = renderLayers.map(l =>
    `  const ${toVarId(l.id)}_${l.property} = ${layerValueExpr(l, fps)};`
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
