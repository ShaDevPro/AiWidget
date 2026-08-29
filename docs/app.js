/**
 * AI Widget Showcase Website — Pure Monochrome Interactive Engine & Full i18n (FR, EN, AR)
 */

const translations = {
  fr: {
    "nav.howItWorks": "Fonctionnement",
    "nav.features": "Fonctionnalités",
    "nav.whyLocal": "Pourquoi Local ?",
    "nav.target": "Pour qui ?",
    "nav.editions": "LITE & PRO",
    "nav.download": "Télécharger",
    "nav.getApp": "Télécharger LITE",
    "hero.tag": "Open Source · GNU AGPLv3 · Local-First · Windows 10/11",
    "hero.title": "Votre IA. Votre PC. <br /><span class='pure-dark-text'>Vos Données.</span>",
    "hero.subtitle": "AiWidget exécute vos modèles d'intelligence artificielle localement sous Windows — sans abonnement, sans dépendance cloud obligatoire et avec un accès Internet strictement sous votre contrôle.",
    "hero.downloadExe": "Télécharger LITE",
    "hero.downloadExeSub": "v1.1.0 · Setup.exe (8.13 Mo)",
    "hero.githubBtn": "Code Source GitHub",
    "hero.githubSub": "AGPLv3 · Dépôt Public",
    "pillar1.title": "Local par défaut",
    "pillar1.desc": "Vos modèles, documents, analyses Excel et conversations s'exécutent entièrement sur votre matériel.",
    "pillar2.title": "Internet sous votre contrôle",
    "pillar2.desc": "Zéro requête Web silencieuse. AiWidget demande toujours votre autorisation avant de rechercher des faits en ligne.",
    "pillar3.title": "LITE Gratuit à vie",
    "pillar3.desc": "Aucun abonnement mensuel. Profitez de la puissance de l'IA locale sans carte bancaire ni compte cloud.",
    "pillar4.title": "Performance & Empreinte Légère",
    "pillar4.desc": "Moins de 80 Mo de RAM résidente grâce au cœur Rust natif. Démarrage instantané et zéro latence.",
    "stats.ram": "Consommation RAM",
    "stats.cloud": "Traitement 100% Autonome",
    "stats.airgap": "Isolation Réseau Possible",
    "how.badge": "Architecture & Flux de Données",
    "how.title": "Comment fonctionne AiWidget ?",
    "how.desc": "Une architecture transparente conçue pour garantir que vos données ne quittent jamais votre machine sans votre consentement explicite.",
    "how.step1Title": "Votre Requête",
    "how.step1Desc": "Vous posez une question, glissez un devis Excel, demandez une image SDXL ou un plan de cours.",
    "how.step2Title": "Traitement Local (Rust)",
    "how.step2Desc": "Le moteur natif analyse la demande en mémoire vive sur votre processeur ou votre GPU local.",
    "how.step3Title": "Contrôle Réseau",
    "how.step3No": "Exécution 100% Locale (LLM, RAG, SDXL)",
    "how.step3Yes": "Porte de confirmation : [Autoriser] / [Refuser]",
    "how.step4Title": "Réponse avec Sources",
    "how.step4Desc": "Synthèse exacte, formules mathématiques LaTeX, tableaux ou citations de sources vérifiables.",
    "mockup.title": "AI Widget — Mode Étendu (ChatGPT-Style)",
    "mockup.badge": "✓ Modèle Qwen 2.5 Local Actif",
    "mockup.userChip": "📎 Devis 40 logts.xlsx (XLSX)",
    "mockup.userMsg": "Peux-tu extraire le montant total HT et TTC de ce devis Excel ?",
    "mockup.botIntro": "Voici la synthèse financière extraite du tableau Excel joint :",
    "mockup.th1": "Désignation",
    "mockup.th2": "Montant HT",
    "mockup.th3": "Taux TVA",
    "mockup.th4": "Total TTC",
    "mockup.row1_desc": "Lot Gros Œuvre",
    "mockup.row2_desc": "Lot Électricité & CVC",
    "mockup.total_label": "MONTANT GLOBAL",
    "why.badge": "Souveraineté & Indépendance",
    "why.title": "Pourquoi choisir une IA Locale ?",
    "why.desc": "Les services d'IA Cloud traditionnels imposent des abonnements coûteux et envoient vos documents sensibles sur des serveurs distants.",
    "why.c1Title": "Confidentialité Totale",
    "why.c1Desc": "Vos bilans financiers, secrets industriels, devis et dossiers médicaux restent sur votre disque dur. Zéro entraînement de modèles sur vos données.",
    "why.c2Title": "Autonomie Hors-Connexion",
    "why.c2Desc": "Travaillez dans le train, en avion ou sur des chantiers isolés sans aucune connexion internet. L'IA fonctionne en continu.",
    "why.c3Title": "Contrôle & Liberté Totale",
    "why.c3Desc": "Choisissez vos modèles préférés (Qwen 2.5, Llama 3.3, Mistral, Gemma) en format GGUF ou via Ollama. Aucune censure arbitraire.",
    "why.c4Title": "Zéro Abonnement Récurrent",
    "why.c4Desc": "Économisez des centaines d'euros chaque année face aux abonnements cloud de 20 à 30 € par mois par utilisateur.",
    "target.badge": "Cas d'Usage Réels",
    "target.title": "Pour qui est conçu AiWidget ?",
    "target.desc": "Un outil professionnel polyvalent pensé pour booster votre productivité quotidienne sur Windows.",
    "target.t1Badge": "Tech & Code",
    "target.t1Title": "Développeurs & Ingénieurs",
    "target.t1Desc": "Analyse de logs, débogage de code source, génération de diagrammes Mermaid et interrogation de documentations techniques en local.",
    "target.t2Badge": "Bureautique & Finance",
    "target.t2Title": "Professionnels & Gestionnaires",
    "target.t2Desc": "Extraction financière de feuilles Excel multi-onglets, synthèse de rapports PDF, rédaction d'emails soignés et devis sans risque de fuite.",
    "target.t3Badge": "Éducation & Formation",
    "target.t3Title": "Étudiants & Enseignants",
    "target.t3Desc": "Création de cours structurés avec QCM interactifs, résumés de thèses, calculs scientifiques en LaTeX et export direct en Word (.docx).",
    "target.t4Badge": "Haute Sécurité",
    "target.t4Title": "Entreprises & Secteurs Sensibles",
    "target.t4Desc": "Cabinets juridiques, experts-comptables, santé et industries exigeant une stricte conformité RGPD et un déploiement On-Premise étanche.",
    "f_badge": "Fonctionnalités Clés",
    "features.title": "Les Fonctionnalités Majeures d'AiWidget",
    "features.desc": "Une suite logicielle complète intégrée dans un binaire natif Windows de seulement 8 Mo.",
    "f1.title": "Local-First & Zéro Requête Silencieuse",
    "f1.desc": "Vos données, documents, conversations et traitements IA restent locaux par défaut. AiWidget n'effectue aucune requête Internet sans votre accord.",
    "f2.title": "Analyse Excel & PDF Universelle",
    "f2.desc": "Glissez vos fichiers .xlsx, .docx, .pdf ou scans OCR. L'IA extrait les tableaux, calcule les sommes et résume vos dossiers en mémoire vive.",
    "f3.title": "Recherche Web à la Demande",
    "f3.desc": "Routeur d'intention intelligent qui détecte les besoins en données fraîches et demande confirmation avant de chercher en ligne avec sources vérifiables.",
    "f4.title": "Chat Vocal Whisper & Synthèse TTS",
    "f4.desc": "Parlez naturellement à votre assistant avec Whisper local et écoutez ses réponses avec des voix neuronales ultra-réalistes en mode continu.",
    "f5.title": "Diagrammes Mermaid & Formules LaTeX",
    "f5.desc": "Rendu vectoriel direct de formules mathématiques complexes et de diagrammes de flux interactifs exportables en PNG haute résolution.",
    "f6.title": "Multi-Profils & Chiffrement SQLite",
    "f6.desc": "Espaces de travail étanches avec mot de passe personnel, chiffrement SQLite local et protection anti-altération intégrée.",
    "f7.title": "Studio d'Images SDXL Cinema & SD 1.5",
    "f7.desc": "Génération d'images locale en C++ (SD.cpp) avec Juggernaut XL v8 (6.6 Go), fallback CPU VAE Tiling anti-crash et styles cinématiques.",
    "f8.title": "Générateur de Cours & Pédagogie IA",
    "f8.desc": "Créez des cours complets avec plans structurés, exemples concrets, quiz interactifs et export direct en document Word (.docx) ou Markdown.",
    "f9.title": "Capture d'Écran & Vision IA (Ctrl+Shift+S)",
    "f9.desc": "Capturez instantanément n'importe quelle fenêtre pour analyser des logs, déboguer du code ou extraire du texte par OCR local.",
    "opencore.badge": "Modèle Open-Core",
    "opencore.title": "Une Architecture Claire & Éthique",
    "opencore.desc": "AiWidget repose sur une séparation transparente entre le client de bureau open-source et l'infrastructure d'entreprise :",
    "opencore.box1Badge": "PUBLIC & OPEN SOURCE (AGPLv3)",
    "opencore.box1Title": "Client Desktop AiWidget",
    "opencore.box1Desc": "100% du code source client (TypeScript + Rust natif) est libre, auditable et gratuit pour tous les utilisateurs individuels.",
    "opencore.box2Badge": "OFFRE COMMERCIALE (PRO)",
    "opencore.box2Title": "Serveur Centralisé Entreprise",
    "opencore.box2Desc": "Infrastructure serveur dédiée aux organisations nécessitant un pool de GPU centralisé, des quotas par département et un déploiement MSI/GPO.",
    "editions.badge": "Comparatif des Éditions",
    "editions.title": "Choisissez Votre Édition AI Widget",
    "editions.desc": "La version LITE est 100% gratuite et autonome. La version SERVER PRO active l'infrastructure réseau d'entreprise.",
    "editions.liteBadge": "Gratuit à vie",
    "editions.liteTitle": "Édition LITE",
    "editions.liteTarget": "Pour particuliers, développeurs, experts & indépendants",
    "editions.litePrice": "0 € (Gratuit)",
    "editions.litePriceType": "Open Source · Aucune licence requise · Utilisation illimitée",
    "editions.f_lite1": "LLM 100% local (Llama.cpp, Ollama, Qwen, Mistral)",
    "editions.f_lite2": "Analyse complète Excel (.xlsx multi-feuilles, .csv)",
    "editions.f_lite3": "Extraction Word (.docx), PDF volumineux & OCR",
    "editions.f_lite4": "Recherche Web à la demande avec sources citées",
    "editions.f_lite5": "Chat Vocal haute définition (Whisper + TTS)",
    "editions.f_lite6": "Studio d'Images SDXL Cinema & SD 1.5 en local",
    "editions.f_lite7": "Générateur de Cours & Pédagogie avec export Word (.docx)",
    "editions.f_lite8": "Multi-profils sécurisés avec mot de passe local",
    "editions.btnLite": "Télécharger Gratuitement",
    "editions.proBadge": "Licence Serveur Entreprise",
    "editions.proTitle": "SERVER PRO Entreprise",
    "editions.proTarget": "Pour entreprises, parcs informatiques & équipes collaboratives",
    "editions.proPrice": "500 $ (Licence à vie)",
    "editions.proPriceType": "Licence d'instance serveur On-Premise · Zéro abonnement",
    "editions.f_pro_all": "Toutes les fonctionnalités LITE, plus :",
    "editions.f_pro1": "Serveur IA Centralisé & RAG d'Entreprise partagé sur réseau local",
    "editions.f_pro2": "Package MSI d'entreprise pour déploiement silencieux (GPO / SCCM)",
    "editions.f_pro3": "Politiques de Groupe IT & Verrouillage de conformité (Lockdown)",
    "editions.f_pro4": "Console d'administration : gestion des comptes & quotas de tokens",
    "editions.f_pro5": "Conformité RGPD On-Premise 100% étanche (Air-Gapped ready)",
    "editions.f_pro6": "Support technique prioritaire & accompagnement à l'intégration",
    "editions.btnPro": "Contacter le Service Commercial",
    "download.badge": "Packages Windows Officiels",
    "download.title": "Télécharger AI Widget pour Windows",
    "download.desc": "Compatible Windows 10 & Windows 11 (64-bit). Téléchargement direct sans inscription.",
    "download.recommended": "Recommandé",
    "download.setupTitle": "Installateur Standard LITE",
    "download.setupDesc": "Installation automatique avec raccourcis bureau, menu démarrer et mise à jour intégrée.",
    "download.btnExe": "Télécharger (.exe)",
    "download.msiTitle": "Package Entreprise (MSI)",
    "download.msiDesc": "Package d'installation Windows pour administrateurs réseau et déploiement de masse (GPO / SCCM).",
    "download.btnMsi": "Télécharger (.msi)",
    "download.portableTitle": "Version Portable LITE",
    "download.portableDesc": "Exécutable autonome sans aucune installation requise. Idéal pour clé USB et PC sécurisés.",
    "download.btnPortable": "Télécharger Portable",
    "share.tag": "Partage Instantané",
    "share.title": "Partagez AI Widget avec Vos Proches & Équipes",
    "share.desc": "Faites découvrir la puissance d'une intelligence artificielle souveraine, 100% locale, sans abonnement et respectueuse de la confidentialité.",
    "share.scanLabel": "Scannez pour ouvrir le site",
    "share.copyBtn": "Copier le Lien",
    "share.copied": "Lien copié dans le presse-papiers !",
    "footer.tagline": "Conçu avec passion par <strong>S.H.A dev</strong>. Tous droits réservés 2026.",
    "footer.contact": "Support & Contact : s.h.a.dev.pro@gmail.com"
  },
  en: {
    "nav.howItWorks": "How It Works",
    "nav.features": "Features",
    "nav.whyLocal": "Why Local?",
    "nav.target": "Who is it for?",
    "nav.editions": "LITE & PRO",
    "nav.download": "Download",
    "nav.getApp": "Download LITE",
    "hero.tag": "Open Source · GNU AGPLv3 · Local-First · Windows 10/11",
    "hero.title": "Your AI. Your PC. <br /><span class='pure-dark-text'>Your Data.</span>",
    "hero.subtitle": "AiWidget runs artificial intelligence models locally on Windows — zero subscriptions, zero mandatory cloud dependencies, and strictly user-controlled Internet access.",
    "hero.downloadExe": "Download LITE",
    "hero.downloadExeSub": "v1.1.0 · Setup.exe (8.13 MB)",
    "hero.githubBtn": "GitHub Source Code",
    "hero.githubSub": "AGPLv3 · Public Repo",
    "pillar1.title": "Local by default",
    "pillar1.desc": "Your models, documents, Excel financial analyses, and conversations run 100% on your hardware.",
    "pillar2.title": "Internet under your control",
    "pillar2.desc": "Zero silent network calls. AiWidget always asks for your explicit permission before searching the live web.",
    "pillar3.title": "LITE Free forever",
    "pillar3.desc": "No recurring monthly fees. Experience sovereign local AI without credit cards or cloud accounts.",
    "pillar4.title": "Ultra-Lightweight & Fast",
    "pillar4.desc": "Under 80 MB resident RAM powered by native Rust. Instant startup and zero latency.",
    "stats.ram": "RAM Resident",
    "stats.cloud": "100% Standalone Processing",
    "stats.airgap": "Air-Gapped Capable",
    "how.badge": "Architecture & Data Flow",
    "how.title": "How does AiWidget work?",
    "how.desc": "A transparent architecture designed to ensure your sensitive data never leaves your device without explicit consent.",
    "how.step1Title": "Your Request",
    "how.step1Desc": "Ask a question, drop an Excel quote, generate an SDXL visual, or request a complete course plan.",
    "how.step2Title": "Local Processing (Rust)",
    "how.step2Desc": "The native engine processes the request in RAM using your local CPU or GPU acceleration.",
    "how.step3Title": "Network Gate",
    "how.step3No": "100% Local Execution (LLM, RAG, SDXL)",
    "how.step3Yes": "Permission Modal: [Allow] / [Deny]",
    "how.step4Title": "Answer with Citations",
    "how.step4Desc": "Accurate summaries, LaTeX math formulas, tables, and verifiable source citations.",
    "mockup.title": "AI Widget — Expanded Mode (ChatGPT-Style)",
    "mockup.badge": "✓ Local Qwen 2.5 Model Active",
    "mockup.userChip": "📎 Quote 40 units.xlsx (XLSX)",
    "mockup.userMsg": "Can you extract total amounts before and after tax from this Excel estimate?",
    "mockup.botIntro": "Here is the financial summary extracted from the attached Excel sheet:",
    "mockup.th1": "Description",
    "mockup.th2": "Amount (Excl. Tax)",
    "mockup.th3": "VAT Rate",
    "mockup.th4": "Total (Inc. Tax)",
    "mockup.row1_desc": "Structural Works",
    "mockup.row2_desc": "Electrical & HVAC Works",
    "mockup.total_label": "GLOBAL TOTAL",
    "why.badge": "Sovereignty & Privacy",
    "why.title": "Why choose Local AI?",
    "why.desc": "Traditional cloud AI tools lock you into expensive subscriptions and upload confidential data to remote servers.",
    "why.c1Title": "Absolute Privacy",
    "why.c1Desc": "Financial balance sheets, proprietary code, trade secrets, and health records stay on your local disk.",
    "why.c2Title": "Offline Autonomy",
    "why.c2Desc": "Work in airplanes, trains, or secure offline facilities with zero internet connection.",
    "why.c3Title": "Total Control & Freedom",
    "why.c3Desc": "Use your favorite models (Qwen 2.5, Llama 3.3, Mistral, Gemma) via GGUF or Ollama without arbitrary censorship.",
    "why.c4Title": "Zero Recurring Subscriptions",
    "why.c4Desc": "Save hundreds of dollars every year compared to $20–$30/month cloud subscriptions per seat.",
    "target.badge": "Target Audience",
    "target.title": "Who is AiWidget built for?",
    "target.desc": "A versatile professional workstation designed to supercharge your everyday productivity on Windows.",
    "target.t1Badge": "Tech & Code",
    "target.t1Title": "Developers & Engineers",
    "target.t1Desc": "Log inspection, code debugging, Mermaid flowchart visualization, and offline technical documentation queries.",
    "target.t2Badge": "Business & Finance",
    "target.t2Title": "Professionals & Managers",
    "target.t2Desc": "Multi-sheet Excel financial extraction, PDF document summaries, and client estimates with zero leakage.",
    "target.t3Badge": "Education & Learning",
    "target.t3Title": "Students & Educators",
    "target.t3Desc": "Structured course generation with interactive MCQs, LaTeX academic formulas, and 1-click Word (.docx) export.",
    "target.t4Badge": "High Security",
    "target.t4Title": "Enterprises & Regulated Sectors",
    "target.t4Desc": "Law firms, accounting practices, healthcare providers, and defense contractors requiring strict GDPR/HIPAA compliance.",
    "f_badge": "Core Features",
    "features.title": "Major Core Features of AiWidget",
    "features.desc": "A full-scale native software suite engineered into an ultra-lightweight 8 MB Windows binary.",
    "f1.title": "Local-First & Zero Silent Requests",
    "f1.desc": "Your data, documents, and conversations stay local by default. AiWidget never makes silent web connections.",
    "f2.title": "Universal Excel & PDF Intelligence",
    "f2.desc": "Drop .xlsx, .docx, .pdf, or OCR scans. The AI extracts tables, computes sums, and analyzes budgets in RAM.",
    "f3.title": "On-Demand Web Search",
    "f3.desc": "Smart intent router detects when live information is needed and asks for permission before fetching web facts.",
    "f4.title": "Whisper Voice & Neural Speech",
    "f4.desc": "Talk naturally with local Whisper speech recognition and listen to neural voices in hands-free continuous mode.",
    "f5.title": "Mermaid Diagrams & LaTeX Math",
    "f5.desc": "Direct vector rendering of complex mathematics and interactive flowcharts with 1-click PNG export.",
    "f6.title": "Multi-Profiles & SQLite Encryption",
    "f6.desc": "Isolated user profiles protected with master passwords, local SQLite cryptographic storage, and anti-tamper security.",
    "f7.title": "Cinema SDXL & Fast SD 1.5 Studio",
    "f7.desc": "High-fidelity local image generation in C++ (SD.cpp) with Juggernaut XL v8 (6.6 GB) and smart CPU VAE anti-OOM fallback.",
    "f8.title": "AI Course Studio & Pedagogy",
    "f8.desc": "Generate complete curriculums with real-world analogies, interactive quizzes, and direct export to Word (.docx) or Markdown.",
    "f9.title": "1-Click Screen Snipper & AI Vision (Ctrl+Shift+S)",
    "f9.desc": "Instantly capture any window or screen area to inspect logs, debug code, or extract text via local OCR.",
    "opencore.badge": "Open-Core Model",
    "opencore.title": "Clear & Ethical Architecture",
    "opencore.desc": "AiWidget is built on a transparent division between the open-source desktop client and enterprise server:",
    "opencore.box1Badge": "PUBLIC & OPEN SOURCE (AGPLv3)",
    "opencore.box1Title": "AiWidget Desktop Client",
    "opencore.box1Desc": "100% of the desktop client source code (TypeScript + native Rust) is free, auditable, and open to everyone.",
    "opencore.box2Badge": "COMMERCIAL OFFER (PRO)",
    "opencore.box2Title": "Enterprise Centralized Server",
    "opencore.box2Desc": "On-premise infrastructure for organizations requiring centralized GPU pools, departmental quotas, and MSI/GPO deployments.",
    "editions.badge": "Edition Comparison",
    "editions.title": "Choose Your AiWidget Edition",
    "editions.desc": "The LITE edition is 100% free and standalone. The SERVER PRO edition powers on-premise enterprise fleets.",
    "editions.liteBadge": "Free Forever",
    "editions.liteTitle": "LITE Edition",
    "editions.liteTarget": "For individual developers, professionals, and power users",
    "editions.litePrice": "$0 (Free)",
    "editions.litePriceType": "Open Source · No license required · Unlimited usage",
    "editions.f_lite1": "100% Local LLM (Llama.cpp, Ollama, Qwen, Mistral)",
    "editions.f_lite2": "Full multi-sheet Excel & CSV tabular analysis",
    "editions.f_lite3": "Word (.docx), large PDF parsing & local OCR",
    "editions.f_lite4": "On-demand web search with verified source citations",
    "editions.f_lite5": "High-definition Voice Chat (Whisper + Neural TTS)",
    "editions.f_lite6": "Cinema SDXL & SD 1.5 Local Image Studio",
    "editions.f_lite7": "Course Studio with 1-click Word (.docx) export",
    "editions.f_lite8": "Encrypted multi-profile workspace isolation",
    "editions.btnLite": "Download Free",
    "editions.proBadge": "Enterprise Server License",
    "editions.proTitle": "SERVER PRO Enterprise",
    "editions.proTarget": "For corporate networks, teams, and centralized GPU clusters",
    "editions.proPrice": "$500 (Lifetime License)",
    "editions.proPriceType": "On-Premise Server instance license · Zero subscriptions",
    "editions.f_pro_all": "All LITE features, plus:",
    "editions.f_pro1": "Centralized AI Server & Shared Enterprise Network RAG",
    "editions.f_pro2": "Enterprise MSI package for silent IT mass deployment (GPO / SCCM)",
    "editions.f_pro3": "Active Directory / GPO compliance policies & security lockdown",
    "editions.f_pro4": "Admin console: user accounts, roles & token quota management",
    "editions.f_pro5": "100% Air-Gapped GDPR on-premise compliance",
    "editions.f_pro6": "Priority engineering support & integration onboarding",
    "editions.btnPro": "Contact Enterprise Sales",
    "download.badge": "Official Windows Binaries",
    "download.title": "Download AI Widget for Windows",
    "download.desc": "Compatible with Windows 10 & Windows 11 (64-bit). Direct download, no signup required.",
    "download.recommended": "Recommended",
    "download.setupTitle": "Standard LITE Installer",
    "download.setupDesc": "Automatic setup with Desktop shortcuts, Start Menu entry, and auto-updater.",
    "download.btnExe": "Download (.exe)",
    "download.msiTitle": "Enterprise Package (MSI)",
    "download.msiDesc": "Windows Installer package for network administrators and automated fleet deployment.",
    "download.btnMsi": "Download (.msi)",
    "download.portableTitle": "LITE Portable Edition",
    "download.portableDesc": "Zero-installation standalone executable. Ideal for USB drives and restricted PCs.",
    "download.btnPortable": "Download Portable",
    "share.tag": "Instant Share",
    "share.title": "Share AI Widget with Your Team & Peers",
    "share.desc": "Empower your peers with sovereign, private, and subscription-free artificial intelligence on Windows.",
    "share.scanLabel": "Scan to open on mobile",
    "share.copyBtn": "Copy Link",
    "share.copied": "Link copied to clipboard!",
    "footer.tagline": "Crafted with passion by <strong>S.H.A dev</strong>. All rights reserved 2026.",
    "footer.contact": "Support & Inquiries: s.h.a.dev.pro@gmail.com"
  },
  ar: {
    "nav.howItWorks": "كيف يعمل؟",
    "nav.features": "الميزات",
    "nav.whyLocal": "لماذا محلي؟",
    "nav.target": "لمن صُمم؟",
    "nav.editions": "LITE و PRO",
    "nav.download": "تحميل",
    "nav.getApp": "تحميل LITE",
    "hero.tag": "مفتوح المصدر · رخصة AGPLv3 · محلي بالكامل · ويندوز 10/11",
    "hero.title": "ذكاؤك الاصطناعي. حاسوبك. <br /><span class='pure-dark-text'>بياناتك في أمان.</span>",
    "hero.subtitle": "AiWidget يشغل نماذج الذكاء الاصطناعي محلياً على نظام ويندوز — بدون أي اشتراكات شهرية، بدون تبعية سحابية، مع تحكم صارم في الوصول إلى الإنترنت.",
    "hero.downloadExe": "تحميل LITE",
    "hero.downloadExeSub": "الإصدار 1.1.0 · Setup.exe (8.13 ميغابايت)",
    "hero.githubBtn": "الكود على GitHub",
    "hero.githubSub": "AGPLv3 · مستودع عام",
    "pillar1.title": "محلي بالكامل افتراضياً",
    "pillar1.desc": "النماذج، المستندات، الجداول المالية والمحادثات تعمل بنسبة 100% على عتاد جهازك الخاص.",
    "pillar2.title": "الإنترنت تحت إشرافك",
    "pillar2.desc": "صفر طلبات شبكة خفية. يطلب AiWidget إذنك دائماً قبل إجراء أي بحث على الويب المباشر.",
    "pillar3.title": "LITE مجاني مدى الحياة",
    "pillar3.desc": "لا رسوم ولا اشتراكات شهرية. تمتع بقوة الذكاء الاصطناعي السيادي دون الحاجة لبطاقات بنكية.",
    "pillar4.title": "أداء فائق وخفة استثنائية",
    "pillar4.desc": "استهلاك أقل من 80 ميغابايت من RAM بفضل لغة Rust الأصلية. تشغيل فوري وبدون أي بطء.",
    "stats.ram": "استهلاك الذاكرة RAM",
    "stats.cloud": "معالجة مستقلة تماماً",
    "stats.airgap": "يعمل في البيئات المعزولة",
    "how.badge": "الهيكلية وتدفق البيانات",
    "how.title": "كيف يعمل AiWidget؟",
    "how.desc": "بنية هندسية شفافة تضمن بقاء بياناتك الحساسة داخل جهازك دون مغادرته إلا بموافقتك الصريحة.",
    "how.step1Title": "طلبك أو سؤالك",
    "how.step1Desc": "اطرح سؤالاً، أرفق ملف إكسل مالي، اطلب رسم صورة SDXL سينمائية أو صياغة درس كامل.",
    "how.step2Title": "معالجة محلية (Rust)",
    "how.step2Desc": "يقوم المحرك المدمج بتحليل الطلب مباشرة في الذاكرة العشوائية عبر المعالج أو كرت الشاشة.",
    "how.step3Title": "بوابة التحكم في الشبكة",
    "how.step3No": "تنفيذ محلي 100% (LLM, RAG, SDXL)",
    "how.step3Yes": "نافذة موافقة صريحة: [سماح] / [رفض]",
    "how.step4Title": "إجابة موثقة بالمصادر",
    "how.step4Desc": "ملخصات دقيقة، معادلات LaTeX الرياضية، جداول منسقة وروابط مصادر قابلة للتحقق.",
    "mockup.title": "AI Widget — وضع الشاشة الموسع",
    "mockup.badge": "✓ نموذج Qwen 2.5 المحلي نشط",
    "mockup.userChip": "📎 جدول مالي 40 سكن.xlsx (XLSX)",
    "mockup.userMsg": "هل يمكنك استخراج المبلغ الإجمالي قبل الرسوم ومع الرسوم من هذا الجدول؟",
    "mockup.botIntro": "إليك الخلاصة المالية المستخرجة من جدول الإكسل المرفق:",
    "mockup.th1": "البيان",
    "mockup.th2": "المبلغ الصافي",
    "mockup.th3": "نسبة الضريبة",
    "mockup.th4": "الإجمالي شامل الضريبة",
    "mockup.row1_desc": "أشغال الهندسة المدنية",
    "mockup.row2_desc": "أشغال الكهرباء والتهوية",
    "mockup.total_label": "المبلغ الإجمالي العام",
    "why.badge": "السيادة والخصوصية",
    "why.title": "لماذا تختار ذكاءً اصطناعياً محلياً؟",
    "why.desc": "تفرض خدمات السحابة التقليدية اشتراكات دورية باهظة وترسل مستنداتك السرية إلى خوادم بعيدة.",
    "why.c1Title": "خصوصية مطلقة",
    "why.c1Desc": "تقاريرك المالية، أسرار عملك، ومستنداتك القانونية لا تغادر حاسوبك أبداً ولا تُستخدم في تدريب النماذج.",
    "why.c2Title": "استقلالية تامة بدون إنترنت",
    "why.c2Desc": "اعمل في الطائرة، في القطار أو في المواقع الميدانية المعزولة دون الحاجة لأي اتصال بالإنترنت.",
    "why.c3Title": "حرية وتحكم كامل",
    "why.c3Desc": "اختر نماذجك المفضلة (Qwen 2.5, Llama 3.3, Mistral, Gemma) بصيغة GGUF أو عبر Ollama بلا قيود تعسفية.",
    "why.c4Title": "صفر اشتراكات دورية",
    "why.c4Desc": "وفّر مئات الدولارات سنوياً مقارنة باشتراكات السحابة التي تكلف 20 إلى 30 دولاراً شهرياً لكل مستخدم.",
    "target.badge": "الفئات المستهدفة",
    "target.title": "لمن صُمم AiWidget؟",
    "target.desc": "محطة عمل متكاملة مصممة لمضاعفة إنتاجيتك اليومية على نظام التشغيل ويندوز.",
    "target.t1Badge": "البرمجة والتقنية",
    "target.t1Title": "المطورون والمهندسون",
    "target.t1Desc": "تحليل سجلات الأخطاء، تصحيح الشيفرات البرمجية، إنشاء مخططات Mermaid وتصفح التوثيقات التقنية محلياً.",
    "target.t2Badge": "الأعمال والمالية",
    "target.t2Title": "المهنيون والمدراء",
    "target.t2Desc": "استخراج الجداول المالية المعقدة من ملفات Excel، تلخيص تقارير PDF وصياغة المراسلات دون تسريب للبيانات.",
    "target.t3Badge": "التعليم والتدريب",
    "target.t3Title": "الطلاب والأساتذة",
    "target.t3Desc": "إنشاء مناهج دراسية متكاملة مع اختبارات تفاعلية، معادلات LaTeX وتصدير فوري إلى مستندات Word (.docx).",
    "target.t4Badge": "الأمان العالي",
    "target.t4Title": "الشركات والقطاعات الحساسة",
    "target.t4Desc": "المكاتب القانونية، مكاتب المحاسبة، القطاع الصحي والمصانع التي تتطلب امتثالاً صارماً لمعايير حماية البيانات.",
    "f_badge": "الميزات الأساسية",
    "features.title": "الميزات التقنية الرئيسية لـ AiWidget",
    "features.desc": "حزمة برمجية متكاملة مدمجة داخل تطبيق ويندوز فائق الخفة بحجم 8 ميغابايت فقط.",
    "f1.title": "محلي أولاً وبلا طلبات صامتة",
    "f1.desc": "بياناتك، ملفاتك، محادثاتك ونماذجك تعمل محلياً افتراضياً. لا يتصل AiWidget بالإنترنت إلا بموافقتك.",
    "f2.title": "تحليل شامل لملفات Excel و PDF",
    "f2.desc": "اسحب ملفات .xlsx و .docx و .pdf أو الصور الممسوحة. يستخرج الذكاء الاصطناعي الجداول ويحللها في الذاكرة.",
    "f3.title": "بحث على الويب عند الطلب",
    "f3.desc": "موجه ذكي يرصد الحاجة للمعلومات الحديثة ويطلب الإذن قبل البحث المباشر مع توثيق المصادر بدقة.",
    "f4.title": "محادثة صوتية Whisper و TTS",
    "f4.desc": "تحدث بصوتك طبيعياً مع معالج Whisper المحلي واستمع للردود بأصوات عصبية فائقة النقاء في وضع متواصل.",
    "f5.title": "مخططات Mermaid ومعادلات LaTeX",
    "f5.desc": "تصيير مباشر للمعادلات الرياضية المعقدة والمخططات الانسيابية مع إمكانية التصدير بصيغة PNG عالية الدقة.",
    "f6.title": "ملفات شخصية متعددة وقاعدة SQLite مشفرة",
    "f6.desc": "مساحات عمل مستقلة ومحمية بكلمة سر شخصية وتشفير محلي لقواعد البيانات.",
    "f7.title": "استوديو الصور SDXL Cinema و SD 1.5",
    "f7.desc": "توليد صور محلي عالي الجودة بلغة C++ (SD.cpp) مع نموذج Juggernaut XL v8 ودعم ذكي لمنع نفاد الذاكرة.",
    "f8.title": "استوديو الدروس والتعليم الذكي",
    "f8.desc": "أنشئ دورات تعليمية شاملة بأمثلة عملية، أسئلة تفاعلية مع تصدير مباشر إلى Word (.docx) و Markdown.",
    "f9.title": "التقاط الشاشة والرؤية البصرية (Ctrl+Shift+S)",
    "f9.desc": "التقاط فوري لأي نافذة لتحليل سجلات الأخطاء البرمجية واستخراج النصوص عبر التعرف البصري المحلي OCR.",
    "opencore.badge": "نموذج Open-Core",
    "opencore.title": "هيكلية واضحة وأخلاقية",
    "opencore.desc": "يقوم AiWidget على فصل شفاف بين تطبيق سطح المكتب مفتوح المصدر والبنية التحتية للمؤسسات:",
    "opencore.box1Badge": "عام ومفتوح المصدر (AGPLv3)",
    "opencore.box1Title": "تطبيق سطح المكتب AiWidget",
    "opencore.box1Desc": "100% من الشيفرة المصدرية للتطبيق (TypeScript + Rust) مفتوحة ومتاحة مجاناً لجميع المستخدمين الأفراد.",
    "opencore.box2Badge": "عرض تجاري للمؤسسات (PRO)",
    "opencore.box2Title": "خادم المؤسسات المركزي",
    "opencore.box2Desc": "بنية تحتية مخصصة للشركات توفر خادم معالجة مركزي، إدارة حصص للمستخدمين ونشر الحزم عبر GPO / SCCM.",
    "editions.badge": "مقارنة الإصدارات",
    "editions.title": "اختر إصدارك من AI Widget",
    "editions.desc": "إصدار LITE مجاني ومستقل بنسبة 100%. إصدار SERVER PRO يفعل البنية التحتية الشبكية للشركات.",
    "editions.liteBadge": "مجاني مدى الحياة",
    "editions.liteTitle": "إصدار LITE",
    "editions.liteTarget": "للأفراد، المطورين، الخبراء والمستقلين",
    "editions.litePrice": "0 دولار (مجاناً)",
    "editions.litePriceType": "مفتوح المصدر · لا يتطلب أي ترخيص · استخدام غير محدود",
    "editions.f_lite1": "نماذج لغوية محلية 100% (Llama, Ollama, Qwen, Mistral)",
    "editions.f_lite2": "تحليل كامل لجداول Excel متعددة الصفحات وملفات CSV",
    "editions.f_lite3": "استخراج نصوص Word و PDF الضخمة مع ميزة OCR",
    "editions.f_lite4": "بحث على الويب عند الطلب مع توثيق الروابط والمصادر",
    "editions.f_lite5": "محادثة صوتية عالية الدقة (Whisper + أصوات TTS)",
    "editions.f_lite6": "استوديو توليد الصور المحلي SDXL Cinema و SD 1.5",
    "editions.f_lite7": "استوديو صناعة الدروس مع تصدير فوري إلى Word (.docx)",
    "editions.f_lite8": "ملفات شخصية مشفرة بكلمة مرور محلية",
    "editions.btnLite": "تحميل مجاناً",
    "editions.proBadge": "ترخيص خادم المؤسسات",
    "editions.proTitle": "إصدار SERVER PRO للشركات",
    "editions.proTarget": "للشركات، بيئات العمل وشبكات الخوادم المحلية",
    "editions.proPrice": "500 دولار (ترخيص مدى الحياة)",
    "editions.proPriceType": "ترخيص خادم محلي On-Premise · بلا أي اشتراكات دورية",
    "editions.f_pro_all": "جميع ميزات LITE، بالإضافة إلى :",
    "editions.f_pro1": "خادم ذكاء اصطناعي مركزي مع قاعدة RAG مشتركة على الشبكة",
    "editions.f_pro2": "حزمة MSI للشركات للنشر الصامت عبر (GPO / SCCM)",
    "editions.f_pro3": "سياسات المجموعة وقفل الأمان والامتثال المؤسسي",
    "editions.f_pro4": "لوحة تحكم إدارية: إدارة الحسابات وتحديد حصص الاستخدام",
    "editions.f_pro5": "توافق كامل مع معايير حماية البيانات في بيئة معزولة (Air-Gap)",
    "editions.f_pro6": "دعم فني هندسي ذو أولوية ومرافقة في النشر والتكامل",
    "editions.btnPro": "الاتصال بفريق المبيعات",
    "download.badge": "حزم التثبيت الرسمية لويندوز",
    "download.title": "تحميل AI Widget لنظام ويندوز",
    "download.desc": "متوافق مع ويندوز 10 وويندوز 11 (64-بت). تحميل مباشر دون تسجيل.",
    "download.recommended": "موصى به",
    "download.setupTitle": "المثبت القياسي LITE",
    "download.setupDesc": "تثبيت تلقائي مع اختصارات سطح المكتب وقائمة ابدأ ونظام تحديث ذكي.",
    "download.btnExe": "تحميل (.exe)",
    "download.msiTitle": "حزمة الشركات (MSI)",
    "download.msiDesc": "حزمة MSI مخصصة لمدراء الأنظمة والنشر الموسع على الشبكة.",
    "download.btnMsi": "تحميل (.msi)",
    "download.portableTitle": "النسخة المحمولة Portable",
    "download.portableDesc": "تطبيق مستقل يعمل مباشرة دون أي تثبيت. مثالي للتشغيل من فلاش USB.",
    "download.btnPortable": "تحميل النسخة المحمولة",
    "share.tag": "مشاركة فورية",
    "share.title": "شارك AI Widget مع زملائك وفريقك",
    "share.desc": "عرّف المحيطين بك على قوة الذكاء الاصطناعي السيادي، المحلي بنسبة 100% والمحترم للخصوصية.",
    "share.scanLabel": "امسح الرمز لفتح الموقع على الهاتف",
    "share.copyBtn": "نسخ الرابط",
    "share.copied": "تم نسخ الرابط بنجاح!",
    "footer.tagline": "صُمم بكل شغف بواسطة <strong>S.H.A dev</strong>. جميع الحقوق محفوظة 2026.",
    "footer.contact": "الدعم والتواصل: s.h.a.dev.pro@gmail.com"
  }
};

