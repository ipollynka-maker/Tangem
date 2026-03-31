// spec-to-html.js — generates a standalone HTML demo for 3D (and 2D) animations
// Auto-detects mode from spec["3d"].type: "css3d" | "threejs" | "parallax"
// Falls back to css3d if spec has 3D properties but no explicit type.
'use strict';

const GSAP_EASE = {
  ease_in_out:      'power2.inOut',
  ease_out:         'power2.out',
  ease_in:          'power2.in',
  linear:           'none',
  spring_bounce:    'back.out(1.7)',
  spring_overshoot: 'back.out(2.5)',
};

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

// ─── CSS 3D mode ──────────────────────────────────────────────────────────────

function buildCss3dHtml(spec) {
  const perspective = (spec['3d'] && spec['3d'].perspective) || 900;
  const layers = (spec.layers || []).filter(l => l.render_compatible !== false);
  const uniqueIds = [...new Set(layers.map(l => l.id))];

  const divs = uniqueIds.map(id =>
    `    <div class="el" id="${id}" data-id="${id}"></div>`
  ).join('\n');

  // Build GSAP tweens — CSS 3D uses px/deg directly, no unit scaling
  const tweens = layers.map(layer => {
    const dur   = layerDuration(layer, spec);
    const delay = layerDelay(layer, spec);
    const ease  = GSAP_EASE[layer.easing] || 'power2.out';
    const id    = JSON.stringify('#' + layer.id);

    const PROP_MAP = {
      translateX: 'x', translateY: 'y', translateZ: 'z',
      rotateX: 'rotateX', rotateY: 'rotateY', rotateZ: 'rotateZ',
      scale: 'scale', scaleX: 'scaleX', scaleY: 'scaleY', opacity: 'opacity',
    };
    const prop = PROP_MAP[layer.property] || layer.property;

    if (layer.keyframes && layer.keyframe_positions) {
      const kfObj = layer.keyframes.map((v, i) => JSON.stringify({ [prop]: v, ease })).join(', ');
      return `    tl.to(${id}, { keyframes: [${kfObj}], duration: ${dur} }, ${delay});`;
    }
    return `    tl.from(${id}, { ${prop}: ${layer.from}, duration: ${dur}, ease: '${ease}' }, ${delay});`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.name} — CSS 3D Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; flex-direction: column; align-items: center;
           justify-content: center; min-height: 100vh; font-family: system-ui; }
    .stage {
      width: ${spec.width || 800}px;
      height: ${spec.height || 600}px;
      perspective: ${perspective}px;
      perspective-origin: 50% 50%;
      position: relative;
      background: #1a1a1a;
      border-radius: 12px;
      overflow: hidden;
    }
    .scene {
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      position: relative;
    }
    .el {
      position: absolute;
      width: 120px;
      height: 160px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
    }
    .controls { margin-top: 20px; display: flex; gap: 12px; }
    button {
      padding: 10px 24px; border: none; border-radius: 8px;
      background: #667eea; color: #fff; cursor: pointer; font-size: 14px;
    }
    button:hover { background: #764ba2; }
    .label { color: #666; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="stage">
    <div class="scene">
${divs}
    </div>
  </div>
  <div class="controls">
    <button onclick="tl.play(0)">Play</button>
    <button onclick="tl.pause()">Pause</button>
    <button onclick="tl.reverse()">Reverse</button>
  </div>
  <p class="label">${spec.name} — CSS 3D  |  ${spec.duration}s @ ${spec.fps}fps</p>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script>
    const tl = gsap.timeline({ paused: true });
${tweens}
    tl.play();
  </script>
</body>
</html>`;
}

// ─── Three.js mode ────────────────────────────────────────────────────────────

function buildThreejsHtml(spec) {
  const layers = (spec.layers || []).filter(l => l.render_compatible !== false);
  const uniqueIds = [...new Set(layers.map(l => l.id))];
  const camConfig = spec.camera || {};
  const fov = camConfig.fov || 60;
  const camPos = camConfig.position || [0, 0, 5];

  const PROP_MAP = {
    translateX: { path: 'position.x',      scale: 0.01 },
    translateY: { path: 'position.y',      scale: -0.01 },
    translateZ: { path: 'position.z',      scale: 0.01 },
    rotateX:    { path: 'rotation.x',      scale: Math.PI / 180 },
    rotateY:    { path: 'rotation.y',      scale: Math.PI / 180 },
    rotateZ:    { path: 'rotation.z',      scale: Math.PI / 180 },
    scale:      { path: 'scale.x',         scale: 1, also: ['scale.y', 'scale.z'] },
    scaleX:     { path: 'scale.x',         scale: 1 },
    scaleY:     { path: 'scale.y',         scale: 1 },
    opacity:    { path: 'material.opacity', scale: 1 },
  };

  const meshInit = uniqueIds.map(id => {
    const hasOpacity = layers.some(l => l.id === id && l.property === 'opacity');
    const varName = id.replace(/-/g, '_') + 'Mesh';
    const mat = hasOpacity
      ? `new THREE.MeshStandardMaterial({ color: 0x667eea, transparent: true })`
      : `new THREE.MeshStandardMaterial({ color: 0x667eea })`;
    return `      const ${varName} = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.1), ${mat});\n      scene.add(${varName});`;
  }).join('\n');

  const tweens = layers.map(layer => {
    const varName = layer.id.replace(/-/g, '_') + 'Mesh';
    const mapping = PROP_MAP[layer.property] || { path: layer.property, scale: 1 };
    const { path, scale, also } = mapping;
    const dur   = layerDuration(layer, spec);
    const delay = layerDelay(layer, spec);
    const ease  = GSAP_EASE[layer.easing] || 'power2.out';
    const from  = +(layer.from * scale).toFixed(4);
    const parts = path.split('.');
    const obj   = parts.slice(0, -1).join('.');
    const prop  = parts[parts.length - 1];

    const target = obj ? `${varName}.${obj}` : varName;
    let line = `      tl.from(${target}, { ${prop}: ${from}, duration: ${dur}, ease: '${ease}' }, ${delay});`;
    if (also) {
      also.forEach(p => {
        const ap = p.split('.').pop();
        const ao = p.split('.').slice(0, -1).join('.');
        const alsoTarget = ao ? `${varName}.${ao}` : varName;
        line += `\n      tl.from(${alsoTarget}, { ${ap}: ${from}, duration: ${dur}, ease: '${ease}' }, ${delay});`;
      });
    }
    return line;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.name} — Three.js Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; flex-direction: column;
           align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; }
    #canvas-container {
      width: ${spec.width || 800}px; height: ${spec.height || 600}px;
      border-radius: 12px; overflow: hidden;
    }
    .controls { margin-top: 20px; display: flex; gap: 12px; }
    button { padding: 10px 24px; border: none; border-radius: 8px;
             background: #667eea; color: #fff; cursor: pointer; font-size: 14px; }
    button:hover { background: #764ba2; }
    .label { color: #666; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <div class="controls">
    <button onclick="tl.play(0)">Play</button>
    <button onclick="tl.pause()">Pause</button>
    <button onclick="tl.reverse()">Reverse</button>
  </div>
  <p class="label">${spec.name} — Three.js  |  ${spec.duration}s @ ${spec.fps}fps</p>

  <script src="https://cdn.jsdelivr.net/npm/three@0.163/build/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
  <script>
    (function() {
      const container = document.getElementById('canvas-container');
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setClearColor(0x1a1a1a);
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(${fov}, container.clientWidth / container.clientHeight, 0.1, 1000);
      camera.position.set(${camPos[0]}, ${camPos[1]}, ${camPos[2]});

      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      const dl = new THREE.DirectionalLight(0xffffff, 0.6);
      dl.position.set(2, 4, 3);
      scene.add(dl);

${meshInit}

      const tl = gsap.timeline({ paused: true });
${tweens}

      (function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      })();

      tl.play();
    })();
  </script>
</body>
</html>`;
}

