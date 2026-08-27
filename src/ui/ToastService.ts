import { icons } from './icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export class ToastService {
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, type: ToastType = 'info'): void {
    const toastEl = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    const toastIcon = document.getElementById('toastIcon');
    if (!toastEl || !toastText || !toastIcon) return;

    toastEl.className = `toast ${type}`;
    toastIcon.innerHTML = type === 'success' ? icons.check : type === 'error' ? icons.warn : icons.info;
    toastText.textContent = text;
    toastEl.classList.add('show');

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3500);
  }
}
