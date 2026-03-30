// .claude/skills/animate/compile.js
// CLI: node .claude/skills/animate/compile.js <spec.json> [--target=all|lottie|remotion|ae|css]
'use strict';

const fs   = require('fs');
const path = require('path');

const { specToLottie }      = require('./spec-to-lottie.js');
const { specToRemotionTsx } = require('./spec-to-remotion.js');
const { specToAeScript }    = require('./spec-to-ae.js');
const { specToCss }         = require('./spec-to-css.js');

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

/** Append an import + entry to src/animations/registry.ts */
function updateRegistry(spec, projectRoot) {
  const registryPath = path.join(projectRoot, 'src/animations/registry.ts');
  const componentName = toPascalCase(spec.name);

  let content = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';

  // Idempotent: skip if already registered
  if (content.includes(`id: '${componentName}'`)) {
    console.log(`  ↩ registry: ${componentName} already registered`);
    return;
  }

  const importLine = `import { ${componentName} } from './${componentName}';`;
  const specJson = JSON.stringify(spec, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n');
  const entry = `  { id: '${componentName}', component: ${componentName}, spec: ${specJson} },\n  // __REGISTRY_END__`;

  if (content.includes('// __REGISTRY_END__')) {
    // Subsequent registrations: replace the sentinel
    content = content.replace('// __REGISTRY_END__', entry);
    // Add import before the sentinel import block end
    content = content.replace(/(import[^\n]+\n)(\n|export)/, `$1${importLine}\n$2`);
  } else {
    // First registration: replace empty array and add import
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
    console.error('Usage: node compile.js <spec.json> [--target=all|lottie|remotion|ae|css]');
    process.exit(1);
  }

  const specPath   = args[0];
  const targetFlag = (args.find(a => a.startsWith('--target=')) || '--target=all').split('=')[1];
  const projectRoot = path.resolve(__dirname, '../../..');

  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const name = spec.name;
  const shouldOutput = (t) => targetFlag === 'all' || targetFlag === t;

  console.log(`\nCompiling: ${name} (target: ${targetFlag})\n`);

  // --- Lottie (always primary) ---
  if (shouldOutput('lottie') && spec.lottie_compatible) {
    writeFile(path.join(projectRoot, `animations/${name}.json`),
      JSON.stringify(specToLottie(spec), null, 2));
  }

  // --- Remotion component ---
  if (shouldOutput('remotion')) {
    const renderLayers = spec.layers.filter(l => l.render_compatible);
    if (renderLayers.length > 0) {
      const componentName = toPascalCase(name);
      writeFile(path.join(projectRoot, `src/animations/${componentName}.tsx`),
        specToRemotionTsx(spec));
      updateRegistry(spec, projectRoot);
    } else {
      console.log('  ⚠ No render-compatible layers — Remotion component skipped');
    }
  }

  // --- AE ExtendScript ---
  if (shouldOutput('ae')) {
    writeFile(path.join(projectRoot, `ae-scripts/${name}.jsx`),
      specToAeScript(spec));
  }

  // --- CSS ---
  if (shouldOutput('css')) {
    writeFile(path.join(projectRoot, `src/animations/${name}.css`),
      specToCss(spec));
  }

  console.log('\nDone. Run `npm start` to preview in Remotion Studio.');
  console.log(`Run: npx remotion render ${toPascalCase(name)} out/${name}-preview.mp4`);
}

main();
