/**
 * CourseStudioEngine — Moteur autonome de génération itérative de cours complets (multi-turn pipeline).
 * Adapté de course_generator-main avec support hors-ligne, multi-modèles, et i18n FR/EN/AR.
 */

import { api } from '../../api';
import { t } from '../../i18n';
import type { CourseStudioConfig } from './CourseStudioModal';

export interface CourseProgressEvent {
  step: 'outline' | 'chapter' | 'quiz' | 'done' | 'error';
  currentChapter?: number;
  totalChapters?: number;
  chapterTitle?: string;
  percent: number;
  statusText: string;
}

export interface CourseGenerationResult {
  title: string;
  subject: string;
  level: string;
  language: string;
  chaptersCount: number;
  wordsCount: number;
  pagesCount: number;
  hasQuiz: boolean;
  fullMarkdown: string;
  outlineMarkdown: string;
}

export class CourseStudioEngine {
  /**
   * Lance le pipeline multi-étapes complet de génération du cours.
   */
  static async generateCoursePipeline(
    config: CourseStudioConfig,
    model: string,
    baseUrl: string | undefined,
    temperature: number | undefined,
    onProgress: (event: CourseProgressEvent, intermediateMarkdown?: string) => void,
  ): Promise<CourseGenerationResult> {
    const lang = config.language || 'fr';
    const chaptersCount = config.chaptersCount || 5;
    const wordsPerChapter = config.wordsPerChapter || 1200;

    // ── Phase 1 : Cadrage, Titre & Sommaire ─────────────────────────────
    onProgress({
      step: 'outline',
      percent: 10,
      statusText: t('courseStudio.progressOutline', { defaultValue: 'Élaboration du titre académique et du sommaire structuré...' }),
    });

    const outlinePrompt = this.buildOutlinePrompt(config);
    const outlineSystem = this.buildSystemPrompt(config);

    const outlineResponse = await api.generateResponse(
      model,
      [
        { role: 'system', content: outlineSystem },
        { role: 'user', content: outlinePrompt },
      ],
      temperature ?? 0.6,
      2500,
      baseUrl,
      false,
    );

    const cleanedOutline = this.cleanMarkdownFences(outlineResponse);
    const courseTitle = this.extractTitle(cleanedOutline) || config.subject;
    const chapterTitles = this.parseChapterTitles(cleanedOutline, chaptersCount, lang);

    let fullCourseMarkdown = `${cleanedOutline.trim()}\n\n---\n\n`;

    // ── Phase 2 : Boucle de Rédaction des N Chapitres ───────────────────
    for (let i = 0; i < chapterTitles.length; i++) {
      const chapterNum = i + 1;
      const chapterTitle = chapterTitles[i];
      const percent = Math.round(15 + (i / chapterTitles.length) * 70);

      onProgress(
        {
          step: 'chapter',
          currentChapter: chapterNum,
          totalChapters: chapterTitles.length,
          chapterTitle,
          percent,
          statusText: t('courseStudio.progressChapter', {
            defaultValue: `Rédaction approfondie du Chapitre ${chapterNum}/${chapterTitles.length} : ${chapterTitle}...`,
            current: chapterNum,
            total: chapterTitles.length,
            title: chapterTitle,
          }),
        },
        fullCourseMarkdown,
      );

      const chapterPrompt = this.buildChapterPrompt(
        config,
        courseTitle,
        cleanedOutline,
        chapterTitle,
        chapterNum,
        chapterTitles.length,
        wordsPerChapter,
      );

      const chapterResponse = await api.generateResponse(
        model,
        [
          { role: 'system', content: outlineSystem },
          { role: 'user', content: chapterPrompt },
        ],
        temperature ?? 0.7,
        3500,
        baseUrl,
        false,
      );

      const cleanedChapter = this.cleanMarkdownFences(chapterResponse);
      fullCourseMarkdown += `\n\n${cleanedChapter.trim()}\n\n---\n\n`;
    }

    // ── Phase 3 : Quiz QCM d'Auto-Évaluation (si activé) ───────────────
    let hasQuiz = false;
    if (config.includeQuiz) {
      onProgress(
        {
          step: 'quiz',
          percent: 92,
          statusText: t('courseStudio.progressQuiz', { defaultValue: 'Conception du Quiz QCM d\'auto-évaluation et des corrigés...' }),
        },
        fullCourseMarkdown,
      );

      const quizPrompt = this.buildQuizPrompt(config, courseTitle, cleanedOutline);
      const quizResponse = await api.generateResponse(
        model,
        [
          { role: 'system', content: outlineSystem },
          { role: 'user', content: quizPrompt },
        ],
        temperature ?? 0.6,
        2000,
        baseUrl,
        false,
      );

      const cleanedQuiz = this.cleanMarkdownFences(quizResponse);
      fullCourseMarkdown += `\n\n${cleanedQuiz.trim()}\n\n`;
      hasQuiz = true;
    }

    // ── Phase 4 : Statistiques Finales ──────────────────────────────────
    const wordsCount = fullCourseMarkdown.trim().split(/\s+/).filter(Boolean).length;
    const pagesCount = Math.max(1, Math.round(wordsCount / 350));

    onProgress({
      step: 'done',
      percent: 100,
      statusText: t('courseStudio.progressDone', { defaultValue: 'Cours complet finalisé avec succès !' }),
    });

    return {
      title: courseTitle,
      subject: config.subject,
      level: config.level,
      language: lang,
      chaptersCount: chapterTitles.length,
      wordsCount,
      pagesCount,
      hasQuiz,
      fullMarkdown: fullCourseMarkdown.trim(),
      outlineMarkdown: cleanedOutline.trim(),
    };
  }

