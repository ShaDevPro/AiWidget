import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const token = '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';
const siteRepo = `https://x-access-token:${token}@github.com/ShaDevPro/AiWidget-Site.git`;
const tempDir = path.resolve(process.env.TEMP || 'C:\\temp', 'AiWidget-Site-Sync');

console.log('🔄 Synchronisation du site public ShaDevPro/AiWidget-Site...');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

execSync(`git clone ${siteRepo} "${tempDir}"`, { stdio: 'inherit' });

// Copy all website files
const websiteDir = path.resolve('website');
const files = fs.readdirSync(websiteDir);
for (const file of files) {
  const src = path.join(websiteDir, file);
  const dest = path.join(tempDir, file);
  fs.cpSync(src, dest, { recursive: true, force: true });
}

execSync('git add .', { cwd: tempDir, stdio: 'inherit' });
try {
  execSync('git commit -m "update(site): Sync v1.1.0 release, version.json and Fooocus SDXL updates"', { cwd: tempDir, stdio: 'inherit' });
  execSync('git push origin main', { cwd: tempDir, stdio: 'inherit' });
  console.log('✅ Site public synchronisé avec succès !');
} catch (e) {
  console.log('Aucun nouveau changement à pousser ou déjà à jour.');
}

if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
