import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const token = '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';
const publicRepo = 'ShaDevPro/AiWidget-Site';
const targetTag = 'v1.1.0';
const releaseName = 'AI Widget v1.1.0 - Official Release';
const releaseNotes = `## 🚀 AI Widget v1.1.0 - Téléchargement Public

- 🎨 **Studio d'Images Fooocus SDXL Juggernaut XL v8 (6.6 Go)**
- ⚡ **Double Moteur SD 1.5 Rapide (1.5 Go)**
- 🛡️ **Mandatory Hard Lock Updater System**`;

async function uploadToRepo(repo) {
  console.log(`\n🔍 Vérification des releases sur [${repo}]...`);
  const releasesJson = execSync(`curl.exe --retry 3 --connect-timeout 30 -s -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${repo}/releases`, { encoding: 'utf8' });
  const releases = JSON.parse(releasesJson);

  let targetRelease = releases.find(r => r.tag_name === targetTag);

  if (!targetRelease) {
    console.log(`✨ Création de la release [${targetTag}] sur ${repo} ...`);
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
    console.log(`✓ Release créée sur ${repo} (ID: ${targetRelease.id}) !`);
  } else {
    console.log(`✓ Release existante trouvée sur ${repo} : ID ${targetRelease.id}`);
  }

  const filesToUpload = [
    { name: 'AI-Widget-Setup.exe', path: path.resolve('release/AI-Widget-Setup.exe') },
    { name: 'AI-Widget-Setup.msi', path: path.resolve('release/AI-Widget-Setup.msi') },
    { name: 'AI-Widget-Portable.exe', path: path.resolve('release/AI-Widget-Portable.exe') },
  ];

  for (const asset of targetRelease.assets || []) {
    if (filesToUpload.some(f => f.name === asset.name)) {
      console.log(`🗑️ Suppression de l'ancien asset : ${asset.name} (ID: ${asset.id}) ...`);
      try {
        execSync(`curl.exe --retry 3 -s -X DELETE -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" https://api.github.com/repos/${repo}/releases/assets/${asset.id}`);
      } catch (e) {}
    }
  }

  const baseUploadUrl = `https://uploads.github.com/repos/${repo}/releases/${targetRelease.id}/assets`;

  for (const file of filesToUpload) {
    if (!fs.existsSync(file.path)) continue;
    const stat = fs.statSync(file.path);
    const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
    console.log(`📤 Téléversement de ${file.name} (${sizeMb} Mo) vers ${repo}...`);

    const uploadUrl = `${baseUploadUrl}?name=${encodeURIComponent(file.name)}`;
    const curlCmd = `curl.exe --retry 3 --retry-delay 2 --connect-timeout 30 --max-time 300 -s -w "\\nHTTP_CODE:%{http_code}" -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "Content-Type: application/octet-stream" --data-binary "@${file.path}" "${uploadUrl}"`;

    try {
      const output = execSync(curlCmd, { encoding: 'utf8' });
      if (output.includes('HTTP_CODE:201') || output.includes('"id":')) {
        console.log(`   ✅ Téléversé avec succès : ${file.name}`);
      }
    } catch (err) {
      console.error(`   ❌ Erreur sur ${file.name}:`, err.message);
    }
  }
}

async function main() {
  await uploadToRepo(publicRepo);
  await uploadToRepo('ShaDevPro/AiWidget');
  console.log('\n🎉 Téléversement public terminé !');
}

main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
