import fs from 'fs';
import path from 'path';

const version = process.argv[2] || '1.0.1';
const notes = process.argv[3] || 'Nouvelle version stable de AI Widget avec améliorations et corrections.';
const signature = process.argv[4] || '';

const manifest = {
  version: version,
  notes: notes,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature: signature,
      url: `https://github.com/ShaDevPro/AiWidget/releases/download/v${version}/AI-Widget-Setup.exe`
    }
  }
};

const outPath = path.resolve('release/updater.json');
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('Manifest updater généré dans:', outPath);
