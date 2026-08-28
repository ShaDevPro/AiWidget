/**
 * CourseCardRenderer — Carte de notification et d'export direct (PDF, DOCX, Markdown).
 * Ne pollue pas le chat avec le texte brut de 40 pages : affiche uniquement la carte exécutive de téléchargement.
 */

import { jsPDF } from 'jspdf';
import { t, isRTL } from '../../i18n';
import { escapeText } from '../../utils/dom';
import type { CourseProgressEvent, CourseGenerationResult } from './CourseStudioEngine';
import { renderMermaidDiagramsAsync } from '../markdown/renderMermaidDiagrams';

export class CourseCardRenderer {
  /**
   * Vérifie si un message est une carte Course Studio.
   */
  static isCourseContent(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.includes('class="course-finished-card"') || trimmed.includes('class="course-live-card"');
  }

  /**
   * Rendu de la carte de progression en direct pendant la génération du cours.
   */
  static renderLiveProgressCard(event: CourseProgressEvent, subject: string): string {
    const rtlClass = isRTL() ? 'rtl' : '';
    const percent = Math.min(100, Math.max(5, event.percent));

    return `<div class="course-live-card ${rtlClass}">
      <div class="course-live-header">
        <div class="course-live-badge">
          <span>🎓</span>
          <span class="course-live-badge-text">${t('courseStudio.liveBadge', { defaultValue: 'GÉNÉRATION DU COURS EN COURS' })}</span>
        </div>
        <span class="course-live-percent">${percent}%</span>
      </div>

      <div class="course-live-topic">🎓 <strong>${escapeText(subject)}</strong></div>

      <div class="course-progress-track">
        <div class="course-progress-fill" style="width: ${percent}%;"></div>
      </div>

      <div class="course-live-status">
        <span class="course-spinner">⏳</span>
        <span class="course-live-step">${escapeText(event.statusText)}</span>
      </div>

      <div class="course-live-notice">
        <span class="course-live-notice-icon">ℹ️</span>
        <span class="course-live-notice-text">${t('courseStudio.timeNotice', { defaultValue: "La génération complète du cours peut prendre jusqu'à 1 heure selon la consistance, la complexité du thème et le volume de chapitres demandé." })}</span>
      </div>
    </div>`.trim();
  }

  /**
   * Rendu de la carte finale de téléchargement (Exécutive & Propre sans déverser 40 pages dans le chat).
   */
  static renderFinalDeliveryCard(result: CourseGenerationResult): string {
    const rtlClass = isRTL() ? 'rtl' : '';
    const encodedTitle = encodeURIComponent(result.title);
    const encodedContent = encodeURIComponent(result.fullMarkdown);

    return `<div class="course-finished-card ${rtlClass}">
      <div class="course-finished-header">
        <div class="course-finished-badge">
          <span class="course-badge-icon">🎓</span>
          <span class="course-badge-text">${t('courseStudio.readyBadge', { defaultValue: 'COURS UNIVERSITAIRE CERTIFIANT' })}</span>
        </div>
          <div class="course-finished-title">${escapeText(result.title)}</div>
          <p class="course-finished-desc">
            ${t('courseStudio.readyMessage', { defaultValue: 'Votre cours est prêt à être téléchargé' })}
          </p>
        </div>

        <!-- Métadonnées / Statistiques du cours -->
        <div class="course-stats-grid">
          <div class="course-stat-pill">
            <span class="stat-icon">📚</span>
            <span class="stat-val">${result.chaptersCount} ${t('courseStudio.chapters', { defaultValue: 'Chapitres' })}</span>
          </div>
          <div class="course-stat-pill">
            <span class="stat-icon">📝</span>
            <span class="stat-val">~${result.wordsCount.toLocaleString()} ${t('courseStudio.words', { defaultValue: 'mots' })}</span>
          </div>
          <div class="course-stat-pill">
            <span class="stat-icon">📄</span>
            <span class="stat-val">~${result.pagesCount} ${t('courseStudio.pages', { defaultValue: 'pages' })}</span>
          </div>
          ${result.hasQuiz ? `
            <div class="course-stat-pill quiz">
              <span class="stat-icon">❓</span>
              <span class="stat-val">${t('courseStudio.quizIncluded', { defaultValue: 'Quiz QCM inclus' })}</span>
            </div>
          ` : ''}
        </div>

        <!-- Boutons d'export et téléchargement -->
        <div class="course-action-buttons">
          <button class="course-dl-btn docx" data-export-course-docx="${encodedTitle}" data-course-content="${encodedContent}" title="${t('courseStudio.exportDocx')}">
            <span class="btn-icon">📘</span>
            <span>${t('courseStudio.exportDocx', { defaultValue: 'Télécharger en DOCX (Word)' })}</span>
          </button>

          <button class="course-dl-btn md" data-export-course-md="${encodedTitle}" data-course-content="${encodedContent}" title="${t('courseStudio.exportMd')}">
            <span class="btn-icon">📄</span>
            <span>${t('courseStudio.exportMd', { defaultValue: 'Markdown' })}</span>
          </button>

          <button class="course-dl-btn copy" data-copy-course="${encodedContent}" title="${t('courseStudio.copyCourse')}">
            <span class="btn-icon">📋</span>
            <span class="copy-label">${t('courseStudio.copyCourse', { defaultValue: 'Copier le cours' })}</span>
          </button>
        </div>
      </div>`.trim();
  }

