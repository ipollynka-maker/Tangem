// .claude/skills/animate/compile.js
// CLI: node ~/.claude/skills/animate/compile.js <spec.json> [--target=all|lottie|remotion|ae|css|gsap|motion]
'use strict';

const fs   = require('fs');
const path = require('path');

const { specToLottie }      = require('./spec-to-lottie.js');
const { specToRemotionTsx } = require('./spec-to-remotion.js');
const { specToAeScript }    = require('./spec-to-ae.js');
const { specToCss }         = require('./spec-to-css.js');
const { specToGsap }        = require('./spec-to-gsap.js');
const { specToMotionTsx }   = require('./spec-to-motion.js');
const { specToHtml }        = require('./spec-to-html.js');
const { specToThreejs }     = require('./spec-to-threejs.js');

function toPascalCase(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ ${filePath}`);
}

/**
 * Load .animate.json from the project root.
 * Falls back to Tangem-style defaults if not found.
 */
function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.animate.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`  ↳ config: ${configPath}`);
    return config;
  }
  // Tangem defaults — no .animate.json needed in that project
  return {
    remotion: 'src/animations',
    ae:       'ae-scripts',
    lottie:   'animations',
    css:      'src/animations',
    gsap:     'src/animations/gsap',
    motion:   'src/animations/motion',
    specs:    'specs',
  };
}

/** Append an import + entry to {config.remotion}/registry.ts */
function updateRegistry(spec, projectRoot, config) {
  const registryPath = path.join(projectRoot, config.remotion, 'registry.ts');
  const componentName = toPascalCase(spec.name);

  let content = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';

  if (content.includes(`id: '${componentName}'`)) {
    console.log(`  ↩ registry: ${componentName} already registered`);
    return;
  }

  const importLine = `import { ${componentName} } from './${componentName}';`;
  const specJson = JSON.stringify(spec, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
  const entry = `  { id: '${componentName}', component: ${componentName}, spec: ${specJson} },\n  // __REGISTRY_END__`;

  if (content.includes('// __REGISTRY_END__')) {
    content = content.replace('// __REGISTRY_END__', entry);
    content = content.replace(/(import[^\n]+\n)(\n|export)/, `$1${importLine}\n$2`);
  } else {
    content = content.replace(
      /export const animationRegistry[^=]+=\s*\[\];/,
      `export const animationRegistry: AnimationRegistration[] = [\n  // __REGISTRY_END__\n];`
    );
    content = content.replace('// __REGISTRY_END__', entry);
    content = content.replace(/(import[^\n]+\n)(\n|export)/, `$1${importLine}\n$2`);
  }

  writeFile(registryPath, content);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node ~/.claude/skills/animate/compile.js <spec.json> [--target=all|lottie|remotion|ae|css|gsap|motion|html|threejs]');
    process.exit(1);
  }

  const specPath    = args[0];
  const targetFlag  = (args.find(a => a.startsWith('--target=')) || '--target=all').split('=')[1];
  const projectRoot = process.cwd();
  const config      = loadConfig(projectRoot);

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const name = spec.name;
  const shouldOutput = (t) => targetFlag === 'all' || targetFlag === t;

  console.log(`\nCompiling: ${name} (target: ${targetFlag})\n`);

  // --- Lottie ---
  if (shouldOutput('lottie') && spec.lottie_compatible) {
    writeFile(
      path.join(projectRoot, config.lottie, `${name}.json`),
      JSON.stringify(specToLottie(spec), null, 2)
    );
  }

  // --- Remotion component ---
  if (shouldOutput('remotion')) {
    const renderLayers = spec.layers.filter(l => l.render_compatible);
    if (renderLayers.length > 0) {
      const componentName = toPascalCase(name);
      writeFile(
        path.join(projectRoot, config.remotion, `${componentName}.tsx`),
        specToRemotionTsx(spec)
      );
      updateRegistry(spec, projectRoot, config);
    } else {
      console.log('  ⚠ No render-compatible layers — Remotion component skipped');
    }
  }

  // --- AE ExtendScript ---
  if (shouldOutput('ae')) {
    writeFile(
      path.join(projectRoot, config.ae, `${name}.jsx`),
      specToAeScript(spec)
    );
  }

  // --- CSS ---
  if (shouldOutput('css')) {
    writeFile(
      path.join(projectRoot, config.css, `${name}.css`),
      specToCss(spec)
    );
  }

  // --- GSAP timeline module ---
  if (shouldOutput('gsap')) {
    const gsapDir = config.gsap || path.join(config.remotion || 'src/animations', 'gsap');
    writeFile(
      path.join(projectRoot, gsapDir, `${name}.js`),
      specToGsap(spec)
    );
  }

  // --- Motion (Framer Motion) React component ---
  if (shouldOutput('motion')) {
    const motionDir = config.motion || path.join(config.remotion || 'src/animations', 'motion');
    const componentName = toPascalCase(name);
    writeFile(
      path.join(projectRoot, motionDir, `${componentName}.tsx`),
      specToMotionTsx(spec)
    );
  }

  // --- Standalone HTML demo (CSS3D / Three.js / Parallax) ---
  if (shouldOutput('html')) {
    const htmlDir = config.html || path.join(config.css || 'src/animations', 'html');
    writeFile(
      path.join(projectRoot, htmlDir, `${name}.html`),
      specToHtml(spec)
    );
  }

  // --- Three.js ES module ---
  if (shouldOutput('threejs')) {
    const threejsDir = config.threejs || path.join(config.remotion || 'src/animations', 'threejs');
    const componentName = toPascalCase(name);
    writeFile(
      path.join(projectRoot, threejsDir, `${componentName}.js`),
      specToThreejs(spec)
    );
  }

  console.log('\nDone.');
  console.log(`Preview:  npm start`);
  console.log(`Render:   npx remotion render ${toPascalCase(name)} out/${name}-preview.mp4`);
}

main();
