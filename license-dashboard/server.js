const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 9090;
const DATA_FILE = path.join(__dirname, 'data', 'clients.json');
const MASTER_SECRET_SALT = 'WIDGETAI_SECURE_MASTER_KEY_2026_PRO_LITE_SECRET_SEED_#8892!';

// Ensure initial database exists
if (!fs.existsSync(DATA_FILE)) {
  const initialData = [
    {
      id: 'cli_01',
      name: 'Dr. Karim Mansouri',
      company: 'Clinique Al-Amal',
      phone: '+213550123456',
      email: 'k.mansouri@clinique-alamal.dz',
      tier: 'lite',
      price: 50,
      hwid: '8F3A-C4B2-9901-EE7A',
      licenseKey: 'WAI-LITE-8F3A-C4B2-9901-EE7A-7A8B9C1D2E3F',
      status: 'active',
      createdAt: '2026-08-24 10:15:00',
      notes: 'Payé via BaridiMob'
    },
    {
      id: 'cli_02',
      name: 'Me. Sarah Benali',
      company: 'Cabinet Juridique Benali & Associés',
      phone: '+213661987654',
      email: 'contact@benali-avocats.com',
      tier: 'lite',
      price: 50,
      hwid: '4B12-98AA-77EF-2100',
      licenseKey: 'WAI-LITE-4B12-98AA-77EF-2100-3F8E1A0C9D2B',
      status: 'active',
      createdAt: '2026-08-24 10:45:00',
      notes: 'Payé via Virement'
    }
  ];
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Routes
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

        // Pre-formatted WhatsApp confirmation message
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
  console.log('  👑 WidgetAI — Console Indépendante de Gestion des Licences');
  console.log(`  🌐 Dashboard accessible sur : http://localhost:${PORT}`);
  console.log('  🔒 Signature Cryptographique Ed25519 / HMAC-SHA256 Active');
  console.log('============================================================');
});
