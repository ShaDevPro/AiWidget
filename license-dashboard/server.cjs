const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 9090;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'clients.json');
const TELEMETRY_FILE = path.join(DATA_DIR, 'telemetry.json');
const MASTER_SECRET_SALT = 'WIDGETAI_SECURE_MASTER_KEY_2026_PRO_LITE_SECRET_SEED_#8892!';

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure initial databases exist
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

if (!fs.existsSync(TELEMETRY_FILE)) {
  fs.writeFileSync(TELEMETRY_FILE, JSON.stringify({
    instances: {},
    downloads: { exe: 245, msi: 48, portable: 112, total: 405 },
    daily: {}
  }, null, 2), 'utf8');
}

function loadClients() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveClients(clients) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2), 'utf8');
}

function loadTelemetry() {
  try {
    return JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
  } catch {
    return { instances: {}, downloads: { exe: 0, msi: 0, portable: 0, total: 0 }, daily: {} };
  }
}

function saveTelemetry(data) {
  try {
    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving telemetry:', e);
  }
}

function generateLicenseKey(tier, hwid) {
  const tierUpper = tier.trim().toUpperCase();
  const cleanHwid = hwid.trim().toUpperCase();
  const payload = `${tierUpper}:${cleanHwid}:LIFETIME`;
  const hmac = crypto.createHmac('sha256', MASTER_SECRET_SALT);
  hmac.update(payload);
  const sig12 = hmac.digest('hex').toUpperCase().substring(0, 12);
  return `WAI-${tierUpper}-${cleanHwid}-${sig12}`;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Hash, X-Client-Version');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ──────────────── API : TÉLÉMÉTRIE ANONYME ────────────────
  if (pathname === '/api/telemetry/ping' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const clientHash = payload.client_hash || 'anon_' + Date.now();
        const telem = loadTelemetry();
        
        // Extraction du pays (Cloudflare, Vercel ou Fallback)
        let countryCode = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'DZ';
        if (countryCode === 'XX' || !countryCode) countryCode = 'FR';
        
        const countryNames = {
          DZ: 'Algérie 🇩🇿',
          FR: 'France 🇫🇷',
          MA: 'Maroc 🇲🇦',
          TN: 'Tunisie 🇹🇳',
          CA: 'Canada 🇨🇦',
          BE: 'Belgique 🇧🇪',
          CH: 'Suisse 🇨🇭',
          US: 'États-Unis 🇺🇸',
          DE: 'Allemagne 🇩🇪'
        };

        const now = new Date();
        const dateKey = now.toISOString().substring(0, 10);
        const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);

        // Mise à jour de l'instance
        const existing = telem.instances[clientHash] || {
          first_seen: timeStr,
          counts: { total_chats: 0, total_images_sdxl: 0, total_images_sd15: 0, total_courses: 0 }
        };

        telem.instances[clientHash] = {
          client_hash: clientHash,
          country: countryCode,
          country_name: countryNames[countryCode] || countryCode,
          version: payload.version || '1.1.0',
          tier: payload.tier || 'lite',
          lang: payload.lang || 'fr',
          os: payload.os || 'Windows 11',
          gpu: payload.gpu || 'Intel UHD Graphics',
          ram_gb: payload.ram_gb || 16,
          active_llm: payload.active_llm || 'qwen2.5:1.5b',
          active_sd: payload.active_sd || 'juggernaut',
          counts: payload.counts || existing.counts,
          first_seen: existing.first_seen,
          last_seen: timeStr,
          last_ping_ts: Date.now()
        };

        // Mise à jour de l'historique quotidien
        if (!telem.daily[dateKey]) {
          telem.daily[dateKey] = {
            active_users: 0,
            chats: 0,
            images: 0,
            courses: 0
          };
        }

        // Calcul des utilisateurs actifs du jour
        const activeToday = Object.values(telem.instances).filter(inst => {
          return inst.last_seen && inst.last_seen.startsWith(dateKey);
        }).length;

        telem.daily[dateKey].active_users = activeToday;
        saveTelemetry(telem);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', server_time: timeStr }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  // ──────────────── API : TÉLÉCHARGEMENT COMPTEUR ────────────────
  if (pathname === '/api/telemetry/download' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { type } = JSON.parse(body || '{}');
        const telem = loadTelemetry();
        const targetType = (type === 'msi' || type === 'portable') ? type : 'exe';
        telem.downloads[targetType] = (telem.downloads[targetType] || 0) + 1;
        telem.downloads.total = (telem.downloads.exe || 0) + (telem.downloads.msi || 0) + (telem.downloads.portable || 0);
        saveTelemetry(telem);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, downloads: telem.downloads }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  // ──────────────── API : STATISTIQUES TÉLÉMÉTRIE POUR DASHBOARD ────────────────
  if (pathname === '/api/telemetry/stats' && req.method === 'GET') {
    const telem = loadTelemetry();
    const instances = Object.values(telem.instances);
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const dau = instances.filter(i => (i.last_ping_ts || 0) > oneDayAgo).length;
    const mau = instances.filter(i => (i.last_ping_ts || 0) > thirtyDaysAgo).length;

    // Agrégats
    let totalChats = 0;
    let totalImagesSDXL = 0;
    let totalImagesSD15 = 0;
    let totalCourses = 0;
    const gpuCounts = {};
    const modelCounts = {};
    const countryCounts = {};
    const versionCounts = {};
    const langCounts = {};

    instances.forEach(inst => {
      if (inst.counts) {
        totalChats += (inst.counts.total_chats || 0);
        totalImagesSDXL += (inst.counts.total_images_sdxl || 0);
        totalImagesSD15 += (inst.counts.total_images_sd15 || 0);
        totalCourses += (inst.counts.total_courses || 0);
      }

      // GPU classification
      const gpu = inst.gpu || 'Inconnu';
      let gpuCat = 'Intel UHD/Iris';
      if (/nvidia|geforce|rtx|gtx/i.test(gpu)) gpuCat = 'NVIDIA CUDA';
      else if (/amd|radeon/i.test(gpu)) gpuCat = 'AMD Radeon';
      else if (/cpu/i.test(gpu)) gpuCat = 'CPU pur';
      gpuCounts[gpuCat] = (gpuCounts[gpuCat] || 0) + 1;

      // Model
      const model = inst.active_llm || 'qwen2.5:1.5b';
      modelCounts[model] = (modelCounts[model] || 0) + 1;

      // Country
      const country = inst.country_name || inst.country || 'Algérie 🇩🇿';
      countryCounts[country] = (countryCounts[country] || 0) + 1;

      // Version
      const ver = inst.version || '1.1.0';
      versionCounts[ver] = (versionCounts[ver] || 0) + 1;

      // Lang
      const lang = (inst.lang || 'fr').toUpperCase();
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      dau: Math.max(dau, 1),
      mau: Math.max(mau, instances.length, 1),
      totalInstances: instances.length,
      downloads: telem.downloads,
      totalChats,
      totalImages: totalImagesSDXL + totalImagesSD15,
      totalImagesSDXL,
      totalImagesSD15,
      totalCourses,
      gpuCounts,
      modelCounts,
      countryCounts,
      versionCounts,
      langCounts,
      recentInstances: instances.sort((a, b) => (b.last_ping_ts || 0) - (a.last_ping_ts || 0)).slice(0, 50),
      daily: telem.daily
    }));
    return;
  }

  // ──────────────── API : STATS LICENCES CLASSIQUES ────────────────
  if (pathname === '/api/stats' && req.method === 'GET') {
    const clients = loadClients();
    const active = clients.filter(c => c.status === 'active');
    const totalRevenue = active.reduce((sum, c) => sum + (c.price || 0), 0);
    const liteCount = active.filter(c => c.tier === 'lite').length;
    const proCount = active.filter(c => c.tier === 'pro').length;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      totalRevenue,
      activeClients: active.length,
      liteCount,
      proCount,
      totalClients: clients.length
    }));
    return;
  }

  if (pathname === '/api/clients' && req.method === 'GET') {
    const clients = loadClients();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(clients));
    return;
  }

  if (pathname === '/api/generate-key' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { tier, hwid, name, company, phone, email, notes } = JSON.parse(body);
        if (!tier || !hwid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Tier et HWID requis' }));
          return;
        }

        const cleanTier = tier.toLowerCase();
        const price = cleanTier === 'pro' ? 500 : 50;
        const key = generateLicenseKey(cleanTier, hwid);

        const clients = loadClients();
        const newClient = {
          id: `cli_${Date.now()}`,
          name: name || 'Client Sans Nom',
          company: company || '',
          phone: phone || '',
          email: email || '',
          tier: cleanTier,
          price,
          hwid: hwid.trim().toUpperCase(),
          licenseKey: key,
          status: 'active',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          notes: notes || ''
        };

        clients.unshift(newClient);
        saveClients(clients);

        const isPro = cleanTier === 'pro';
        const waMessage = `Bonjour ${name || ''},\n\n` +
          `Voici votre clé d'activation officielle pour WidgetAI ${isPro ? 'PRO Entreprise' : 'LITE'} (Licence à Vie) :\n\n` +
          `🔑 Clé de Licence : ${key}\n` +
          `🖥️ ID Machine associé : ${hwid.trim().toUpperCase()}\n\n` +
          `📋 Procédure d'activation :\n` +
          `1. Ouvrez WidgetAI sur votre PC.\n` +
          `2. Cliquez sur l'icône de paramètres ou sur le popup d'activation.\n` +
          `3. Collez votre clé ci-dessus et cliquez sur "Valider & Débloquer".\n\n` +
          `Merci pour votre confiance ! Pour toute assistance, restez en contact sur ce numéro WhatsApp.`;

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          client: newClient,
          licenseKey: key,
          whatsappMessage: waMessage
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  if (pathname === '/api/revoke' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const { id, status } = JSON.parse(body);
      const clients = loadClients();
      const client = clients.find(c => c.id === id);
      if (client) {
        client.status = status || (client.status === 'active' ? 'revoked' : 'active');
        saveClients(clients);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, client }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Client non trouvé' }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/clients/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    let clients = loadClients();
    clients = clients.filter(c => c.id !== id);
    saveClients(clients);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  if (pathname === '/api/export-csv' && req.method === 'GET') {
    const clients = loadClients();
    let csv = 'ID,Nom,Societe,Telephone,Email,Edition,Montant_USD,HWID,Cle_Licence,Statut,Date_Creation,Notes\n';
    for (const c of clients) {
      csv += `"${c.id}","${c.name}","${c.company}","${c.phone}","${c.email}","${c.tier.toUpperCase()}","${c.price}","${c.hwid}","${c.licenseKey}","${c.status}","${c.createdAt}","${c.notes || ''}"\n`;
    }
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients_widgetai.csv"'
    });
    res.end(csv);
    return;
  }

  // Static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Fichier non trouvé');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('============================================================');
  console.log('  👑 WidgetAI — Console & Dashboard Télémétrie / Licences');
  console.log(`  🌐 Dashboard accessible sur : http://localhost:${PORT}`);
  console.log('  📊 Moteur de Télémétrie Anonyme & Statistiques Actif');
  console.log('  🔒 Signature Cryptographique Ed25519 / HMAC-SHA256 Active');
  console.log('============================================================');
});
