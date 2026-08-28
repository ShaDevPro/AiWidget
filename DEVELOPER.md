# 🛠️ AiWidget — Architecture & Guide de Contribution pour Développeurs & Agents IA

Ce document constitue la **référence officielle** pour tout développeur ou agent IA travaillant sur le projet **AiWidget**.

---

## 🌐 1. L'Écosystème des 3 Dépôts GitHub

Le projet est structuré selon le modèle **Open-Core** réparti sur 3 dépôts distincts :

| Dépôt GitHub | Visibilité | Rôle & Contenu |
| :--- | :---: | :--- |
| **`ShaDevPro/AiWidget`** | 🌐 **PUBLIC** | **Client Desktop Principal** (Tauri + Rust + TypeScript + Studio Fooocus SDXL + Whisper + RAG Excel + Course Studio). Sous licence **GNU AGPLv3**. |
| **`ShaDevPro/AiWidget-Site`** | 🌐 **PUBLIC** | **Site Web Vitrine & Hébergement Releases** (GitHub Pages, `version.json`, téléchargement des binaires `.exe`, `.msi`, `.portable`). |
| **`ShaDevPro/AiWidget-Enterprise-Server`** | 🔒 **PRIVÉ** | **Cœur Commercial Entreprise B2B** (Serveur Rust On-Premise multi-postes `server/`, Console de Licences `license-dashboard/`, générateur HMAC). |

---

## 🔒 2. Règle d'Or de Sécurité (Protection du Code Propriétaire)

> ⚠️ **ATTENTION STRICTE POUR TOUT AGENT IA OU CONTRIBUTEUR :**
> - Les dossiers **`server/`** et **`license-dashboard/`** sont la propriété commerciale exclusive de ShaDevPro.
> - Ils sont protégés par le `.gitignore` du client public et **ne doivent JAMAIS être poussés sur le dépôt public**.
> - Pour synchroniser les modifications du serveur entreprise, utilisez **exclusivement** la commande :
>   ```bash
>   npm run sync:enterprise
>   ```

---

## ⚡ 3. Commandes d'Automatisation & Workflow

Toutes les opérations complexes ont été encapsulées dans des scripts `npm` simples :

### 💻 Développement Local
```bash
# Lancer le client desktop en mode développement (Hot-Reload)
npm run tauri:dev

# Compiler le frontend TypeScript/Vite seul (Vérification des erreurs de typage)
npm run build
```

### 📦 Compilation de Production (Release)
```bash
# Compile le frontend + binaires Tauri (Setup.exe, Setup.msi, Portable.exe) et les copie dans release/
npm run release:build

# Téléverse automatiquement les 3 binaires compilés sur GitHub Releases (tag v1.1.0)
npm run release:upload
```

### 🔄 Synchronisation des Dépôts
```bash
# 1. Synchroniser le site web public (AiWidget-Site)
npm run sync:site

# 2. Synchroniser le serveur d'entreprise sur le dépôt privé
npm run sync:enterprise

# 3. Synchroniser l'ENSEMBLE de l'écosystème en 1 seule commande maître
npm run sync:all

# 4. Pipeline complet de Release (Build + Upload Releases + Synchronisation Globale)
npm run release:all
```

---

## 🚀 4. Procédure pour Publier une Nouvelle Version (ex: v1.2.0)

Lorsqu'une nouvelle version majeure ou mineure doit être publiée :

1. **Incrémenter le numéro de version** dans les fichiers suivants :
   - [`package.json`](package.json) ➔ `"version": "1.2.0"`
   - [`src-tauri/Cargo.toml`](src-tauri/Cargo.toml) ➔ `version = "1.2.0"`
   - [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) ➔ `"version": "1.2.0"`
   - [`version.json`](version.json) et [`website/version.json`](website/version.json) ➔ `"latest_version": "1.2.0"`
2. **Lancer le pipeline complet** :
   ```bash
   npm run release:all
   ```
3. Les binaires sont automatiquement compilés, téléversés sur GitHub, le site web est mis à jour, et toutes les applications déployées dans le monde reçoivent la notification de mise à jour !

---

## 🧪 5. Architecture Technique du Client Desktop

```text
AiWidget/
├── src/                          # Frontend TypeScript / Vite
│   ├── modules/
│   │   ├── chat/                 # Contrôleur de discussion & historique
│   │   ├── image/                # Studio d'Images Fooocus SDXL & SD 1.5
│   │   ├── course/               # Studio de Cours & Générateur Pédagogique
│   │   ├── snipper/              # ScreenSnipper (Capture d'écran 1-clic)
│   │   ├── document/             # In-Memory Parser Excel (.xlsx), PDF, OCR
│   │   ├── voice/                # Whisper & Neural TTS Controller
│   │   ├── license/              # Client de connexion au Serveur PRO
│   │   ├── telemetry/            # Collecteur de métriques anonymes
│   │   └── shell/                # Widget UI (Bubble, Compact, Expanded)
│   ├── styles/                   # Styles modulaires CSS Fluent Design
│   └── i18n/                     # Traductions multilingues (FR, EN, AR RTL)
│
├── src-tauri/                    # Backend Rust Embarqué (Local)
│   ├── src/
│   │   ├── sd_engine.rs          # Moteur C++ diffusion SD.cpp (SDXL + VAE Tiling)
│   │   ├── tts_engine.rs         # Moteur de synthèse vocale neuronale
│   │   ├── whisper_engine.rs     # Moteur de transcription locale Whisper.cpp
│   │   ├── llama_engine.rs       # Interface Ollama / Llama.cpp locale
│   │   ├── web_search.rs         # Routeur de recherche Web anti-hallucination
│   │   ├── db.rs                 # Base de données SQLite locale chiffrée
│   │   └── commands/             # Pont de commandes IPC Tauri
│
├── website/                      # Site Web Vitrine Public (GitHub Pages)
│
├── server/                       # [PRIVÉ] Serveur Central On-Premise Rust
└── license-dashboard/            # [PRIVÉ] Console de Gestion des Licences & Analytics
```

---

<div align="center">

**Document maintenu par ShaDevPro pour l'automatisation des agents de code et contributeurs.**

</div>