  /**
   * System prompt d'excellence pédagogique Feynman avec respect strict de la langue.
   */
  private static buildSystemPrompt(config: CourseStudioConfig): string {
    const lang = config.language;
    if (lang === 'ar') {
      return `
أنت بروفيسور جامعي وباحث أكاديمي مرموق وخبير بيداغوجي متخصص في موضوع: "${config.subject}".
تقوم بشرح وتدريس المفاهيم المعقدة وفق أسلوب فاينمان البيداغوجي: تبسيط عميق، أمثلة وتطبيقات عملية واقعية، وصياغة لغوية أكاديمية رفيعة.

ضوابط وقواعد ملزمة:
1. لغة التحرير: اكتب حصرياً وبشكل كامل باللغة العربية الفصحى (ممنوع منعاً باتاً كتابة أي جملة أو عنوان باللغة الفرنسية أو الإنجليزية).
2. استخدم تنسيق Markdown القياسي (عناوين، قوائم، نصوص عريضة، جداول واضحة).
3. لا تضع الإجابة داخل كتلة كود عامة \`\`\`markdown. أرسل نصوص Markdown مباشرة.
${config.includeDiagrams ? '4. الرسوم والمخططات: قم بتضمين مخططات Mermaid توضيحية صالحة (كتلة ```mermaid ... ```) باللغة العربية عند نمذجة المفاهيم والعمليات.\n' : ''}
${config.includeMath ? '5. المعادلات: استخدم تدوين LaTeX الرياضي $...$ للصيغ الرياضية والعلمية.\n' : ''}
6. الجداول المقارنة والتوليفية: نظّم المقارنات والخصائص والمفاهيم في جداول Markdown محكمة (| العمود 1 | العمود 2 | ...).
      `.trim();
    }

    if (lang === 'en') {
      return `
You are a distinguished university professor, world-class educator, and pedagogical expert on the subject: "${config.subject}".
You explain complex concepts using the Feynman Technique: clear visual analogies, concrete real-world examples, and zero useless jargon.

Directives:
1. Always write strictly in ENGLISH. Do not use French or other languages.
2. Use standard GitHub Flavored Markdown (headings, lists, bold, blockquotes, tables).
3. Do NOT encapsulate the entire answer inside \`\`\`markdown code fences. Return raw markdown directly.
${config.includeDiagrams ? '4. Visual Diagrams: Include valid Mermaid diagrams (```mermaid ... ```) to model workflows, architectures, or timelines.\n' : ''}
${config.includeMath ? '5. Formulas: Use LaTeX math notation between $...$ (inline) or $$...$$ (display) for formulas.\n' : ''}
6. Structured Tables: Use comprehensive Markdown tables (| Col 1 | Col 2 | ...) for comparisons, timelines, and key summaries.
      `.trim();
    }

    return `
Tu es un éminent professeur d'université et expert pédagogique d'excellence sur le sujet : "${config.subject}".
Tu expliques les concepts complexes selon la Méthode Feynman : clarté absolue, analogies visuelles, exemples concrets et zéro jargon inutile.

Directives :
1. Rédige STRICTEMENT et ENTIÈREMENT en FRANÇAIS.
2. Utilise le Markdown standard GitHub Flavored (titres, listes, gras, citations, tableaux).
3. N'englobe pas ta réponse dans un bloc de code global \`\`\`markdown. Renvoie le texte Markdown directement.
${config.includeDiagrams ? '4. Schémas Visuels : Intègre au moins un diagramme Mermaid valide (```mermaid ... ```) pour modéliser les flux ou architectures.\n' : ''}
${config.includeMath ? '5. Formules : Utilise la notation mathématique LaTeX $...$ pour les formules scientifiques.\n' : ''}
6. Tableaux Structurés : Intègre systématiquement des tableaux Markdown (| Colonne 1 | Colonne 2 | ...) pour résumer les comparaisons, synthèses et données clés.
    `.trim();
  }

