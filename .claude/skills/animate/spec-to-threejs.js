// spec-to-threejs.js — converts pipeline spec → Three.js scene module
// Output: ES module that creates a renderer/scene/camera + GSAP-driven animation
'use strict';

const GSAP_EASE = {
  ease_in_out:      'power2.inOut',
  ease_out:         'power2.out',
  ease_in:          'power2.in',
  linear:           'none',
  spring_bounce:    'back.out(1.7)',
  spring_overshoot: 'back.out(2.5)',
};

function toPascal(name) {
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('');
}

function layerDuration(layer, spec) {
  if (layer.frame_range) return +((layer.frame_range[1] - layer.frame_range[0]) / spec.fps).toFixed(3);
  if (layer.phase && spec.phases) {
    const p = spec.phases.find(p => p.id === layer.phase);
    if (p) return +(p.end - p.start).toFixed(3);
  }
  return spec.duration;
}

function layerDelay(layer, spec) {
  if (layer.start_at != null) return layer.start_at;
  if (layer.frame_range) return +(layer.frame_range[0] / spec.fps).toFixed(3);
  if (layer.phase && spec.phases) {
    const p = spec.phases.find(p => p.id === layer.phase);
    if (p) return p.start;
  }
  return 0;
}

// Map spec property → Three.js object path + unit conversion
function mapProperty(property) {
  const MAP = {
    translateX:   { path: 'position.x',   scale: 0.01 },  // spec px → Three units
    translateY:   { path: 'position.y',   scale: -0.01 }, // invert Y (Three Y is up)
    translateZ:   { path: 'position.z',   scale: 0.01 },
    rotateX:      { path: 'rotation.x',   scale: Math.PI / 180 }, // deg → rad
    rotateY:      { path: 'rotation.y',   scale: Math.PI / 180 },
    rotateZ:      { path: 'rotation.z',   scale: Math.PI / 180 },
    scale:        { path: 'scale.x',      scale: 1, also: ['scale.y', 'scale.z'] },
    scaleX:       { path: 'scale.x',      scale: 1 },
    scaleY:       { path: 'scale.y',      scale: 1 },
    opacity:      { path: 'material.opacity', scale: 1 },
  };
  return MAP[property] || { path: property, scale: 1 };
}

function specToThreejs(spec) {
  const fnName = `create${toPascal(spec.name)}Scene`;
  const layers = (spec.layers || []).filter(l => l.render_compatible !== false);
  const uniqueIds = [...new Set(layers.map(l => l.id))];
  const has3d = spec['3d'];
  const camConfig = spec.camera || {};
  const fov = camConfig.fov || 60;
  const camPos = camConfig.position || [0, 0, 5];
  const perspective = (spec['3d'] && spec['3d'].perspective) || 1000;

  // Create objects
  const objectCreation = uniqueIds.map(id => {
    const hasOpacity = layers.some(l => l.id === id && l.property === 'opacity');
    const hasZ = layers.some(l => l.id === id && (l.property === 'translateZ' || l.property.startsWith('rotate')));
    const asset = spec.assets && spec.assets[id];
    const geo = asset ? 'new THREE.PlaneGeometry(1.5, 2)' : 'new THREE.BoxGeometry(1.5, 2, 0.05)';
    const mat = hasOpacity
      ? `new THREE.MeshStandardMaterial({ color: 0x888888, transparent: true, opacity: 1 })`
      : `new THREE.MeshStandardMaterial({ color: 0x888888 })`;
    return `  const ${id.replace(/-/g, '_')}Mesh = new THREE.Mesh(${geo}, ${mat});\n  scene.add(${id.replace(/-/g, '_')}Mesh);`;
  }).join('\n');

  // Create GSAP tweens
  const tweens = layers.map(layer => {
    const varName = layer.id.replace(/-/g, '_') + 'Mesh';
    const { path, scale, also } = mapProperty(layer.property);
    const dur = layerDuration(layer, spec);
    const delay = layerDelay(layer, spec);
    const ease = GSAP_EASE[layer.easing] || 'power2.out';

    if (layer.keyframes && layer.keyframe_positions) {
      const kfParts = path.split('.');
      const kfTarget = kfParts.length > 1 ? `${varName}.${kfParts.slice(0, -1).join('.')}` : varName;
      const kfProp = kfParts[kfParts.length - 1];
      const kfObjs = layer.keyframes.map(v => JSON.stringify({ [kfProp]: +(v * scale).toFixed(4), ease })).join(', ');
      return `  tl.to(${kfTarget}, { keyframes: [${kfObjs}], duration: ${dur} }, ${delay});`;
    }

    const from = +(layer.from * scale).toFixed(4);
    const to   = +(layer.to   * scale).toFixed(4);
    const pathParts = path.split('.');
    const obj = pathParts.slice(0, -1).join('.');
    const prop = pathParts[pathParts.length - 1];

    // When path has no dots (unknown fallback property), tween the mesh directly
    const target = obj ? `${varName}.${obj}` : varName;

    // Spring
    if (layer.easing === 'spring_bounce' || layer.easing === 'spring_overshoot') {
      const s = layer.spring || {};
      const stiff = s.stiffness || (layer.easing === 'spring_bounce' ? 180 : 260);
      const damp  = s.damping   || (layer.easing === 'spring_bounce' ? 14  : 24);
      const comment = `// ~spring: stiffness ${stiff}, damping ${damp}`;
      return `  tl.from(${target}, { ${prop}: ${from}, duration: ${dur}, ease: '${ease}' }, ${delay}); ${comment}`;
    }

    let line = `  tl.from(${target}, { ${prop}: ${from}, duration: ${dur}, ease: '${ease}' }, ${delay});`;
    if (also) {
      also.forEach(p => {
        const ap = p.split('.').pop();
        line += `\n  tl.from(${varName}.${p.split('.').slice(0,-1).join('.')}, { ${ap}: ${from}, duration: ${dur}, ease: '${ease}' }, ${delay});`;
      });
    }
    return line;
  }).join('\n');

  return `/**
 * ${spec.name} — Three.js scene
 * Generated by the animate pipeline. Edit freely.
 *
 * Install: npm install three gsap
 * Duration: ${spec.duration}s  FPS: ${spec.fps}
 */

import * as THREE from 'three';
import { gsap } from 'gsap';

/**
 * @param {HTMLElement} container
 * @returns {{ renderer, scene, camera, tl, play, dispose }}
 */
export function ${fnName}(container) {
  // ─── Renderer ────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // ─── Scene ───────────────────────────────────────────────
  const scene = new THREE.Scene();

  // ─── Camera ──────────────────────────────────────────────
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(${fov}, aspect, 0.1, 1000);
  camera.position.set(${camPos[0]}, ${camPos[1]}, ${camPos[2]});

  // ─── Lights ──────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
  dirLight.position.set(2, 4, 3);
  scene.add(dirLight);

  // ─── Objects (one mesh per spec layer id) ────────────────
${objectCreation}

  // ─── Animation timeline ──────────────────────────────────
  const tl = gsap.timeline({ paused: true });

${tweens}

  // ─── Render loop ─────────────────────────────────────────
  let rafId;
  function animate() {
    rafId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  // ─── Resize ──────────────────────────────────────────────
  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return {
    renderer,
    scene,
    camera,
    tl,
    play: () => tl.play(),
    dispose: () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}
`;
}

module.exports = { specToThreejs };
