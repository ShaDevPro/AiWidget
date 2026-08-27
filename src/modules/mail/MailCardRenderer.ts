/**
 * MailCardRenderer — Module de rendu interactif et premium pour les e-mails / courriers.
 * Inspiré par les solutions de ChatGPT Canvas, Claude Artifacts & Microsoft Copilot.
 */

import { t, isRTL } from '../../i18n';
import { escapeText } from '../../utils/dom';

export interface ParsedEmail {
  to?: string;
  from?: string;
  subject?: string;
  body: string;
}

export class MailCardRenderer {
  /**
   * Vérifie si un bloc de texte brut ou de code correspond à un e-mail / courrier.
   */
  static isEmailText(text: string): boolean {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 25) return false;

    const hasSubject = /^(?:Objet|Subject|الموضوع|Objet du mail)\s*[:：\-]\s*.+/im.test(trimmed);
    const hasTo = /^(?:À|A|To|Destinataire|Recipient|إلى|الى)\s*[:：\-]\s*.+/im.test(trimmed);
    const hasSalutation = /(?:Cher|Chère|Bonjour|Hello|Dear|عزيزي|عزيزتي|تحية طيبة|السلام عليكم)/i.test(trimmed);
    const hasSignOff = /(?:Cordialement|Bien à vous|Sincèrement|Best regards|Sincerely|Regards|مع خالص التحيات|وتقبلوا فائق الاحترام|دمتم بخير)/i.test(trimmed);

    // Un e-mail est caractérisé par un Objet ET (une salutation OU un destinataire OU une formule de politesse)
    if (hasSubject && (hasSalutation || hasTo || hasSignOff)) {
      return true;
    }

    if (hasTo && hasSalutation && hasSignOff) {
      return true;
    }

    return false;
  }

  /**
   * Extrait les métadonnées (To, From, Subject) et le corps du mail.
   */
  static parseEmail(text: string): ParsedEmail | null {
    if (!this.isEmailText(text)) return null;

    const lines = text.trim().split('\n');
    let to = '';
    let from = '';
    let subject = '';
    const bodyLines: string[] = [];
    let readingBody = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!readingBody) {
        // Détection Subject
        const subjectMatch = trimmedLine.match(/^(?:Objet|Subject|الموضوع|Objet du mail)\s*[:：\-]\s*(.+)$/i);
        if (subjectMatch) {
          subject = subjectMatch[1].trim();
          continue;
        }

        // Détection To
        const toMatch = trimmedLine.match(/^(?:À|A|To|Destinataire|Recipient|إلى|الى)\s*[:：\-]\s*(.+)$/i);
        if (toMatch) {
          to = toMatch[1].trim();
          continue;
        }

        // Détection From
        const fromMatch = trimmedLine.match(/^(?:De|From|Expéditeur|من)\s*[:：\-]\s*(.+)$/i);
        if (fromMatch) {
          from = fromMatch[1].trim();
          continue;
        }

        // Si la ligne est vide alors qu'on a déjà trouvé un Subject ou To, la suite est le corps
        if (trimmedLine === '' && (subject || to)) {
          readingBody = true;
          continue;
        }

        // Début du corps dès qu'on rencontre une salutation
        if (/(?:Cher|Chère|Bonjour|Hello|Dear|عزيزي|عزيزتي|تحية طيبة|السلام عليكم)/i.test(trimmedLine)) {
          readingBody = true;
          bodyLines.push(line);
          continue;
        }
      }

      bodyLines.push(line);
    }

    const body = bodyLines.join('\n').trim();
    if (!body && !subject) return null;

    return {
      to: to || undefined,
      from: from || undefined,
      subject: subject || undefined,
      body: body || text.trim(),
    };
  }

  /**
   * Rendu HTML de la carte d'e-mail interactive avec typographie premium & boutons d'action.
   */
  static renderMailCard(parsed: ParsedEmail): string {
    const rawTo = parsed.to || '';
    const rawSubject = parsed.subject || t('mail.defaultSubject', { defaultValue: 'Message' });
    const rawBody = parsed.body || '';

    const fullMailText = [
      rawSubject ? `${t('mail.subject')} ${rawSubject}` : '',
      rawTo ? `${t('mail.to')} ${rawTo}` : '',
      '',
      rawBody,
    ]
      .filter((s, idx) => idx !== 2 || (rawSubject || rawTo))
      .join('\n')
      .trim();

    const encodedCopy = encodeURIComponent(fullMailText);
    const encodedTo = encodeURIComponent(rawTo);
    const encodedSubject = encodeURIComponent(rawSubject);
    const encodedBody = encodeURIComponent(rawBody);

    // Formater le corps avec des paragraphes propres (pas de police monospace)
    const formattedBody = escapeText(rawBody)
      .replace(/\n\n+/g, '</p><p class="mail-paragraph">')
      .replace(/\n/g, '<br>');

    const rtlClass = isRTL() ? 'rtl' : '';

    return `
      <div class="mail-card ${rtlClass}">
        <div class="mail-card-header">
          <div class="mail-card-badge">
            <span class="mail-badge-icon">✉️</span>
            <span class="mail-badge-text">${t('mail.cardTitle')}</span>
          </div>
          <div class="mail-card-actions">
            <button class="mail-action-btn" data-copy-mail="${encodedCopy}" title="${t('mail.copyMail')}">
              <span class="mail-btn-icon">📋</span>
              <span class="mail-btn-label">${t('mail.copyMail')}</span>
            </button>
            <button class="mail-action-btn primary" data-open-mail="${encodedTo}" data-mail-subject="${encodedSubject}" data-mail-body="${encodedBody}" title="${t('mail.openMail')}">
              <span class="mail-btn-icon">↗</span>
              <span class="mail-btn-label">${t('mail.openMail')}</span>
            </button>
          </div>
        </div>

        ${rawTo || rawSubject ? `
          <div class="mail-card-meta">
            ${rawTo ? `
              <div class="mail-meta-row">
                <span class="mail-meta-key">${t('mail.to')}</span>
                <span class="mail-meta-val mail-recipient-tag">${escapeText(rawTo)}</span>
              </div>
            ` : ''}
            ${rawSubject ? `
              <div class="mail-meta-row">
                <span class="mail-meta-key">${t('mail.subject')}</span>
                <span class="mail-meta-val mail-subject-text">${escapeText(rawSubject)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="mail-card-divider"></div>

        <div class="mail-card-body">
          <p class="mail-paragraph">${formattedBody}</p>
        </div>
      </div>
    `;
  }
}