// ─── Parallax mode ────────────────────────────────────────────────────────────

function buildParallaxHtml(spec) {
  const layers = (spec.layers || []).filter(l => l.render_compatible !== false);
  const uniqueIds = [...new Set(layers.map(l => l.id))];

  // Parallax speed derived from layer Z value (or index as fallback)
  const divs = uniqueIds.map((id, i) => {
    const zLayer = spec.layers.find(l => l.id === id && l.property === 'translateZ');
    const z = zLayer ? (zLayer.to || zLayer.from || 0) : (i * 50);
    const speed = (z / 500).toFixed(3); // normalize to 0–1 range
    const hue = 200 + i * 40;
    return `    <div class="parallax-layer" id="${id}" data-speed="${speed}"
         style="background: hsl(${hue}, 60%, 50%); width: 120px; height: 160px;
                position: absolute; top: 50%; left: 50%; border-radius: 12px;
                transform: translate(-50%, -50%);"></div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.name} — Parallax Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; flex-direction: column;
           align-items: center; justify-content: center; min-height: 100vh;
           font-family: system-ui; overflow: hidden; }
    .stage {
      width: ${spec.width || 800}px; height: ${spec.height || 600}px;
      position: relative; background: #1a1a1a; border-radius: 12px;
      overflow: hidden; cursor: none;
    }
    .parallax-layer { transition: transform 0.1s ease-out; will-change: transform; }
    .label { color: #666; font-size: 12px; margin-top: 12px; }
    .hint { color: #444; font-size: 11px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="stage" id="stage">
${divs}
  </div>
  <p class="label">${spec.name} — Parallax  |  Move mouse over the stage</p>
  <p class="hint">Layers at higher Z values shift more with mouse movement</p>

  <script>
    const stage = document.getElementById('stage');
    const layers = document.querySelectorAll('.parallax-layer');
    const cx = stage.clientWidth / 2;
    const cy = stage.clientHeight / 2;

    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      const mx = (e.clientX - rect.left - cx) / cx; // -1 to 1
      const my = (e.clientY - rect.top  - cy) / cy;
      layers.forEach(el => {
        const speed = parseFloat(el.dataset.speed) || 0;
        const dx = mx * speed * 60;
        const dy = my * speed * 60;
        el.style.transform = \`translate(calc(-50% + \${dx}px), calc(-50% + \${dy}px))\`;
      });
    });

    stage.addEventListener('mouseleave', () => {
      layers.forEach(el => {
        el.style.transform = 'translate(-50%, -50%)';
      });
    });
  </script>
</body>
</html>`;
}

// ─── Entry point ──────────────────────────────────────────────────────────────

function specToHtml(spec) {
  const type = (spec['3d'] && spec['3d'].type) || 'css3d';

  // Auto-detect: if spec has 3D properties but no explicit type, use css3d
  const has3dProps = (spec.layers || []).some(l =>
    l.property === 'translateZ' || l.property === 'rotateX' || l.property === 'rotateY'
  );

  if (type === 'threejs') return buildThreejsHtml(spec);
  if (type === 'parallax') return buildParallaxHtml(spec);
  return buildCss3dHtml(spec); // css3d + default
}

module.exports = { specToHtml };
