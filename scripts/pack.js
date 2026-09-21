import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';

const manifestPath = path.resolve('manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.2.0';

const outDir = path.resolve('dist');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const zipName = `chromemind-v${version}.zip`;
const zipPath = path.join(outDir, zipName);
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`[ChromeMind] Distribution archive created successfully:`);
  console.log(`  Path: ${zipPath}`);
  console.log(`  Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
  console.log(`\nNote: This is a distribution archive for manual/unpacked installation and GitHub Releases, not a Chrome Web Store store submission package.`);
});

archive.on('warning', (err) => {
  if (err.code === 'ENOENT') {
    console.warn(err);
  } else {
    throw err;
  }
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Append manifest.json
archive.file(manifestPath, { name: 'manifest.json' });

// Append src directory
archive.directory(path.resolve('src'), 'src');

await archive.finalize();
