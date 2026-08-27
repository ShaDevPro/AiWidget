/**
 * DocumentManager — Enterprise Document & Local OCR / Vision Suite.
 */
import { ragApi } from '../../api/rag';
import { t } from '../../i18n';
import { AttachedDocument, DocumentType } from '../../types';
import { isVisionModel, stripDataUrlBase64 } from '../../utils/visionModels';

export interface AttachOptions {
  /** Skip OCR when a vision model will read the image directly. */
  visionMode?: boolean;
}

/** Max characters from an attached document injected into the LLM prompt (~2k tokens). */
const MAX_ATTACHMENT_CHARS = 8_000;

export class DocumentManager {
  private attachedDoc: AttachedDocument | null = null;
  private onDocChangedCallback: ((doc: AttachedDocument | null) => void) | null = null;

  constructor(onDocChanged?: (doc: AttachedDocument | null) => void) {
    if (onDocChanged) {
      this.onDocChangedCallback = onDocChanged;
    }
  }

  public getAttachedDocument(): AttachedDocument | null {
    return this.attachedDoc;
  }

  public clearAttachedDocument(): void {
    this.attachedDoc = null;
    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onDocChangedCallback) {
      this.onDocChangedCallback(this.attachedDoc);
    }
  }

  public detectDocumentType(fileName: string): DocumentType {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['docx', 'doc'].includes(ext)) return 'docx';
    if (['xlsx', 'xls'].includes(ext)) return 'xlsx';
    if (ext === 'csv') return 'csv';
    if (['ts', 'js', 'py', 'rs', 'java', 'c', 'cpp', 'go', 'php', 'html', 'css', 'sql', 'json', 'xml', 'yaml', 'yml'].includes(ext)) return 'code';
    return 'text';
  }

  public async resolveImageBase64(doc: AttachedDocument): Promise<string | null> {
    if (doc.type !== 'image') return null;
    if (doc.base64Preview) return stripDataUrlBase64(doc.base64Preview);
    if (doc.path) {
      try {
        return await ragApi.readImageBase64(doc.path);
      } catch {
        return null;
      }
    }
    return null;
  }

  public async handlePaste(event: ClipboardEvent, options?: AttachOptions): Promise<boolean> {
    const items = event.clipboardData?.items;
    if (!items) return false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          await this.attachBlobImage(file, `Capture_${new Date().toLocaleTimeString().replace(/:/g, '-')}.png`, options);
          return true;
        }
      }
    }
    return false;
  }

  public async attachBlobImage(blob: Blob, name: string, options?: AttachOptions): Promise<void> {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const base64Data = await base64Promise;
    const docId = `doc_${Date.now()}`;
    const visionMode = options?.visionMode === true;

    this.attachedDoc = {
      id: docId,
      name,
      size: blob.size,
      type: 'image',
      base64Preview: base64Data,
      status: visionMode ? 'ready' : 'loading',
      isOcr: !visionMode,
      isVision: visionMode,
    };
    this.notifyChange();

    if (visionMode) return;

    try {
      const extractedText = await ragApi.ocrExtractImage(base64Data);
      if (this.attachedDoc && this.attachedDoc.id === docId) {
        this.attachedDoc.extractedText = extractedText;
        this.attachedDoc.status = 'ready';
        this.notifyChange();
      }
    } catch (err) {
      if (this.attachedDoc && this.attachedDoc.id === docId) {
        this.attachedDoc.status = 'error';
        this.attachedDoc.errorMessage = String(err);
        this.notifyChange();
      }
    }
  }

  public async attachFilePath(filePath: string, fileName: string, fileSize = 0, options?: AttachOptions): Promise<void> {
    const docType = this.detectDocumentType(fileName);
    const docId = `doc_${Date.now()}`;
    const visionMode = options?.visionMode === true && docType === 'image';

    this.attachedDoc = {
      id: docId,
      name: fileName,
      size: fileSize,
      type: docType,
      path: filePath,
      status: visionMode ? 'ready' : 'loading',
      isOcr: docType === 'image' && !visionMode,
      isVision: visionMode,
    };
    this.notifyChange();

    if (visionMode) return;

    try {
      let text = '';
      if (docType === 'image') {
        text = await ragApi.ocrExtractImage(filePath);
      } else {
        text = await ragApi.extractDocumentText(filePath);
      }

      if (this.attachedDoc && this.attachedDoc.id === docId) {
        this.attachedDoc.extractedText = text;
        this.attachedDoc.status = 'ready';
        this.notifyChange();
      }
    } catch (err) {
      if (this.attachedDoc && this.attachedDoc.id === docId) {
        this.attachedDoc.status = 'error';
        this.attachedDoc.errorMessage = String(err);
        this.notifyChange();
      }
    }
  }

  public buildPromptWithContext(userPrompt: string): string {
    if (!this.attachedDoc || !this.attachedDoc.extractedText) {
      return userPrompt;
    }

    const docName = this.attachedDoc.name;
    const docType = this.attachedDoc.type.toUpperCase();
    let docText = this.attachedDoc.extractedText.trim();
    let truncated = false;

    if (docText.length > MAX_ATTACHMENT_CHARS) {
      docText = docText.slice(0, MAX_ATTACHMENT_CHARS);
      truncated = true;
    }

    const truncNote = truncated
      ? `\n[${t('doc.truncatedNote', { max: MAX_ATTACHMENT_CHARS })}]\n`
      : '';

    return `[DOCUMENT ATTACHÉ: "${docName}" (${docType})]
==================================================
${docText}${truncNote}
==================================================

${userPrompt}`;
  }

  public getActionPrompt(actionKey: 'summarize' | 'extract' | 'table' | 'translate'): string {
    switch (actionKey) {
      case 'summarize':
        return t('doc.summarizePrompt');
      case 'extract':
        return t('doc.extractPrompt');
      case 'table':
        return t('doc.tablePrompt');
      case 'translate':
        return t('doc.translatePrompt');
    }
  }

  public formatFileSize(bytes: number): string {
    if (bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  public getTypeBadgeIcon(type: DocumentType, isVision?: boolean): string {
    if (type === 'image' && isVision) return `🖼️ ${t('doc.visionBadge')}`;
    switch (type) {
      case 'pdf': return '📄 PDF';
      case 'docx': return '📝 DOCX';
      case 'xlsx': return '📊 EXCEL';
      case 'csv': return '📈 CSV';
      case 'image': return '📷 OCR';
      case 'code': return '💻 CODE';
      default: return '📋 TEXTE';
    }
  }
}

export { isVisionModel };