  /**
   * Prompt pour concevoir le titre officiel et le sommaire détaillé.
   */
  private static buildOutlinePrompt(config: CourseStudioConfig): string {
    const lang = config.language;
    if (lang === 'ar') {
      const levelStr = config.level === 'beginner' ? 'مبتدئ وتأسيسي' : config.level === 'advanced' ? 'متقدم وماجستير وأبحاث' : 'متوسط وجامعي';
      return `
صمم خطة وفهرس دورة جامعية شاملة ومحكمة ومفصلة حول موضوع:
"${config.subject}"

محددات الدورة:
- المستوى الأكاديمي: ${levelStr}
- عدد الفصول الكبرى المطلوب بدقة: ${config.chaptersCount} فصول
- لغة التحرير: العربية الفصحى حصراً

يجب أن تتضمن الوثيقة بالضرورة:
# [عنوان أكاديمي جامع وجذاب للدورة]
**المستوى:** ${levelStr} · **الحجم:** ${config.chaptersCount} فصول جامعية

## 📌 الفهرس العام ومخطط الدورة
(قائمة مرقمة ودقيقة من 1 إلى ${config.chaptersCount} لكل فصل مع 3 إلى 4 محاور فرعية)

## 🎯 الأهداف التعليمية والكفاءات المستهدفة
## 🔑 المتطلبات الأساسية والمفاهيم القبلية
      `.trim();
    }

    if (lang === 'en') {
      const levelStr = config.level === 'beginner' ? 'Beginner / Introductory' : config.level === 'advanced' ? 'Advanced / Master & Research' : 'Intermediate / Undergraduate';
      return `
Design a comprehensive, structured, and engaging university course curriculum on:
"${config.subject}"

Course Parameters:
- Academic Level: ${levelStr}
- Exact Number of Major Chapters: ${config.chaptersCount}
- Language: English strictly

The document must contain:
# [Master Academic Title of the Course]
**Level:** ${levelStr} · **Scope:** ${config.chaptersCount} University Chapters

## 📌 Course Syllabus & Outline
(Numbered list 1 to ${config.chaptersCount} of chapters with 3-4 subtopics each)

## 🎯 Learning Objectives & Target Competencies
## 🔑 Prerequisites & Core Concepts
      `.trim();
    }

    const levelStr = config.level === 'beginner' ? 'Débutant / Initiation' : config.level === 'advanced' ? 'Expert / Master & Recherche' : 'Intermédiaire / Universitaire';
    return `
Conçois un plan de cours universitaire complet, structuré et captivant sur le sujet :
"${config.subject}"

Paramètres du cours :
- Niveau académique : ${levelStr}
- Nombre exact de grands chapitres requis : ${config.chaptersCount}
- Langue : Français

Le document doit impérativement contenir :
# [Titre Magistral et Percutant du Cours]
**Niveau :** ${levelStr} · **Volume prévu :** ${config.chaptersCount} Chapitres universitaires

## 📌 Sommaire Général
(Liste ordonnée exacte I, II, III... des ${config.chaptersCount} grands chapitres avec leurs 3 à 4 sous-parties détaillées)

## 🎯 Objectifs d'Apprentissage & Compétences Visées
## 🔑 Prérequis & Notions Clés
    `.trim();
  }

