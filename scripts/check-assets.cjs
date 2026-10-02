const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require('./register-typescript.cjs');
const { SPRITE_ATLASES, validateAtlas } = require('../src/game/assets/atlases.ts');
const { ASSET_PATHS } = require('../src/game/assets/manifest.ts');
const found = new Map();
function scan(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const filename = path.join(folder, entry.name);
    if (entry.isDirectory()) scan(filename);
    else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        for (const match of line.matchAll(
          /\/(?:assets\/[^\s'"`?{}]+|chest)\.(?:png|svg|ttf|mp3)/g
        )) {
          const url = match[0];
          found.set(url, `${path.relative(root, filename)}:${index + 1}`);
        }
      });
    }
  }
}
scan(path.join(root, 'src'));
const failures = [];
for (const [url, source] of found) {
  const filename = path.join(root, 'public', url);
  if (
    !fs.existsSync(filename) ||
    !fs.readdirSync(path.dirname(filename)).includes(path.basename(filename))
  ) {
    failures.push(`${url} (${source})`);
  }
}
for (const [key] of Object.entries(SPRITE_ATLASES)) {
  const filename = path.join(root, 'public', ASSET_PATHS[key]);
  if (!fs.existsSync(filename)) {
    failures.push(`Missing atlas: ${key}`);
    continue;
  }
  const png = fs.readFileSync(filename);
  const reason = validateAtlas(key, png.readUInt32BE(16), png.readUInt32BE(20));
  if (reason) failures.push(`${key}: ${reason}`);
}
if (failures.length) {
  console.error('Missing or case-mismatched assets:\n' + failures.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Asset paths passed: ${found.size} exact-case references, ${Object.keys(SPRITE_ATLASES).length} sprite atlases.`
  );
