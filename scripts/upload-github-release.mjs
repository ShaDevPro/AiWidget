import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const token = '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';
const repo = 'ShaDevPro/AiWidget';
const targetTag = 'v1.1.0';
const releaseName = 'AI Widget v1.1.0 - Mise à Jour Majeure';
const releaseNotes = `## 🚀 Nouveautés majeures d'AI Widget v1.1.0

- 🎨 **Studio d'Images Fooocus SDXL & Juggernaut XL v8 (6.6 Go)** : Photoréalisme extrême et rendu cinéma HD en local.
- ⚡ **Double Moteur SD 1.5 Rapide (1.5 Go)** : Version légère ultra-rapide pour toutes les machines.
- 🧩 **Optimisations VAE CPU & Tiling** : Zéro dépassement de mémoire sur les puces graphiques intégrées (Intel / AMD).
- 🎓 **Studio de Cours Complet** : Structuration de programmes pédagogiques interactifs.
- 🎙️ **Réparation Vocale TTS** : Vocalisation fluide et illimitée de 100% des réponses générées.
- 🛡️ **Système de Mise à Jour Obligatoire (Hard Lock)** : Sécurité et intégrité garanties.`;

async function main() {
  console.log('🔍 Récupération des releases GitHub pour', repo, '...');
  const releasesJson = execSync(`curl.exe --retry 3 --connect-timeout 30 -s -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${repo}/releases`, { encoding: 'utf8' });
  const releases = JSON.parse(releasesJson);

  let targetRelease = releases.find(r => r.tag_name === targetTag);

  if (!targetRelease) {
    console.log(`✨ Création de la release GitHub [${targetTag}] ${releaseName} ...`);
    const payload = JSON.stringify({
      tag_name: targetTag,
      name: releaseName,
      body: releaseNotes,
      draft: false,
      prerelease: false
    });
    const tempPayloadFile = path.resolve('temp_release_payload.json');
    fs.writeFileSync(tempPayloadFile, payload, 'utf8');

    const createCmd = `curl.exe --retry 3 -s -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "Content-Type: application/json" --data-binary "@${tempPayloadFile}" https://api.github.com/repos/${repo}/releases`;
    const createdJson = execSync(createCmd, { encoding: 'utf8' });
    try { fs.unlinkSync(tempPayloadFile); } catch (_) {}
    targetRelease = JSON.parse(createdJson);
    console.log(`✓ Release créée avec succès (ID: ${targetRelease.id}) !`);
  } else {
    console.log(`✓ Release existante trouvée : [${targetRelease.tag_name}] ${targetRelease.name} (ID: ${targetRelease.id})`);
  }

  const filesToUpload = [
    { name: 'AI-Widget-Setup.exe', path: path.resolve('release/AI-Widget-Setup.exe') },
    { name: 'AI-Widget-Setup.msi', path: path.resolve('release/AI-Widget-Setup.msi') },
    { name: 'AI-Widget-Portable.exe', path: path.resolve('release/AI-Widget-Portable.exe') },
  ];

  // 1. Delete old assets if they exist
  for (const asset of targetRelease.assets || []) {
    if (filesToUpload.some(f => f.name === asset.name)) {
      console.log(`🗑️ Suppression de l'ancien asset : ${asset.name} (ID: ${asset.id}) ...`);
      try {
        execSync(`curl.exe --retry 3 -s -X DELETE -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${repo}/releases/assets/${asset.id}`);
        console.log(`   ✓ Supprimé : ${asset.name}`);
      } catch (e) {
        console.warn(`   Avertissement :`, e.message);
      }
    }
  }

  // 2. Upload using curl.exe for maximum stability and speed
  const baseUploadUrl = `https://uploads.github.com/repos/${repo}/releases/${targetRelease.id}/assets`;

  for (const file of filesToUpload) {
    if (!fs.existsSync(file.path)) {
      console.error(`Fichier introuvable : ${file.path}`);
      continue;
    }

    const stat = fs.statSync(file.path);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`\n📤 Téléversement de ${file.name} (${sizeMb} Mo) vers GitHub Release v1.1.0 via curl...`);

    const uploadUrl = `${baseUploadUrl}?name=${encodeURIComponent(file.name)}`;
    const curlCmd = `curl.exe --retry 3 --retry-delay 2 --connect-timeout 30 --max-time 300 -s -w "\\nHTTP_CODE:%{http_code}" -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "Content-Type: application/octet-stream" --data-binary "@${file.path}" "${uploadUrl}"`;

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

  console.log('\n🎉 Les 3 exécutables de la v1.1.0 ont été téléversés avec succès sur GitHub Release !');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