  /**
   * Prompt pour rédiger un chapitre spécifique de manière exhaustive.
   */
  private static buildChapterPrompt(
    config: CourseStudioConfig,
    title: string,
    outline: string,
    chapterTitle: string,
    chapterIndex: number,
    totalChapters: number,
    targetWords: number,
  ): string {
    const lang = config.language;

    if (lang === 'ar') {
      return `
الدورة الأكاديمية: "${title}"
فهرس الدورة العام:
${outline}

---
المهمة المطلوبة الآن:
اكتب بالكامل محتوى الفصل ${chapterIndex} من أصل ${totalChapters} فصول باللغة العربية الفصحى حصراً:
## الفصل ${chapterIndex}: ${chapterTitle}

الشروط والضوابط الأكاديمية الملزمة:
1. اللغة: اكتب حصرياً باللغة العربية الفصحى، ويمنع منعاً باتاً إدراج أي كلمات أو عناوين باللغة الفرنسية أو الإنجليزية.
2. الحجم والعمق: طوّر هذا الفصل باستفاضة أكاديمية وافية (~${targetWords} كلمة)، واشرح كل مسألة بوضوح ودقة وفق أسلوب فاينمان.
3. الهيكلة البيداغوجية للفصل:
   - 🌟 مقدمة وأهمية هذا المفهوم.
   - 🔍 الأسس النظرية والتأصيل العلمي.
   - 🛠️ التطبيقات العملية والأمثلة الواقعية.
   - ⚠️ الأخطاء الشائعة وأفضل الممارسات.
${config.includeDiagrams ? `4. 📊 رسم بياني توضيحي Mermaid إلزامي:
   أدرج في هذا الفصل مخططاً هيكلياً بلغة Mermaid (كتلة \`\`\`mermaid flowchart TD ... \`\`\`) بالعربية لتوضيح بنية وعلاقات هذا المفهوم.\n` : ''}
${config.includeMath ? '5. المعادلات: استخدم تدوين LaTeX الرياضي $...$ للصيغ والمعادلات العلمية.\n' : ''}
6. 💻 أمثلة الكود والبرمجة (إذا كان الموضوع تقنياً): استخدم كتل كود مع تحديد اللغة (\`\`\`python, \`\`\`javascript, \`\`\`sql ...).\n
7. 📋 الجداول التوليفية: ضمّن جدولاً واحداً على الأقل بتنسيق Markdown (| ... | ... |) لتلخيص المقارنات والمفاهيم.\n
${config.includeChallenge ? '8. اختم بـ "🎯 تحدي تطبيقي عملي لمدة 24 ساعة" يطبقه المتعلم.\n' : ''}
9. التنسيق: اكتب مباشرة بتنسيق Markdown دون كتلة كود شاملة تحيط بالنص كاملاً.
      `.trim();
    }

    if (lang === 'en') {
      return `
Course: "${title}"
Full Course Syllabus:
${outline}

---
CURRENT TASK:
Write the complete content of CHAPTER ${chapterIndex} / ${totalChapters} in English:
## Chapter ${chapterIndex}: ${chapterTitle}

Strict Writing Requirements:
1. Language: Write STRICTLY in English. No other languages allowed.
2. Volume and Depth: Develop this chapter in comprehensive detail (~${targetWords} words). Explain each concept thoroughly using the Feynman Technique.
3. 4-part Pedagogical Structure:
   - 🌟 Introduction & Why this concept matters.
   - 🔍 Theoretical Foundations & In-depth Explanation.
   - 🛠️ Practical Methodology & Real-world Case Studies / Examples.
   - ⚠️ Common Pitfalls & Best Practices.
${config.includeDiagrams ? `4. 📊 MANDATORY MERMAID DIAGRAM:
   Include at least one valid Mermaid diagram (block \`\`\`mermaid flowchart TD ... \`\`\`) to visually model workflows or relationships in this chapter.\n` : ''}
${config.includeMath ? '5. Formulas: Use LaTeX math notation between $...$ (inline) or $$...$$ (display) for formulas.\n' : ''}
6. 💻 Code Examples (if technical): Use syntax-highlighted code blocks with language specification (\`\`\`python, \`\`\`typescript, \`\`\`sql ...).\n
7. 📋 Summary Table: Include at least one structured Markdown table (| ... | ... |) to summarize key comparisons or frameworks.\n
${config.includeChallenge ? '8. Conclude with a concrete "🎯 24-Hour Practical Challenge" for the student.\n' : ''}
9. Format: Return raw markdown directly without enclosing code blocks.
      `.trim();
    }

    return `
Cours : "${title}"
Sommaire global du cours :
${outline}

---
TA MISSION ACTUELLE :
Rédige l'intégralité du CHAPITRE ${chapterIndex} / ${totalChapters} en Français :
## Chapitre ${chapterIndex} : ${chapterTitle}

Exigences de rédaction impératives :
1. Volume attendu : Développe ce chapitre de façon approfondie (~${targetWords} mots). Ne résume pas : explique chaque notion en détail.
2. Structure pédagogique en 4 temps :
   - 🌟 Introduction & Pourquoi ce concept est fondamental.
   - 🔍 Fondements théoriques & Explication claire (Méthode Feynman).
   - 🛠️ Méthodologie pratique & Cas d'application concrets / Exemples réels.
   - ⚠️ Pièges classiques et meilleures pratiques.
${config.includeDiagrams ? `3. 📊 SCHÉMA VISUEL MERMAID OBLIGATOIRE :
   Ce chapitre DOIT OBLIGATOIREMENT contenir un diagramme Mermaid valide (bloc \`\`\`mermaid flowchart TD ... \`\`\`) pour illustrer visuellement la structure, le flux ou les relations entre les concepts de ce chapitre.\n` : ''}
${config.includeMath ? '4. Formules : Utilise la notation mathématique LaTeX $...$ pour les équations scientifiques.\n' : ''}
5. 💻 Exemples de Code (si technique) : Utilise des blocs de code syntaxiques avec indication du langage (\`\`\`python, \`\`\`typescript, \`\`\`sql ...).\n
6. 📋 Tableaux de Synthèse : Intègre au moins un tableau Markdown structuré (| ... | ... |) pour résumer les comparaisons ou caractéristiques clés.\n
${config.includeChallenge ? '7. Termine par un "🎯 Défi Pratique de 24 Heures" concret réalisable par l\'étudiant.\n' : ''}
8. Format : Rédige directement en Markdown sans bloc de code global englobant.
    `.trim();
  }

  /**
   * Prompt pour concevoir le Quiz QCM final.
   */
  private static buildQuizPrompt(config: CourseStudioConfig, title: string, outline: string): string {
    const lang = config.language;
    if (lang === 'ar') {
      return `
الدورة الأكاديمية: "${title}"
الفهرس:
${outline}

صمم القسم الختامي:
## ❓ اختبار التقييم الذاتي (QCM)

اكتب 5 أسئلة اختيار من متعدد باللغة العربية الفصحى لاختبار فهم واستيعاب الطالب.
لكل سؤال:
- اذكر نص السؤال بوضوح.
- اعرض 4 خيارات: أ)، ب)، ج)، د).
- حدد الإجابة الصحيحة مع شرح بيداغوجي مفصل لسبب صحتها.
      `.trim();
    }

    if (lang === 'en') {
      return `
Course: "${title}"
Syllabus:
${outline}

Create the final assessment:
## ❓ Self-Assessment Quiz (MCQ)

Write 5 multiple-choice questions to test the student's overall understanding.
For each question:
- State the question clearly.
- Provide 4 choices: A), B), C), D).
- State the correct answer with a detailed pedagogical explanation.
      `.trim();
    }

    return `
Cours : "${title}"
Sommaire :
${outline}

Conçois la section finale :
## ❓ Quiz d'Auto-Évaluation (QCM)

Rédige 5 questions à choix multiples variées pour tester la compréhension globale de l'étudiant.
Pour chaque question :
- Énonce clairement la question.
- Propose 4 choix : A), B), C), D).
- Donne la réponse correcte avec une explication pédagogique détaillée du pourquoi.
    `.trim();
  }

  /**
   * Extrait le titre principal (# Titre)
   */
  private static extractTitle(markdown: string): string {
    const match = markdown.match(/^#\s+(.+)$/m);
    if (match) {
      return match[1].replace(/\*\*/g, '').trim();
    }
    return '';
  }

  /**
   * Parse la liste ordonnée des titres de chapitres depuis le sommaire.
   */
  private static parseChapterTitles(outline: string, expectedCount: number, lang = 'fr'): string[] {
    const titles: string[] = [];
    const lines = outline.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      // Match patterns like: "I. Titre", "1. Titre", "Chapitre 1 : Titre", "الفصل 1 : Titre", "المحور 1 : Titre"
      const match = trimmed.match(
        /^(?:[IVXLCDM]+\.|\d+[\.\)\-:]|\b(?:Chapitre|Chapter|Module|الفصل|الباب|المحور|الوحدة)\s*(?:\d+|[IVXLCDM]+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)?\s*[:\.\-]|###\s*(?:Chapitre|Chapter|الفصل)?\s*\d*)\s*(.+)$/i,
      );
      if (match) {
        const clean = match[1].replace(/\*\*/g, '').replace(/\[|\]/g, '').trim();
        const lower = clean.toLowerCase();
        if (
          clean.length > 2 &&
          !lower.includes('sommaire') &&
          !lower.includes('syllabus') &&
          !lower.includes('objectifs') &&
          !lower.includes('الفهرس') &&
          !lower.includes('الأهداف')
        ) {
          titles.push(clean);
        }
      }
    }

    // Si le parsing automatique n'a pas capté assez de chapitres, compléter intelligemment selon la langue
    while (titles.length < expectedCount) {
      const idx = titles.length + 1;
      const defaultPrefix = lang === 'ar' ? `الفصل ${idx}` : lang === 'en' ? `Chapter ${idx}` : `Module ${idx}`;
      titles.push(defaultPrefix);
    }

    return titles.slice(0, expectedCount);
  }

  /**
   * Nettoie les balises markdown globales accidentelles ```markdown ... ``` sans altérer les blocs Mermaid internes.
   */
  private static cleanMarkdownFences(text: string): string {
    let clean = text.trim();
    if (/^```(?:markdown)?\s*[\r\n]/i.test(clean) && /[\r\n]```\s*$/i.test(clean)) {
      clean = clean.replace(/^```(?:markdown)?\s*[\r\n]/i, '').replace(/[\r\n]```\s*$/i, '');
    }
    return clean.trim();
  }
}
