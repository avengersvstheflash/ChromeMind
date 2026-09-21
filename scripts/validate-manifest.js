import fs from 'node:fs';

const content = fs.readFileSync('manifest.json', 'utf8');
const manifest = JSON.parse(content);

if (!manifest.name || !manifest.version || manifest.manifest_version !== 3) {
  throw new Error('Invalid manifest.json: missing required fields or not Manifest V3');
}

console.log(`manifest.json is valid MV3: ${manifest.name} v${manifest.version}`);
