# AI Widget — Assistant IA Desktop Premium pour Windows

<div align="center">

**Un widget desktop Windows élégant, performant et privé, propulsé par un LLM open source exécuté localement.**

*Construit avec Tauri + TypeScript + SQLite + Ollama*

[![Tauri](https://img.shields.io/badge/Tauri-1.6-FFC131?logo=tauri&logoColor=fff&style=flat-square)]()
[![Rust](https://img.shields.io/badge/Rust-1.70%2B-DEA584?logo=rust&logoColor=fff&style=flat-square)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=fff&style=flat-square)]()
[![SQLite](https://img.shields.io/badge/SQLite-bundled-003B57?logo=sqlite&style=flat-square)]()
[![Ollama](https://img.shields.io/badge/Ollama-compatible-000000?logo=ollama&style=flat-square)]()
[![Languages](https://img.shields.io/badge/Lang-EN%20%7C%20FR%20%7C%20AR-6366f1?style=flat-square)]()

</div>

---

## ✨ Fonctionnalités

### 🔒 **100% Local & Privé**
- Toutes les conversations sont stockées **sur votre machine** (SQLite)
- Le LLM s'exécute **localement** via Ollama — **aucun appel externe**, aucune donnée envoyée
- Base de données chiffrée implicitement par emplacement : `%LOCALAPPDATA%\AIWidget\aiwidget.db`

### 🧠 **LLM Open Source Local**
- Compatible avec **Ollama** : LLaMA 3, Mistral, Gemma 2, Qwen, Phi, CodeLlama, etc.
- **Streaming des réponses** en temps réel (token par token)
- Gestion de plusieurs modèles installés avec taille visible
- Téléchargement de modèles directement depuis l'interface

### 💬 **Conversations Persistantes**
- Historique complet, recherches instantanées
- Groupement temporel (Aujourd'hui / Hier / 7 derniers jours / Plus ancien)
- Titres générés automatiquement depuis le premier message

### 🌍 **Multilingue (EN / FR / AR)**
- Interface **entièrement traduite** dans les 3 langues
- **Support RTL complet** pour l'arabe (disposition, texte, boutons)
- Basculement rapide depuis la barre latérale sans redémarrage
- Prompts système du LLM adaptés à chaque langue

### 🎨 **Interface Premium Windows 11**
- Design **Fluent/Mica-inspired**, thème sombre par défaut + thème clair
- Responsive, animations fluides, icônes SVG vectorielles
- Rendu Markdown complet des réponses (code, listes, titres, citations)
- Copie rapide des réponses, bulles utilisateur/assistant distinctes

### ⚙️ **Paramètres & Contrôle**
- **Température** (aléatoire : 0 → 1)
- **Longueur max** des réponses (256 → 8192 tokens)
- Modèle par défaut, URL Ollama personnalisable
- Test de connexion à Ollama en un clic

### ⚡ **Performance (Tauri)**
- **~20 Mo d'installateur** (vs ~200 Mo pour Electron)
- **~80 Mo de RAM** au repos (vs ~300-500 Mo Electron)
- Runtime natif Rust, consommation CPU minimale

---

## 🚀 Installation Rapide

### Prérequis obligatoires

| Outil | Version minimum | Téléchargement |
|-------|-----------------|----------------|
| **Node.js** | v20+ LTS | https://nodejs.org/fr/download |
| **Rust** | 1.70+ | https://rustup.rs/ |
| **Ollama** | 0.1.30+ | https://ollama.com/download/windows |
| **WebView2** | Inclus (Win10/11) | Déjà présent sur Windows récent |

> Sous Windows, Rust nécessite **Visual Studio Build Tools** (C++). L'installeur rustup vous guidera.

---

### 1. Installer Ollama (obligatoire pour le LLM local)

1. Téléchargez et installez **Ollama pour Windows** : https://ollama.com/download/windows
2. Lancez Ollama : il démarre automatiquement en arrière-plan sur le port `11434`
3. Vérifiez l'installation avec un modèle test :

```powershell
ollama pull llama3.1:8b
ollama run llama3.1:8b "Bonjour!"
```

#### Modèles recommandés (par RAM disponible)

| RAM | Modèle recommandé | Commande |
|-----|-------------------|----------|
| **8 Go** | Gemma 2 2B / Phi 3 | `ollama pull gemma2:2b` |
| **16 Go** | LLaMA 3.1 8B / Mistral 7B | `ollama pull llama3.1:8b` |
| **32 Go+** | LLaMA 3.1 70B (Q4) | `ollama pull llama3.1:70b` |

> ⚠️ Ollama doit **tourner en fond** quand vous utilisez AI Widget. Vérifiez l'icône dans la zone de notification.

---

### 2. Cloner & installer AI Widget

```powershell
# Aller dans le dossier de projet
cd "C:\Users\VOTRE_NOM\Desktop\AiWidget"

# Installer les dépendances npm (TypeScript, Tauri, i18n, Marked)
npm install
```

---

## 🎮 Mode Développement (Dev)

```powershell
npm run tauri:dev
```

Cette commande :
1. Démarre Vite en mode **HMR** sur `http://localhost:1420`
2. Compile le backend Rust et ouvre la fenêtre native
3. Permet le hot-reload du frontend et du backend

> ✏️ Modifiez les fichiers dans `src/` (frontend) ou `src-tauri/src/` (Rust) — l'app se recharge automatiquement.

---

## 🏗️ Build Production Windows

### Installateur MSI + NSIS

```powershell
npm run tauri:build
```

**Production** : cette commande :
1. Build le frontend (minifié, gzippé) → `dist/`
2. Compile Rust en **release** (optimisé, pas de débogage)
3. Génère **2 installateurs Windows** dans `src-tauri/target/release/bundle/` :
   - `msi/AI Widget_1.0.0_x64_en-US.msi` (Installeur Windows Installer)
   - `nsis/AI Widget_1.0.0_x64-setup.exe` (Installeur graphique classique)

> 📦 Taille typique : **18-25 Mo** (selon le build WebView).

### Exécutable portable (sans installateur)

```powershell
cd src-tauri/target/release
./ai-widget.exe
```

Vous pouvez copier `ai-widget.exe` sur n'importe quelle machine Windows (WebView2 requis).

---

## ⚙️ Configuration détaillée

### URL d'Ollama personnalisée

Si vous avez changé le port ou utilisez une instance distante :

1. Ouvrez **Paramètres** (icône engrenage ⚙️)
2. Modifiez **URL de base Ollama** (ex: `http://192.168.1.10:11434`)
3. Cliquez sur **Tester la connexion**
4. Enregistrez

### Emplacement de la base de données

Toutes les conversations et paramètres sont stockés dans :

```
%LOCALAPPDATA%\AIWidget\aiwidget.db
```

Exemple : `C:\Users\John\AppData\Local\AIWidget\aiwidget.db`

- **Sauvegarde** : copiez simplement ce fichier
- **Réinitialisation complète** : supprimez le fichier (l'app en recrée un vierge)

### Schéma SQLite

```sql
-- Conversations
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,         -- UUID
    title TEXT NOT NULL,         -- Titre de la conv
    model TEXT NOT NULL,         -- Modèle utilisé
    created_at TEXT,             -- ISO 8601
    updated_at TEXT              -- ISO 8601
);

-- Messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT FK,     -- CASCADE si conv supprimée
    role TEXT NOT NULL,          -- user / assistant / system
    content TEXT NOT NULL,       -- Contenu texte brut
    created_at TEXT
);

-- Paramètres (JSON sérialisé)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## 🛠️ Structure du Projet

```
AiWidget/
├── src/                           # Frontend TypeScript
│   ├── main.ts                    # Point d'entrée
│   ├── App.ts                     # Classe principale UI (700 LoC)
│   ├── styles.css                 # Design système Fluent (L:1000)
│   ├── types.ts                   # Types TypeScript
│   ├── utils.ts                   # Markdown + formatage dates
│   ├── api/index.ts               # Wrapper invoke() Tauri
│   ├── i18n/
│   │   ├── index.ts               # Init i18next + direction RTL
│   │   └── locales/
│   │       ├── en.json            # 🇬🇧 Anglais
│   │       ├── fr.json            # 🇫🇷 Français
│   │       └── ar.json            # 🇸🇦 Arabe (RTL + prompts LLM)
│   └── ui/icons.ts                # Lib SVG inline (24 icônes)
│
├── src-tauri/                     # Backend Rust
│   ├── Cargo.toml                 # Crates: tauri, rusqlite, reqwest, tokio...
│   ├── tauri.conf.json            # Config Tauri (icone, allowlist, fenêtre)
│   ├── build.rs                   # Build script Tauri
│   ├── icons/                     # 32x32, 128x128, @2x, .ico, .icns
│   └── src/
│       ├── main.rs                # #9 commandes Tauri + state
│       ├── models.rs              # Structs serde (Conversation, Message...)
│       ├── db.rs                  # SQLite rusqlite (bundled, no install)
│       └── llm.rs                 # Client Ollama (HTTP, streaming SSE)
│
├── public/                        # Assets statiques
│   ├── icon.png                   # 128x128
│   └── favicon.png                # 32x32
│
├── package.json                   # Scripts npm
├── tsconfig.json                  # TS strict
├── vite.config.ts                 # Vite port 1420
└── index.html                     # Entry HTML
```

---

## 📡 Commandes Tauri exposées (Invoke)

| Commande Rust | Rôle |
|---|---|
| `get_conversations` | Liste des conversations (triées par date) |
| `create_conversation(title, model)` | Nouvelle conversation |
| `delete_conversation(id)` | Supprime + messages liés |
| `get_messages(conv_id)` | Messages d'une conversation |
| `save_message({conv_id, role, content})` | Persiste un message |
| `get_settings()` → `AppSettings` | Récupère la config JSON |
| `save_settings(settings)` | Sauvegarde la config |
| `list_models(base_url?)` | Liste les modèles Ollama |
| `pull_model(model, base_url?)` | Télécharge un modèle (stream) |
| `check_ollama_connection(url?)` | Test de connexion booléen |
| `generate_response(model, msgs, T, N, window)` | Chat **streaming** via event `chat-token` |

### Événements frontend émis par Rust

```typescript
// Nouveau token de streaming
await listen('chat-token', ({ payload }) => {
  payload.content; // morceau de réponse
  payload.done;    // true quand terminé
});

// Progression du téléchargement d'un modèle
await listen('model-pull-progress', ({ payload }) => {
  // payload.status + payload.completed / payload.total
});
```

---

## 🌐 Support RTL (Arabe)

Le support arabe est **natif** :

- `document.documentElement.dir = "rtl"` appliqué au switch de langue
- `body.rtl` active les règles CSS : `flex-direction` inversées, `border-inline-start`, marges `inset-inline-*`
- Tous les textes utilisent `text-align` héritée (suivent dir=rtl)
- Bulles de chat inversées, panneau de paramètres s'ouvre à gauche

---

## ❌ Dépannage (FAQ)

### ❓ Le widget se lance mais "Non connecté à Ollama"

- **Vérifiez Ollama est démarré** : icône bleue dans la barre système
- **Testez manuellement** : ouvrez `http://localhost:11434/api/tags` dans le navigateur (doit renvoyer du JSON)
- **Pare-feu Windows** : autorisez Ollama sur le réseau privé
- **Port changé** : modifiez l'URL dans Paramètres (ex: `localhost:11435`)

### ❓ Erreur "No models available"

Aucun modèle n'est installé localement. Allez dans **Paramètres → section LLM** et entrez :
`llama3.1:8b` puis bouton **Télécharger un modèle** — ou en CLI :

```powershell
ollama pull llama3.1:8b
```

### ❓ Le build échoue "WebView2 not found"

Windows 7/8 : installez [WebView2 Runtime](https://developer.microsoft.com/fr-fr/microsoft-edge/webview2/)
Windows 10+ : il est déjà inclus.

### ❓ Build MSI échoue (WiX)

Installez **WiX Toolset v3** via :
```powershell
dotnet tool install --global wix  # ou
choco install wixtoolset
```

### ❓ Erreur Rust "link.exe not found"

Relancez `rustup` et cochez **MSVC** + **Visual Studio Build Tools** lors de l'installation.

### ❓ Supprimer toutes les données

Fermez AI Widget et supprimez :
```
%LOCALAPPDATA%\AIWidget\
```

---

## 🔗 Références

- **Tauri v1** : https://tauri.app/v1/guides/
- **Ollama API** : https://github.com/ollama/ollama/blob/main/docs/api.md
- **Ollama Library** : https://ollama.com/library
- **i18next** : https://www.i18next.com/
- **Rusqlite** : https://docs.rs/rusqlite/
- **Marked.js** : https://marked.js.org/

---

## 📄 Licence

Projet fourni tel quel, à des fins éducatives / professionnelles.

---

> 🎯 **Pour démarrer maintenant :**
> ```powershell
> npm install
> npm run tauri:dev
> ```
> Puis dans l'interface → Paramètres → Vérifiez la connexion à Ollama, sélectionnez votre modèle, et parlez !
