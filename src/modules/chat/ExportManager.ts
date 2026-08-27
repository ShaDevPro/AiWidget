/**
 * ExportManager — Handles multi-format chat exports (Markdown, TXT, native PDF)
 */
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile } from '@tauri-apps/api/fs';
import { jsPDF } from 'jspdf';
import { Conversation, Message } from '../../types';

export class ExportManager {
  /**
   * Export conversation to Markdown string and trigger download
   */
  public static exportToMarkdown(conv: Conversation, messages: Message[], userPseudo = 'Vous'): void {
    const lines: string[] = [
      `# Conversation : ${conv.title}`,
      `*Date : ${new Date(conv.created_at).toLocaleString()}*`,
      `*Modèle : ${conv.model}*`,
      '',
      '---',
      '',
    ];

    for (const msg of messages) {
      const isUser = msg.role === 'user';
      const author = isUser ? `👤 ${userPseudo}` : '🤖 AI Widget';
      const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      lines.push(`### ${author} (${timeStr})`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    }

    const safeTitle = conv.title.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
    this.downloadFile(`${safeTitle}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
  }

  /**
   * Export conversation to Plain Text (.txt)
   */
  public static exportToText(conv: Conversation, messages: Message[], userPseudo = 'Vous'): void {
    const lines: string[] = [
      `=== CONVERSATION : ${conv.title.toUpperCase()} ===`,
      `Date   : ${new Date(conv.created_at).toLocaleString()}`,
      `Modèle : ${conv.model}`,
      '==================================================',
      '',
    ];

    for (const msg of messages) {
      const isUser = msg.role === 'user';
      const author = isUser ? `[${userPseudo}]` : '[AI WIDGET]';
      const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      lines.push(`${author} - ${timeStr}`);
      lines.push(msg.content);
      lines.push('--------------------------------------------------');
      lines.push('');
    }

    const safeTitle = conv.title.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
    this.downloadFile(`${safeTitle}.txt`, lines.join('\n'), 'text/plain;charset=utf-8');
  }

  /**
   * Export conversation to a native PDF file (save dialog + write).
   */
  public static async exportToNativePdf(
    conv: Conversation,
    messages: Message[],
    userPseudo = 'Vous',
  ): Promise<boolean> {
    const safeTitle = conv.title.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]/g, '_');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const writeBlock = (text: string, fontSize: number, bold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, pageWidth) as string[];
      const lineHeight = fontSize * 0.45;
      for (const line of lines) {
        ensureSpace(lineHeight);
        doc.text(line, margin, y);
        y += lineHeight;
      }
    };

    writeBlock(`Conversation : ${conv.title}`, 16, true);
    y += 2;
    writeBlock(
      `Date : ${new Date(conv.created_at).toLocaleString()} | Modèle : ${conv.model}`,
      10,
    );
    y += 4;

    for (const msg of messages) {
      const isUser = msg.role === 'user';
      const author = isUser ? userPseudo : 'AI Widget';
      const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      ensureSpace(12);
      writeBlock(`${author} • ${timeStr}`, 11, true);
      y += 1;
      writeBlock(msg.content.replace(/\r\n/g, '\n'), 10);
      y += 4;
    }

    const pdfBytes = doc.output('arraybuffer');

    if ('__TAURI__' in window) {
      const path = await save({
        defaultPath: `${safeTitle}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!path) return false;
      await writeBinaryFile(path, new Uint8Array(pdfBytes));
      return true;
    }

    doc.save(`${safeTitle}.pdf`);
    return true;
  }

  private static downloadFile(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