  /**
   * Téléchargement natif d'un fichier PDF avec mise en page de cours universitaire riche (Support FR, EN, AR RTL).
   */
  static async downloadPdf(title: string, markdown: string, renderMarkdownFn: (md: string) => string): Promise<boolean> {
    const isArabic = /[\u0600-\u06FF]/.test(title + ' ' + markdown.slice(0, 500));
    const htmlContent = renderMarkdownFn(markdown);
    const safeTitle = title.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_') || 'cours';

    const container = document.createElement('div');
    container.id = 'pdf-render-root';
    container.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
    container.style.position = 'absolute';
    container.style.left = '0px';
    container.style.top = '0px';
    container.style.zIndex = '-99999';
    container.style.opacity = '1';
    container.style.pointerEvents = 'none';
    container.style.width = '794px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#1e293b';
    container.style.fontFamily = isArabic
      ? "'Segoe UI', 'Cairo', 'Tahoma', Arial, sans-serif"
      : "Calibri, 'Segoe UI', Arial, sans-serif";
    container.style.fontSize = '12px';
    container.style.lineHeight = '1.7';
    container.style.padding = '40px 48px';
    container.style.boxSizing = 'border-box';
    container.style.textAlign = isArabic ? 'right' : 'left';

    container.innerHTML = `
      <style>
        #pdf-render-root { direction: ${isArabic ? 'rtl' : 'ltr'}; text-align: ${isArabic ? 'right' : 'left'}; font-family: ${isArabic ? "'Segoe UI', 'Cairo', 'Tahoma', Arial, sans-serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"}; font-size: 13px; line-height: 1.65; color: #1e293b; }
        #pdf-render-root h1 { font-size: 22px; color: #1e1b4b; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-top: 14px; margin-bottom: 18px; font-weight: 700; text-align: ${isArabic ? 'right' : 'left'}; page-break-after: avoid; break-after: avoid; }
        #pdf-render-root h2 { font-size: 16px; color: #312e81; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; font-weight: 700; text-align: ${isArabic ? 'right' : 'left'}; page-break-after: avoid; break-after: avoid; }
        #pdf-render-root h3 { font-size: 13.5px; color: #4338ca; margin-top: 16px; margin-bottom: 8px; font-weight: 600; text-align: ${isArabic ? 'right' : 'left'}; page-break-after: avoid; break-after: avoid; }
        #pdf-render-root p { margin: 8px 0; text-align: ${isArabic ? 'right' : 'justify'}; line-height: 1.65; }
        #pdf-render-root ul, #pdf-render-root ol { margin: 8px 0; padding-${isArabic ? 'right' : 'left'}: 20px; }
        #pdf-render-root li { margin-bottom: 4px; line-height: 1.6; }
        
        /* ── Tables & Grid ── */
        .md-table-toolbar { display: none !important; }
        .md-table-card { border: none !important; margin: 16px 0 !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; page-break-inside: avoid; break-inside: avoid; }
        .md-table-scroll { overflow: visible !important; }
        #pdf-render-root table, #pdf-render-root .md-table { border-collapse: collapse !important; width: 100% !important; margin: 16px 0 !important; font-size: 10.5px !important; direction: ${isArabic ? 'rtl' : 'ltr'} !important; border: 1.5px solid #cbd5e1 !important; page-break-inside: avoid; break-inside: avoid; }
        #pdf-render-root th, #pdf-render-root td, #pdf-render-root .md-table th, #pdf-render-root .md-table td { border: 1px solid #cbd5e1 !important; padding: 8px 12px !important; text-align: ${isArabic ? 'right' : 'left'} !important; vertical-align: top !important; line-height: 1.5 !important; }
        #pdf-render-root th, #pdf-render-root .md-table th { background-color: #f1f5f9 !important; font-weight: bold !important; color: #0f172a !important; border-bottom: 2px solid #94a3b8 !important; }
        #pdf-render-root tr:nth-child(even), #pdf-render-root .md-table tr:nth-child(even) { background-color: #f8fafc !important; }
        #pdf-render-root tr { page-break-inside: avoid; break-inside: avoid; }
        
        /* ── Quotes & Callouts ── */
        #pdf-render-root blockquote { border-${isArabic ? 'right' : 'left'}: 3.5px solid #6366f1; background: #f8faff; padding: 8px 14px; margin: 14px 0; color: #475569; font-style: italic; border-radius: ${isArabic ? '4px 0 0 4px' : '0 4px 4px 0'}; page-break-inside: avoid; break-inside: avoid; }
        
        /* ── Code & Syntax Highlighting ── */
        .chat-code-copy-btn { display: none !important; }
        .chat-code-block { margin: 14px 0 !important; border-radius: 6px !important; overflow: hidden !important; border: 1px solid #334155 !important; direction: ltr !important; text-align: left !important; page-break-inside: avoid; break-inside: avoid; }
        .chat-code-header { background: #1e293b !important; color: #94a3b8 !important; font-size: 9.5px !important; font-family: Consolas, monospace !important; padding: 4px 10px !important; font-weight: bold !important; text-transform: uppercase !important; border-bottom: 1px solid #334155 !important; }
        #pdf-render-root pre, .chat-code-pre { background: #0f172a !important; color: #f8fafc !important; border-radius: 0 0 6px 6px !important; padding: 12px !important; font-family: Consolas, monospace !important; font-size: 10px !important; overflow-x: auto !important; margin: 0 !important; direction: ltr !important; text-align: left !important; }
        #pdf-render-root code { font-family: Consolas, monospace !important; background-color: #f1f5f9; padding: 2px 5px; font-size: 10px; border-radius: 3px; }
        #pdf-render-root pre code, .chat-code-pre code { background: transparent !important; color: inherit !important; padding: 0 !important; font-family: Consolas, monospace !important; }
        .hljs-keyword { color: #ff7b72 !important; font-weight: bold !important; }
        .hljs-string { color: #a5d6ff !important; }
        .hljs-number { color: #79c0ff !important; }
        .hljs-title, .hljs-function { color: #d2a8ff !important; }
        .hljs-comment { color: #8b949e !important; font-style: italic !important; }
        .hljs-built_in { color: #ffa657 !important; }
        
        /* ── Math (KaTeX) ── */
        .katex { font-size: 1.1em !important; direction: ltr !important; display: inline-block !important; }
        .katex-display { display: block !important; margin: 12px 0 !important; text-align: center !important; direction: ltr !important; page-break-inside: avoid; break-inside: avoid; }
        .katex-html { direction: ltr !important; }
        
        /* ── Mermaid Visual Diagrams ── */
        .mermaid-toolbar { display: none !important; }
        .mermaid-card { border: 1px solid #cbd5e1 !important; border-radius: 8px !important; margin: 16px 0 !important; background: #ffffff !important; overflow: visible !important; box-shadow: none !important; page-break-inside: avoid; break-inside: avoid; }
        .mermaid-scroll { padding: 12px !important; overflow: visible !important; display: flex !important; justify-content: center !important; }
        .mermaid-diagram { width: 100% !important; text-align: center !important; }
        .mermaid-diagram svg { max-width: 100% !important; height: auto !important; margin: 0 auto !important; }
        
        #pdf-render-root hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
      </style>
      <div class="pdf-inner-content">
        ${htmlContent}
      </div>
    `;

    document.body.appendChild(container);

    try {
      await renderMermaidDiagramsAsync(container, true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      await doc.html(container, {
        callback: async (pdf) => {
          const pdfBytes = pdf.output('arraybuffer');
          if ('__TAURI__' in window) {
            const { save } = await import('@tauri-apps/api/dialog');
            const { writeBinaryFile } = await import('@tauri-apps/api/fs');
            const path = await save({
              defaultPath: `${safeTitle}.pdf`,
              filters: [{ name: 'PDF', extensions: ['pdf'] }],
            });
            if (path) {
              await writeBinaryFile(path, new Uint8Array(pdfBytes));
            }
          } else {
            pdf.save(`${safeTitle}.pdf`);
          }
        },
        x: 15,
        y: 15,
        width: 565,
        windowWidth: 794,
        margin: [25, 15, 25, 15],
        autoPaging: 'slice',
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: 794,
        },
      });
      return true;
    } catch (err) {
      console.error('Error generating PDF via jsPDF html:', err);
      return false;
    } finally {
      setTimeout(() => {
        if (container.parentElement) {
          container.parentElement.removeChild(container);
        }
      }, 1000);
    }
  }

