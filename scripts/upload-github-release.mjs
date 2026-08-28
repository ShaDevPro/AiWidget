import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const token = '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';
const repo = 'ShaDevPro/AiWidget';

async function main() {
  console.log('🔍 Récupération des releases GitHub pour', repo, '...');
  const res = await fetch(`https://api.github.com/repos/${repo}/releases`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'AI-Widget-Publisher',
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('Erreur API GitHub:', res.status, errText);
    process.exit(1);
  }

  const releases = await res.json();
  if (!releases.length) {
    console.error('Aucune release trouvée.');
    process.exit(1);
  }

  const latestRelease = releases[0];
  console.log(`✓ Release cible : [${latestRelease.tag_name}] ${latestRelease.name} (ID: ${latestRelease.id})`);

  const filesToUpload = [
    { name: 'AI-Widget-Setup.exe', path: path.resolve('release/AI-Widget-Setup.exe') },
    { name: 'AI-Widget-Setup.msi', path: path.resolve('release/AI-Widget-Setup.msi') },
    { name: 'AI-Widget-Portable.exe', path: path.resolve('release/AI-Widget-Portable.exe') },
  ];

  // 1. Delete remaining duplicate assets if any
  for (const asset of latestRelease.assets || []) {
    if (filesToUpload.some(f => f.name === asset.name)) {
      console.log(`🗑️ Suppression de l'ancien asset : ${asset.name} (ID: ${asset.id}) ...`);
      try {
        await fetch(`https://api.github.com/repos/${repo}/releases/assets/${asset.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'AI-Widget-Publisher',
          },
        });
        console.log(`   ✓ Supprimé : ${asset.name}`);
      } catch (e) {
        console.warn(`   Avertissement :`, e.message);
      }
    }
  }

  // 2. Upload using curl.exe for maximum stability and speed
  const baseUploadUrl = `https://uploads.github.com/repos/${repo}/releases/${latestRelease.id}/assets`;

  for (const file of filesToUpload) {
    if (!fs.existsSync(file.path)) {
      console.error(`Fichier introuvable : ${file.path}`);
      continue;
    }

    const stat = fs.statSync(file.path);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`\n📤 Téléversement de ${file.name} (${sizeMb} Mo) vers GitHub Release via curl...`);

    const uploadUrl = `${baseUploadUrl}?name=${encodeURIComponent(file.name)}`;
    const curlCmd = `curl.exe --retry 3 --retry-delay 2 --connect-timeout 30 --max-time 300 -s -w "\\nHTTP_CODE:%{http_code}" -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "Content-Type: application/octet-stream" --data-binary @"${file.path}" "${uploadUrl}"`;

    try {
      const output = execSync(curlCmd, { encoding: 'utf8' });
      if (output.includes('HTTP_CODE:201') || output.includes('"id":')) {
        console.log(`   ✅ Téléversé avec succès : ${file.name}`);
      } else {
        console.log(`   Résultat :`, output.slice(0, 300));
      }
    } catch (err) {
      console.error(`   ❌ Erreur curl sur ${file.name}:`, err.message);
    }
  }

  console.log('\n🎉 Les 3 exécutables ont été téléversés et remplacés sur GitHub Release avec succès !');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
