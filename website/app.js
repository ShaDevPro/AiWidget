/**
 * AI Widget Showcase Website — With QR Share and 100% i18n.
 */
const translations = {
  fr: {
    "nav.features": "Fonctionnalités",
    "nav.preview": "Aperçu",
    "nav.editions": "Éditions LITE & PRO",
    "nav.share": "Partager",
    "nav.download": "Télécharger",
    "nav.getApp": "Télécharger LITE",
    "hero.tag": "Version LITE 100% Gratuite & Données Sécurisées",
    "hero.title": "L'Intelligence Artificielle <br /><span class='pure-dark-text'>Directement sur votre Bureau</span>",
    "hero.subtitle": "Un widget discret, ultra-rapide et tout-en-un. Chattez avec vos modèles LLM locaux, analysez vos devis Excel et documents PDF en un clin d'œil, recherchez sur le Web sans hallucination, et pilotez tout à la voix.",
    "hero.downloadExe": "Télécharger LITE (Gratuit)",
    "hero.downloadExeSub": "Setup.exe · 8.9 Mo · Sans Licence",
    "hero.seeEditions": "Découvrir l'Offre PRO Entreprise",
    "hero.seeEditionsSub": "Serveur Réseau & Déploiement IT",
    "stats.ram": "Consommation RAM",
    "stats.privacy": "Confidentialité locale",
    "stats.latency": "Latence cloud",
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
    "features.title": "Pourquoi choisir AI Widget ?",
    "features.desc": "Une suite d'outils ultra-puissants intégrés dans une interface ergonomique et intuitive.",
    "f1.title": "100% Local & Zéro Fuite",
    "f1.desc": "Vos documents, données et conversations ne quittent jamais votre machine. Fonctionne sans connexion Internet.",
    "f2.title": "Analyse Excel & PDF Universelle",
    "f2.desc": "Glissez vos fichiers .xlsx, .docx, .pdf ou scans OCR. L'IA extrait les tableaux, calcule les sommes et résume vos dossiers.",
    "f3.title": "Recherche Web Anti-Hallucination",
    "f3.desc": "Routeur d'intention intelligent qui recherche les faits publics en temps réel avec citation exacte des sources fiables.",
    "f4.title": "Chat Vocal Whisper & TTS",
    "f4.desc": "Parlez naturellement à votre assistant avec Whisper local et écoutez ses réponses avec des voix neuronales ultra-réalistes.",
    "f5.title": "Diagrammes Mermaid & LaTeX",
    "f5.desc": "Rendu vectoriel direct de formules mathématiques complexes et de diagrammes de flux interactifs.",
    "f6.title": "Multi-Profils & Chiffrement",
    "f6.desc": "Espaces de travail isolés avec mot de passe personnel, chiffrement SQLite local et clé de sécurité master.",
    "f7.title": "Studio d'Images IA & Moteur Fooocus",
    "f7.desc": "Génération d'images locale (SD.cpp) avec styles cinématographiques Fooocus, traduction automatique des prompts et filtres négatifs pro.",
    "f8.title": "Générateur de Cours & Pédagogie IA",
    "f8.desc": "Créez des cours complets avec plans structurés, exemples concrets, quiz interactifs et export direct en document Word (.docx) ou Markdown.",
    "editions.badge": "Comparatif des Éditions",
    "editions.title": "Choisissez Votre Édition AI Widget",
    "editions.desc": "La version LITE est 100% gratuite et autonome. La version PRO Entreprise active l'infrastructure serveur réseau.",
    "editions.liteBadge": "Gratuit à vie",
    "editions.liteTitle": "Édition LITE",
    "editions.liteTarget": "Pour particuliers, professionnels indépendants & experts",
    "editions.litePrice": "0 € (Gratuit)",
    "editions.litePriceType": "Aucune licence requise · Utilisation illimitée",
    "editions.f_lite1": "LLM 100% local (Llama.cpp, Ollama, Qwen, Mistral)",
    "editions.f_lite2": "Analyse complète Excel (.xlsx multi-feuilles, .csv)",
    "editions.f_lite3": "Extraction Word (.docx), PDF volumineux & OCR",
    "editions.f_lite4": "Recherche Web anti-hallucination avec citations",
    "editions.f_lite5": "Chat Vocal haute définition (Whisper + TTS)",
    "editions.f_lite6": "Studio d'Images Fooocus (Stable Diffusion local 100% privé)",
    "editions.f_lite7": "Générateur de Cours & Pédagogie avec export Word (.docx)",
    "editions.f_lite8": "Multi-profils sécurisés avec mot de passe local",
    "editions.btnLite": "Télécharger Gratuitement",
    "editions.proBadge": "Version Serveur & Réseau",
    "editions.proTitle": "PRO Entreprise",
    "editions.proTarget": "Pour entreprises, équipes, parcs informatiques & serveurs locaux",
    "editions.proPrice": "Licence Entreprise",
    "editions.proPriceType": "Activation par clé de licence sécurisée (HWID)",
    "editions.f_pro_all": "Toutes les fonctionnalités LITE, plus :",
    "editions.f_pro1": "Serveur IA Centralisé & RAG d'Entreprise partagé en réseau",
    "editions.f_pro2": "Package MSI d'entreprise pour déploiement silencieux (GPO / SCCM)",
    "editions.f_pro3": "Politiques de Groupe IT & Verrouillage de conformité (Lockdown)",
    "editions.f_pro4": "Console d'administration : gestion des comptes & quotas de tokens",
    "editions.f_pro5": "Conformité RGPD On-Premise 100% étanche (Air-Gapped ready)",
    "editions.f_pro6": "Support technique prioritaire & accompagnement à l'intégration",
    "editions.btnPro": "Contacter le Service Entreprise",
    "share.tag": "Partage Instantané",
    "share.title": "Partagez AI Widget avec Vos Proches & Équipes",
    "share.desc": "Faites découvrir la puissance d'une intelligence artificielle 100% locale, sans abonnement et respectueuse de la confidentialité.",
    "share.scanLabel": "Scannez pour ouvrir le site",
    "share.copyBtn": "Copier le Lien",
    "share.copied": "Lien copié dans le presse-papiers !",
    "download.title": "Télécharger AI Widget pour Windows",
    "download.desc": "Compatible Windows 10 & Windows 11 (64-bit). Sans dépendance lourde.",
    "download.recommended": "Recommandé",
    "download.setupTitle": "Installateur Standard LITE",
    "download.setupDesc": "Installation automatique avec raccourcis bureau et menu démarrer.",
    "download.btnExe": "Télécharger (.exe)",
    "download.msiTitle": "Pack Entreprise (MSI)",
    "download.msiDesc": "Package d'installation Windows pour administrateurs réseau (GPO / SCCM).",
    "download.btnMsi": "Télécharger (.msi)",
    "download.portableTitle": "Version Portable LITE",
    "download.portableDesc": "Exécutable autonome sans aucune installation requise. Clé USB ready.",
    "download.btnPortable": "Télécharger Portable",
    "footer.tagline": "Conçu avec passion par <strong>S.H.A dev</strong>. Tous droits réservés 2026.",
    "footer.contact": "Support & Contact : s.h.a.dev.pro@gmail.com"
  },
  en: {
    "nav.features": "Features",
    "nav.preview": "Preview",
    "nav.editions": "LITE & PRO Editions",
    "nav.share": "Share",
    "nav.download": "Download",
    "nav.getApp": "Download LITE",
    "hero.tag": "100% Free LITE Edition & Private AI",
    "hero.title": "Artificial Intelligence <br /><span class='pure-dark-text'>Directly on your Desktop</span>",
    "hero.subtitle": "A discrete, lightning-fast all-in-one desktop assistant. Chat with local LLMs, analyze Excel spreadsheets and PDFs instantly, browse the web with zero hallucinations, and control everything by voice.",
    "hero.downloadExe": "Download LITE (Free)",
    "hero.downloadExeSub": "Setup.exe · 8.9 MB · No License Needed",
    "hero.seeEditions": "Explore PRO Enterprise",
    "hero.seeEditionsSub": "Network Server & IT Deployment",
    "stats.ram": "RAM Footprint",
    "stats.privacy": "Local Privacy",
    "stats.latency": "Cloud Latency",
    "mockup.title": "AI Widget — Expanded Mode (ChatGPT-Style)",
    "mockup.badge": "✓ Active Local Qwen 2.5 Model",
    "mockup.userChip": "📎 Construction Quote 40 Units.xlsx (XLSX)",
    "mockup.userMsg": "Can you extract total pre-tax and tax-included amounts from this Excel estimate?",
    "mockup.botIntro": "Here is the financial breakdown extracted from the attached spreadsheet:",
    "mockup.th1": "Designation",
    "mockup.th2": "Pre-Tax Amount",
    "mockup.th3": "VAT Rate",
    "mockup.th4": "Total Incl. Tax",
    "mockup.row1_desc": "Structural Works Lot",
    "mockup.row2_desc": "Electrical & HVAC Lot",
    "mockup.total_label": "OVERALL TOTAL",
    "features.title": "Why Choose AI Widget?",
    "features.desc": "A powerful local AI workspace designed for daily professional productivity.",
    "f1.title": "100% Local & Zero Data Leak",
    "f1.desc": "Your documents, prompts, and chats never leave your machine. Works completely offline.",
    "f2.title": "Universal Excel & PDF Analysis",
    "f2.desc": "Drag and drop .xlsx, .docx, .pdf or OCR scans. AI extracts tables, sums figures and drafts summaries.",
    "f3.title": "Anti-Hallucination Web Search",
    "f3.desc": "Smart intent classifier that fetches verified real-time public facts with cited sources.",
    "f4.title": "Whisper & Neural Voice Chat",
    "f4.desc": "Speak naturally with built-in local Whisper speech recognition and listen to neural voices.",
    "f5.title": "Mermaid & LaTeX Rendering",
    "f5.desc": "Instant vector rendering of complex math formulas and interactive workflow diagrams.",
    "f6.title": "Multi-Profiles & Encryption",
    "f6.desc": "Isolated user workspaces with password protection, local SQLite encryption and master recovery key.",
    "f7.title": "AI Image Studio & Fooocus Engine",
    "f7.desc": "100% private local image generation (SD.cpp) with Fooocus cinematic styles, smart prompt expansion, and pro negative filters.",
    "f8.title": "AI Course & Pedagogical Studio",
    "f8.desc": "Create complete structured courses with lessons, quizzes, and one-click export to Word (.docx) and Markdown documents.",
    "editions.badge": "Editions Comparison",
    "editions.title": "Choose Your AI Widget Edition",
    "editions.desc": "LITE is 100% free and standalone. PRO Enterprise enables shared network server infrastructure.",
    "editions.liteBadge": "Lifetime Free",
    "editions.liteTitle": "LITE Edition",
    "editions.liteTarget": "For individuals, freelancers, consultants & power users",
    "editions.litePrice": "$0 (Free)",
    "editions.litePriceType": "Zero License Required · Unlimited Usage",
    "editions.f_lite1": "100% local LLM (Llama.cpp, Ollama, Qwen, Mistral)",
    "editions.f_lite2": "Full multi-sheet Excel spreadsheet parsing (.xlsx, .csv)",
    "editions.f_lite3": "Word (.docx) & large multi-page PDF processing + OCR",
    "editions.f_lite4": "Anti-hallucination web search with cited sources",
    "editions.f_lite5": "High-Definition Voice Chat (Whisper + Neural TTS)",
    "editions.f_lite6": "Fooocus Image Studio (100% private local Stable Diffusion)",
    "editions.f_lite7": "AI Course & Lecture Studio with Word (.docx) export",
    "editions.f_lite8": "Isolated multi-profiles with secure local passwords",
    "editions.btnLite": "Download Free",
    "editions.proBadge": "Network Server Edition",
    "editions.proTitle": "PRO Enterprise",
    "editions.proTarget": "For companies, teams, IT workstations & local servers",
    "editions.proPrice": "Enterprise License",
    "editions.proPriceType": "Hardware-Locked Activation Key (HWID)",
    "editions.f_pro_all": "Everything in LITE, plus:",
    "editions.f_pro1": "Centralized Network LLM Server & Shared Corporate RAG",
    "editions.f_pro2": "Enterprise MSI package for silent IT deployment (GPO / SCCM)",
    "editions.f_pro3": "Enterprise IT Policy & Security Lockdown enforcement",
    "editions.f_pro4": "Admin console: team member accounts & token quota limits",
    "editions.f_pro5": "100% On-Premise GDPR compliance (Air-Gapped ready)",
    "editions.f_pro6": "Priority technical support & deployment assistance",
    "editions.btnPro": "Contact Enterprise Sales",
    "share.tag": "Instant Share",
    "share.title": "Share AI Widget with Colleagues & Friends",
    "share.desc": "Empower your network with a 100% private, offline, zero-subscription desktop artificial intelligence.",
    "share.scanLabel": "Scan to open on smartphone",
    "share.copyBtn": "Copy Link",
    "share.copied": "Link copied to clipboard!",
    "download.title": "Download AI Widget for Windows",
    "download.desc": "Compatible with Windows 10 & Windows 11 (64-bit). Ultra-lightweight.",
    "download.recommended": "Recommended",
    "download.setupTitle": "Standard LITE Installer",
    "download.setupDesc": "Automatic setup with desktop and start menu shortcuts.",
    "download.btnExe": "Download (.exe)",
    "download.msiTitle": "Enterprise Package (MSI)",
    "download.msiDesc": "Windows Installer package for IT network administrators (GPO / SCCM).",
    "download.btnMsi": "Download (.msi)",
    "download.portableTitle": "Portable LITE Edition",
    "download.portableDesc": "Standalone executable with zero installation needed. USB flash drive ready.",
    "download.btnPortable": "Download Portable",
    "footer.tagline": "Built with passion by <strong>S.H.A dev</strong>. All rights reserved 2026.",
    "footer.contact": "Support & Inquiries: s.h.a.dev.pro@gmail.com"
  },
  ar: {
    "nav.features": "المميزات",
    "nav.preview": "معاينة",
    "nav.editions": "إصدارات LITE و PRO",
    "nav.share": "مشاركة",
    "nav.download": "تحميل",
    "nav.getApp": "تحميل النسخة المجانية",
    "hero.tag": "نسخة LITE مجانية 100% وخصوصية تامة",
    "hero.title": "الذكاء الاصطناعي الخارق <br /><span class='pure-dark-text'>مباشرة على سطح مكتبك</span>",
    "hero.subtitle": "أداة سطح مكتب أنيقة وسريعة للغاية. تحدث مع نماذج الذكاء الاصطناعي المحلية، حلل جداول Excel وملفات PDF فورياً، ابحث في الويب بدون هلوسة، وتحكم بالصوت.",
    "hero.downloadExe": "تحميل نسخة LITE (مجاناً)",
    "hero.downloadExeSub": "ملف Setup.exe · 8.9 ميغابايت · بدون ترخيص",
    "hero.seeEditions": "استكشف باقة PRO للمؤسسات",
    "hero.seeEditionsSub": "خادم شبكي محلي ونشر مركزي IT",
    "stats.ram": "استهلاك الذاكرة",
    "stats.privacy": "خصوصية محلية",
    "stats.latency": "تأخير السحابة",
    "mockup.title": "AI Widget — الوضع الموسع (ChatGPT-Style)",
    "mockup.badge": "✓ نموذج Qwen 2.5 المحلي نشط",
    "mockup.userChip": "📎 جدول المقايسة والأسعار.xlsx (XLSX)",
    "mockup.userMsg": "هل يمكنك استخراج الإجمالي بدون ضريبة والمبلغ الإجمالي مع الضريبة من ملف Excel هذا؟",
    "mockup.botIntro": "إليك الملخص المالي المستخرج من جدول Excel المرفق:",
    "mockup.th1": "بيان الأعمال",
    "mockup.th2": "المبلغ بدون ضريبة",
    "mockup.th3": "نسبة الضريبة",
    "mockup.th4": "الإجمالي مع الضريبة",
    "mockup.row1_desc": "بند الأعمال الإنشائية",
    "mockup.row2_desc": "بند الكهرباء والتكييف",
    "mockup.total_label": "المجموع الكلي الإجمالي",
    "features.title": "لماذا تختار AI Widget؟",
    "features.desc": "مجموعة أدوات احترافية متكاملة لزيادة الإنتاجية وحماية البيانات الشخصية.",
    "f1.title": "100% محلي وبدون تسريب بيانات",
    "f1.desc": "مستنداتك ومحادثاتك لا تغادر جهازك أبداً. يعمل بالكامل دون الحاجة للاتصال بالإنترنت.",
    "f2.title": "تحليل شامل لملفات Excel و PDF",
    "f2.desc": "اسحب ملفات Excel أو Word أو PDF أو الصور (OCR). يستخرج الذكاء الاصطناعي الجداول والحسابات فورياً.",
    "f3.title": "بحث ويب ذكي وموثوق",
    "f3.desc": "محرك تصنيف ذكي يجلب الحقائق العامة المباشرة من مصادر موثوقة دون اختلاق معلومات.",
    "f4.title": "محادثة صوتية ذكية (Whisper + TTS)",
    "f4.desc": "تحدث بشكل طبيعي عبر محرك Whisper المدمج واستمع للردود بأصوات عصبية فائقة النقاء.",
    "f5.title": "عرض المعادلات الرياضية والمخططات",
    "f5.desc": "دعم كامل لصيغ LaTeX الرياضية ومخططات Mermaid البيانية التفاعلية.",
    "f6.title": "ملفات شخصية وتشفير آمن",
    "f6.desc": "بيئات مستخدمين معزولة مع كلمة سر خاصة، تشفير محلي SQLite ومفتاح استرجاع رئيسي.",
    "f7.title": "استوديو الصور بالذكاء الاصطناعي ومحرك Fooocus",
    "f7.desc": "توليد صور محلي 100% (SD.cpp) بأنماط سينمائية واقعية مع ترجمة فورية للأوامر وفلاتر جودة احترافية.",
    "f8.title": "صانع الدروس والمحتوى التعليمي الأكاديمي",
    "f8.desc": "إنشاء دورات ودروس كاملة مع شروحات، أمثلة عملية واختبارات تفاعلية وتصدير فوري إلى مستند Word (.docx) أو Markdown.",
    "editions.badge": "مقارنة الإصدارات",
    "editions.title": "اختر الإصدار المناسب لاحتياجاتك",
    "editions.desc": "نسخة LITE مجانية بالكامل ومستقلة. نسخة PRO Entreprise تفعل البنية التحتية للخادم الشبكي المشترك.",
    "editions.liteBadge": "مجاني مدى الحياة",
    "editions.liteTitle": "إصدار LITE المجاني",
    "editions.liteTarget": "للأفراد، المستقلين، الاستشاريين والمحترفين",
    "editions.litePrice": "0 $ (مجاني)",
    "editions.litePriceType": "لا يتطلب أي ترخيص · استخدام غير محدود",
    "editions.f_lite1": "تشغيل نماذج الذكاء الاصطناعي محلياً 100% (Llama, Ollama, Qwen)",
    "editions.f_lite2": "تحليل شامل ومتقدم لملفات Excel متعددة الأوراق (.xlsx, .csv)",
    "editions.f_lite3": "معالجة ملفات Word (.docx) وملفات PDF الكبيرة وقراءة الصور (OCR)",
    "editions.f_lite4": "بحث ويب ذكي فوري مع توثيق المصادر الموثوقة",
    "editions.f_lite5": "محادثة صوتية فائقة النقاء (Whisper + نطق عصبي)",
    "editions.f_lite6": "استوديو الصور Fooocus (توليد صور Stable Diffusion محلي 100%)",
    "editions.f_lite7": "صانع الدروس الأكاديمية التفاعلية مع تصدير Word (.docx)",
    "editions.f_lite8": "ملفات مستخدمين متعددة ومحمية بكلمة سر محلية",
    "editions.btnLite": "تحميل النسخة المجانية",
    "editions.proBadge": "نسخة الخادم والشبكات",
    "editions.proTitle": "PRO Enterprise للشركات",
    "editions.proTarget": "للشركات، الفرق، المؤسسات والخوادم المحلية",
    "editions.proPrice": "ترخيص الشركات",
    "editions.proPriceType": "تفعيل عبر مفتاح ترخيص مشفر ومحمي (HWID)",
    "editions.f_pro_all": "يشمل جميع مزايا LITE، بالإضافة إلى:",
    "editions.f_pro1": "خادم ذكاء اصطناعي مركزي ومكتبة معرفية RAG مشتركة عبر الشبكة",
    "editions.f_pro2": "حزمة تثبيت MSI للشركات لنشر تلقائي صامت (GPO / SCCM)",
    "editions.f_pro3": "سياسات المجموعة وقفل الأمان المؤسسي (IT Policies & Lockdown)",
    "editions.f_pro4": "لوحة تحكم المدير: إدارة حسابات الفريق وحصص الاستهلاك (Quotas)",
    "editions.f_pro5": "مطابقة تامة لخصوصية البيانات On-Premise بدون اتصال خارجي",
    "editions.f_pro6": "دعم فني ذو أولوية ومساعدة متكاملة في التثبيت والتكامل",
    "editions.btnPro": "طلب ترخيص للشركات",
    "share.tag": "مشاركة فورية",
    "share.title": "شارك AI Widget مع زملائك وفريق عملك",
    "share.desc": "امنح فريقك قوة الذكاء الاصطناعي المحلي بالكامل دون اشتراكات شهرية ومع الحفاظ المطلق على سرية البيانات.",
    "share.scanLabel": "امسح الكود لفتح الموقع على الهاتف",
    "share.copyBtn": "نسخ الرابط",
    "share.copied": "تم نسخ الرابط إلى الحافظة بنجاح!",
    "download.title": "تحميل AI Widget لنظام Windows",
    "download.desc": "متوافق مع Windows 10 و Windows 11 (64 بت). حجم خفيف للغاية.",
    "download.recommended": "موصى به",
    "download.setupTitle": "المثبت القياسي LITE",
    "download.setupDesc": "تثبيت تلقائي وسريع مع إنشاء اختصارات سطح المكتب وقائمة ابدأ.",
    "download.btnExe": "تحميل (.exe)",
    "download.msiTitle": "حزمة الشركات (MSI)",
    "download.msiDesc": "حزمة تثبيت Windows لمسؤولي الأنظمة والشبكات (GPO / SCCM).",
    "download.btnMsi": "تحميل (.msi)",
    "download.portableTitle": "النسخة المحمولة LITE",
    "download.portableDesc": "برنامج مستقل يعمل فوراً دون الحاجة لتثبيت. جاهز للتشغيل من الفلاشة USB.",
    "download.btnPortable": "تحميل النسخة المحمولة",
    "footer.tagline": "تم التطوير بكل شغف بواسطة <strong>S.H.A dev</strong>. جميع الحقوق محفوظة 2026.",
    "footer.contact": "الدعم الفني والاستفسارات: s.h.a.dev.pro@gmail.com"
  }
};

