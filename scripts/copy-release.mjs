import fs from 'fs';
import path from 'path';

const root = process.cwd();
const releaseDir = path.join(root, 'release');
const targetDir = path.join(root, 'src-tauri', 'target', 'release');
const bundleDir = path.join(targetDir, 'bundle');

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

console.log('\x1b[36m%s\x1b[0m', '📦 Copie des packages de release vers le dossier release/ ...\n');

// 1. Setup NSIS (.exe) - prendre le fichier le plus récent
const nsisDir = path.join(bundleDir, 'nsis');
if (fs.existsSync(nsisDir)) {
  const nsisFiles = fs.readdirSync(nsisDir)
    .filter(f => f.endsWith('.exe'))
    .map(f => ({ name: f, path: path.join(nsisDir, f), mtime: fs.statSync(path.join(nsisDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (nsisFiles.length > 0) {
    const src = nsisFiles[0].path;
    const dest = path.join(releaseDir, 'AI-Widget-Setup.exe');
    fs.copyFileSync(src, dest);
    const size = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(` \x1b[32m✓\x1b[0m AI-Widget-Setup.exe (${size} Mo) [depuis ${nsisFiles[0].name}] -> Installateur Windows standard (NSIS)`);
  }
}

// 2. MSI (.msi) - prendre le fichier le plus récent
const msiDir = path.join(bundleDir, 'msi');
if (fs.existsSync(msiDir)) {
  const msiFiles = fs.readdirSync(msiDir)
    .filter(f => f.endsWith('.msi'))
    .map(f => ({ name: f, path: path.join(msiDir, f), mtime: fs.statSync(path.join(msiDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  if (msiFiles.length > 0) {
    const src = msiFiles[0].path;
    const dest = path.join(releaseDir, 'AI-Widget-Setup.msi');
    fs.copyFileSync(src, dest);
    const size = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(` \x1b[32m✓\x1b[0m AI-Widget-Setup.msi (${size} Mo) [depuis ${msiFiles[0].name}] -> Installateur Windows Entreprise (MSI)`);
  }
}

// 3. Standalone / Portable Offline (.exe)
const possibleExes = ['AI Widget.exe', 'ai-widget.exe'];
for (const exeName of possibleExes) {
  const exePath = path.join(targetDir, exeName);
  if (fs.existsSync(exePath)) {
    const dest = path.join(releaseDir, 'AI-Widget-Portable.exe');
    fs.copyFileSync(exePath, dest);
    const size = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(' \x1b[32m✓\x1b[0m AI-Widget-Portable.exe (' + size + ' Mo) -> Version Portable / Offline directe sans installation');
    break;
  }
}

console.log('\n\x1b[32m%s\x1b[0m', '✨ Tous les fichiers ont été copiés avec succès dans le dossier release/ !');