  /**
   * Téléchargement natif d'un fichier DOCX (format HTML/Word compatible avec support RTL/Arabe).
   */
  static async downloadDocx(title: string, markdown: string, renderMarkdownFn: (md: string) => string): Promise<void> {
    const isArabic = /[\u0600-\u06FF]/.test(title + ' ' + markdown.slice(0, 500));
    
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-99999px';
    tempContainer.innerHTML = renderMarkdownFn(markdown);
    document.body.appendChild(tempContainer);

    try {
      await renderMermaidDiagramsAsync(tempContainer, true);
      tempContainer.querySelectorAll('.mermaid-toolbar, .chat-code-header, .md-table-toolbar').forEach((el) => el.remove());
      const htmlContent = tempContainer.innerHTML;
      
      const wordDocument = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40' dir='${isArabic ? 'rtl' : 'ltr'}'>
        <head>
          <meta charset='utf-8'>
          <title>${escapeText(title)}</title>
          <style>
            body { font-family: ${isArabic ? "'Segoe UI', 'Cairo', 'Traditional Arabic', Arial, sans-serif" : "Calibri, 'Segoe UI', Arial, sans-serif"}; font-size: 11pt; line-height: 1.6; color: #1e293b; margin: 40px; text-align: ${isArabic ? 'right' : 'left'}; direction: ${isArabic ? 'rtl' : 'ltr'}; }
            h1 { font-size: 22pt; color: #1e1b4b; border-bottom: 2pt solid #4f46e5; padding-bottom: 6pt; margin-bottom: 16pt; text-align: ${isArabic ? 'right' : 'left'}; }
            h2 { font-size: 16pt; color: #312e81; margin-top: 24pt; border-bottom: 1pt solid #cbd5e1; padding-bottom: 4pt; text-align: ${isArabic ? 'right' : 'left'}; }
            h3 { font-size: 13pt; color: #4338ca; margin-top: 14pt; text-align: ${isArabic ? 'right' : 'left'}; }
            p { margin: 8pt 0; text-align: ${isArabic ? 'right' : 'justify'}; }
            ul, ol { margin: 8pt 0; padding-${isArabic ? 'right' : 'left'}: 20pt; }
            li { margin-bottom: 4pt; }
            
            /* ── Tables ── */
            .md-table-toolbar { display: none !important; }
            .md-table-card { border: none !important; margin: 16pt 0 !important; background: transparent !important; }
            .md-table-scroll { overflow: visible !important; }
            table, .md-table { border-collapse: collapse !important; width: 100% !important; margin: 14pt 0 !important; direction: ${isArabic ? 'rtl' : 'ltr'} !important; border: 1.5pt solid #cbd5e1 !important; }
            th, td, .md-table th, .md-table td { border: 1pt solid #cbd5e1 !important; padding: 8pt 12pt !important; text-align: ${isArabic ? 'right' : 'left'} !important; font-size: 10pt !important; vertical-align: top !important; }
            th, .md-table th { background-color: #f1f5f9 !important; font-weight: bold !important; color: #0f172a !important; }
            tr:nth-child(even), .md-table tr:nth-child(even) { background-color: #f8fafc !important; }
            
            /* ── Quotes & Callouts ── */
            blockquote { border-${isArabic ? 'right' : 'left'}: 4pt solid #6366f1; padding-${isArabic ? 'right' : 'left'}: 12pt; margin: 12pt 0; color: #475569; font-style: italic; }
            
            /* ── Code Blocks ── */
            .chat-code-copy-btn { display: none !important; }
            .chat-code-block { margin: 14pt 0 !important; border: 1pt solid #cbd5e1 !important; border-radius: 4pt !important; direction: ltr !important; text-align: left !important; }
            .chat-code-header { display: none !important; }
            code { font-family: Consolas, monospace; background-color: #f8fafc; padding: 2pt 4pt; font-size: 10pt; }
            pre, .chat-code-pre { background-color: #0f172a !important; color: #f8fafc !important; border: 1pt solid #cbd5e1; padding: 10pt; font-family: Consolas, monospace; direction: ltr !important; text-align: left !important; }
            .chat-code-pre code { background-color: transparent !important; color: #f8fafc !important; padding: 0 !important; }
            
            /* ── Math KaTeX ── */
            .katex { font-size: 1.1em !important; direction: ltr !important; display: inline-block !important; }
            .katex-display { display: block !important; margin: 12pt 0 !important; text-align: center !important; direction: ltr !important; }

            /* ── Mermaid Visual Diagrams in Word ── */
            .mermaid-toolbar { display: none !important; }
            .mermaid-card { border: 1pt solid #cbd5e1 !important; margin: 16pt 0 !important; padding: 12pt !important; text-align: center !important; }
            .mermaid-scroll { overflow: visible !important; }
            .mermaid-diagram svg { max-width: 100% !important; height: auto !important; margin: 0 auto !important; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', wordDocument], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = title.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
      a.href = url;
      a.download = `${safeTitle || 'cours'}.doc`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    } finally {
      if (tempContainer.parentElement) {
        tempContainer.parentElement.removeChild(tempContainer);
      }
    }
  }

  /**
   * Téléchargement natif en Markdown.
   */
  static downloadMarkdown(title: string, markdown: string): void {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeTitle = title.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
    a.href = url;
    a.download = `${safeTitle || 'cours'}.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }
}