let currentLang = 'fr';

function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  
  // HTML Direction and Lang Attribute
  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === 'ar') ? 'rtl' : 'ltr';
  
  // Apply translated text
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Update active state on language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Save preference
  try {
    localStorage.setItem('aiwidget_lang', lang);
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Language selector buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedLang = btn.getAttribute('data-lang');
      setLanguage(selectedLang);
    });
  });

  // Load stored language or fallback to French
  try {
    const storedLang = localStorage.getItem('aiwidget_lang');
    if (storedLang && translations[storedLang]) {
      setLanguage(storedLang);
    } else {
      setLanguage('fr');
    }
  } catch (e) {
    setLanguage('fr');
  }

  // 2. Mobile Menu Toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      const iconMenu = mobileBtn.querySelector('.icon-menu');
      const iconClose = mobileBtn.querySelector('.icon-close');
      if (iconMenu && iconClose) {
        iconMenu.style.display = isOpen ? 'none' : 'block';
        iconClose.style.display = isOpen ? 'block' : 'none';
      }
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        const iconMenu = mobileBtn.querySelector('.icon-menu');
        const iconClose = mobileBtn.querySelector('.icon-close');
        if (iconMenu && iconClose) {
          iconMenu.style.display = 'block';
          iconClose.style.display = 'none';
        }
      });
    });
  }

  // 3. Copy Share Link
  const copyBtn = document.getElementById('copyShareBtn');
  const shareInput = document.getElementById('shareUrlInput');
  const toast = document.getElementById('toastNotification');

  if (copyBtn && shareInput) {
    copyBtn.addEventListener('click', () => {
      shareInput.select();
      shareInput.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(shareInput.value).then(() => {
        if (toast) {
          const toastMsg = document.getElementById('toastMessage');
          if (toastMsg) {
            toastMsg.textContent = (translations[currentLang] && translations[currentLang]['share.copied']) || 'Lien copié !';
          }
          toast.classList.add('show');
          setTimeout(() => {
            toast.classList.remove('show');
          }, 3000);
        }
      }).catch(err => {
        console.error('Clipboard copy failed:', err);
      });
    });
  }
});