let currentLang = 'fr';

function setLanguage(lang) {
  currentLang = lang;
  const dict = translations[lang] || translations.fr;
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

// Language selector events
document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const lang = btn.getAttribute('data-lang');
    setLanguage(lang);
  });
});

// Mobile Hamburger Menu Logic
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenu = document.getElementById('mobileMenu');
const iconMenu = mobileMenuBtn?.querySelector('.icon-menu');
const iconClose = mobileMenuBtn?.querySelector('.icon-close');

if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    if (iconMenu && iconClose) {
      iconMenu.style.display = isOpen ? 'none' : 'block';
      iconClose.style.display = isOpen ? 'block' : 'none';
    }
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      if (iconMenu && iconClose) {
        iconMenu.style.display = 'block';
        iconClose.style.display = 'none';
      }
    });
  });
}

// Toast notification helper
function showToast(msg) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  if (toast && toastMsg) {
    toastMsg.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
}

// Copy URL logic
const copyBtn = document.getElementById('copyShareUrlBtn');
const urlInput = document.getElementById('siteShareUrl');
if (copyBtn && urlInput) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlInput.value);
      const dict = translations[currentLang] || translations.fr;
      showToast(dict['share.copied'] || 'Lien copié dans le presse-papiers !');
    } catch (e) {
      showToast('Lien copié !');
    }
  });
}

// Telemetry download click tracking
document.querySelectorAll('a[href*="releases/download"]').forEach(link => {
  link.addEventListener('click', () => {
    try {
      const href = link.getAttribute('href') || '';
      let type = 'exe';
      if (href.endsWith('.msi')) type = 'msi';
      else if (href.includes('Portable')) type = 'portable';

      fetch('http://localhost:9090/api/telemetry/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
        mode: 'no-cors'
      }).catch(() => {});
    } catch (_) {}
  });
});

