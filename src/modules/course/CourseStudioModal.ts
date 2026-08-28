/**
 * CourseStudioModal — Fenêtre modale de cadrage et configuration pédagogique du cours.
 * Permet à l'utilisateur de choisir : Sujet, Langue, Niveau, Nb de chapitres, Mots/chapitre, Options.
 */

import { t, currentLanguage, isRTL } from '../../i18n';
import { escapeText } from '../../utils/dom';

export interface CourseStudioConfig {
  subject: string;
  language: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  chaptersCount: number;
  wordsPerChapter: number;
  includeDiagrams: boolean;
  includeMath: boolean;
  includeQuiz: boolean;
  includeChallenge: boolean;
}

export class CourseStudioModal {
  private overlay: HTMLElement | null = null;
  private onGenerateCallback: ((config: CourseStudioConfig) => void) | null = null;

  show(initialSubject: string = '', onGenerate: (config: CourseStudioConfig) => void): void {
    this.onGenerateCallback = onGenerate;
    this.close();

    const lang = currentLanguage();
    const rtl = isRTL(lang) ? 'rtl' : '';

    this.overlay = document.createElement('div');
    this.overlay.className = `course-modal-overlay ${rtl}`;
    this.overlay.id = 'courseStudioModalOverlay';

    this.overlay.innerHTML = `
      <div class="course-modal-container" role="dialog" aria-modal="true">
        <!-- Header -->
        <div class="course-modal-header">
          <div class="course-modal-header-icon">🎓</div>
          <div class="course-modal-header-text">
            <h2 class="course-modal-title">${t('courseStudio.modalTitle', { defaultValue: 'Studio de Cours Universitaire & Pro' })}</h2>
            <p class="course-modal-subtitle">${t('courseStudio.modalSubtitle', { defaultValue: 'Générez un cours complet, structuré et certifiant avec la méthode Feynman' })}</p>
          </div>
          <button class="course-modal-close" id="courseModalCloseBtn" title="${t('common.close', { defaultValue: 'Fermer' })}">&times;</button>
        </div>

        <!-- Body Form -->
        <div class="course-modal-body">
          <!-- Sujet -->
          <div class="course-form-group">
            <label class="course-form-label" for="courseSubjectInput">
              <span>📌 ${t('courseStudio.formSubject', { defaultValue: 'Thème ou Sujet du Cours' })}</span>
              <span class="course-required">*</span>
            </label>
            <textarea
              id="courseSubjectInput"
              class="course-form-textarea"
              rows="2"
              placeholder="${t('courseStudio.subjectPlaceholder', { defaultValue: 'Ex: Traité d\'Architecture Antique : Des Ordres Classiques aux Monuments Impériaux...' })}"
            >${escapeText(initialSubject)}</textarea>
          </div>

          <!-- Grille 2 colonnes : Langue & Niveau -->
          <div class="course-form-row">
            <div class="course-form-group flex-1">
              <label class="course-form-label" for="courseLangSelect">🌐 ${t('courseStudio.formLang', { defaultValue: 'Langue de Rédaction' })}</label>
              <select id="courseLangSelect" class="course-form-select">
                <option value="fr" ${lang === 'fr' ? 'selected' : ''}>Français 🇫🇷</option>
                <option value="en" ${lang === 'en' ? 'selected' : ''}>English 🇬🇧</option>
                <option value="ar" ${lang === 'ar' ? 'selected' : ''}>العربية 🌐</option>
              </select>
            </div>

            <div class="course-form-group flex-1">
              <label class="course-form-label" for="courseLevelSelect">🎯 ${t('courseStudio.formLevel', { defaultValue: 'Niveau Académique' })}</label>
              <select id="courseLevelSelect" class="course-form-select">
                <option value="beginner">${t('courseStudio.levelBeginner', { defaultValue: 'Initiation & Débutant (Accessible sans prérequis)' })}</option>
                <option value="intermediate" selected>${t('courseStudio.levelIntermediate', { defaultValue: 'Intermédiaire & Universitaire (Équilibré et rigoureux)' })}</option>
                <option value="advanced">${t('courseStudio.levelAdvanced', { defaultValue: 'Expert / Master & Recherche (Approfondi et exhaustif)' })}</option>
              </select>
            </div>
          </div>

          <!-- Grille 2 colonnes : Nombre de chapitres & Profondeur -->
          <div class="course-form-row">
            <div class="course-form-group flex-1">
              <label class="course-form-label" for="courseChaptersSelect">📚 ${t('courseStudio.formChapters', { defaultValue: 'Nombre de Chapitres' })}</label>
              <select id="courseChaptersSelect" class="course-form-select">
                <option value="3">3 ${t('courseStudio.chapters', { defaultValue: 'Chapitres' })} (~10-15 pages)</option>
                <option value="5" selected>5 ${t('courseStudio.chapters', { defaultValue: 'Chapitres' })} (~20-30 pages)</option>
                <option value="8">8 ${t('courseStudio.chapters', { defaultValue: 'Chapitres' })} (~35-50 pages)</option>
                <option value="10">10 ${t('courseStudio.chapters', { defaultValue: 'Chapitres' })} (~45-60 pages)</option>
              </select>
            </div>

            <div class="course-form-group flex-1">
              <label class="course-form-label" for="courseWordsSelect">📏 ${t('courseStudio.formDepth', { defaultValue: 'Volume par Chapitre' })}</label>
              <select id="courseWordsSelect" class="course-form-select">
                <option value="600">${t('courseStudio.wordsStandard', { defaultValue: 'Standard (~600 mots / module)' })}</option>
                <option value="1200" selected>${t('courseStudio.wordsDeep', { defaultValue: 'Approfondi (~1 200 mots / module)' })}</option>
                <option value="2000">${t('courseStudio.wordsMaster', { defaultValue: 'Magistral (~2 000 mots / module)' })}</option>
              </select>
            </div>
          </div>

          <!-- Options Didactiques & Compléments -->
          <div class="course-form-group">
            <label class="course-form-label">✨ ${t('courseStudio.formOptions', { defaultValue: 'Options Didactiques Pédagogiques' })}</label>
            <div class="course-checkboxes-grid">
              <label class="course-checkbox-item">
                <input type="checkbox" id="chkDiagrams" checked />
                <span>📊 ${t('courseStudio.optDiagrams', { defaultValue: 'Diagrammes visuels Mermaid' })}</span>
              </label>

              <label class="course-checkbox-item">
                <input type="checkbox" id="chkMath" checked />
                <span>📐 ${t('courseStudio.optMath', { defaultValue: 'Formules scientifiques LaTeX (KaTeX)' })}</span>
              </label>

              <label class="course-checkbox-item">
                <input type="checkbox" id="chkQuiz" checked />
                <span>❓ ${t('courseStudio.optQuiz', { defaultValue: 'Quiz QCM d\'auto-évaluation final' })}</span>
              </label>

              <label class="course-checkbox-item">
                <input type="checkbox" id="chkChallenge" checked />
                <span>🎯 ${t('courseStudio.optChallenge', { defaultValue: 'Défis pratiques de 24h par module' })}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="course-modal-footer">
          <button class="course-btn-cancel" id="courseModalCancelBtn">${t('common.cancel', { defaultValue: 'Annuler' })}</button>
          <button class="course-btn-submit" id="courseModalSubmitBtn">
            <span>🚀 ${t('courseStudio.btnLaunch', { defaultValue: 'Générer le Cours Complet' })}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Event listeners
    this.overlay.querySelector('#courseModalCloseBtn')?.addEventListener('click', () => this.close());
    this.overlay.querySelector('#courseModalCancelBtn')?.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    const submitBtn = this.overlay.querySelector('#courseModalSubmitBtn');
    submitBtn?.addEventListener('click', () => this.handleSubmit());

    const textarea = this.overlay.querySelector('#courseSubjectInput') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.handleSubmit();
        }
      });
    }
  }

  private handleSubmit(): void {
    if (!this.overlay) return;

    const subjectInput = this.overlay.querySelector('#courseSubjectInput') as HTMLTextAreaElement;
    const langSelect = this.overlay.querySelector('#courseLangSelect') as HTMLSelectElement;
    const levelSelect = this.overlay.querySelector('#courseLevelSelect') as HTMLSelectElement;
    const chaptersSelect = this.overlay.querySelector('#courseChaptersSelect') as HTMLSelectElement;
    const wordsSelect = this.overlay.querySelector('#courseWordsSelect') as HTMLSelectElement;

    const chkDiagrams = this.overlay.querySelector('#chkDiagrams') as HTMLInputElement;
    const chkMath = this.overlay.querySelector('#chkMath') as HTMLInputElement;
    const chkQuiz = this.overlay.querySelector('#chkQuiz') as HTMLInputElement;
    const chkChallenge = this.overlay.querySelector('#chkChallenge') as HTMLInputElement;

    const subject = subjectInput?.value.trim() || '';
    if (!subject) {
      subjectInput?.focus();
      subjectInput?.classList.add('shake-error');
      setTimeout(() => subjectInput?.classList.remove('shake-error'), 500);
      return;
    }

    const config: CourseStudioConfig = {
      subject,
      language: langSelect?.value || 'fr',
      level: (levelSelect?.value as any) || 'intermediate',
      chaptersCount: parseInt(chaptersSelect?.value || '5', 10),
      wordsPerChapter: parseInt(wordsSelect?.value || '1200', 10),
      includeDiagrams: chkDiagrams?.checked ?? true,
      includeMath: chkMath?.checked ?? true,
      includeQuiz: chkQuiz?.checked ?? true,
      includeChallenge: chkChallenge?.checked ?? true,
    };

    this.close();
    if (this.onGenerateCallback) {
      this.onGenerateCallback(config);
    }
  }

  close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

export const courseStudioModal = new CourseStudioModal();
