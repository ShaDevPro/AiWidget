/**
 * StreamModule — Zero-latency streaming + smart auto-scroll.
 *
 * Direct real-time 60fps token presentation:
 *  - Renders incoming LLM tokens immediately without artificial throttling or character delays.
 *  - Auto-scrolls to bottom while user is at the bottom.
 *  - Pauses auto-scroll if user scrolls up, with "↓" jump button.
 *  - Smooth final scroll and clean cursor removal when stream ends.
 */

const SCROLL_THRESHOLD = 60; // px from bottom → considered "at bottom"
const SCROLL_BTN_ID = 'streamScrollBtn';

export class StreamModule {
  private container: HTMLElement | null = null;
  private btn: HTMLElement | null = null;
  isUserScrolling = false;
  isStreaming = false;
  private onScrollListener: (() => void) | null = null;

  // ── Lifecycle ────────────────────────────────────────────────

  attach(container: HTMLElement): void {
    this.container = container;
    this.isUserScrolling = false;

    if (this.onScrollListener) {
      container.removeEventListener('scroll', this.onScrollListener);
    }
    this.onScrollListener = () => this.handleUserScroll();
    container.addEventListener('scroll', this.onScrollListener, { passive: true });

    this.ensureScrollBtn();
  }

  detach(): void {
    if (this.container && this.onScrollListener) {
      this.container.removeEventListener('scroll', this.onScrollListener);
    }
    this.btn?.remove();
    this.btn = null;
    this.container = null;
  }

  // ── Streaming lifecycle ───────────────────────────────────────

  startStream(): void {
    this.isStreaming = true;
    this.isUserScrolling = false;
    this.hideScrollBtn();
  }

  onToken(): void {
    if (!this.isUserScrolling) {
      this.scrollInstant();
    }
  }

  endStream(): void {
    this.isStreaming = false;
    this.removeCursor();
    setTimeout(() => this.scrollSmooth(), 30);
    this.hideScrollBtn();
  }

  // ── Cursor management ─────────────────────────────────────────

  removeCursor(): void {
    document.querySelectorAll('.stream-cursor').forEach(el => el.remove());
  }

  // ── Scroll helpers ────────────────────────────────────────────

  scrollSmooth(): void {
    this.container?.scrollTo({ top: this.container.scrollHeight, behavior: 'smooth' });
  }

  scrollInstant(): void {
    if (!this.container) return;
    this.container.scrollTop = this.container.scrollHeight;
  }

  isAtBottom(): boolean {
    if (!this.container) return true;
    const { scrollTop, scrollHeight, clientHeight } = this.container;
    return scrollHeight - scrollTop - clientHeight <= SCROLL_THRESHOLD;
  }

  // ── User scroll detection ─────────────────────────────────────

  private handleUserScroll(): void {
    if (!this.isStreaming) return;
    if (this.isAtBottom()) {
      this.isUserScrolling = false;
      this.hideScrollBtn();
    } else {
      this.isUserScrolling = true;
      this.showScrollBtn();
    }
  }

  // ── Scroll-to-bottom button ───────────────────────────────────

  private ensureScrollBtn(): void {
    const existing = document.getElementById(SCROLL_BTN_ID);
    if (existing) { this.btn = existing; return; }

    const btn = document.createElement('button');
    btn.id = SCROLL_BTN_ID;
    btn.className = 'stream-scroll-btn';
    btn.setAttribute('aria-label', 'Revenir en bas');
    btn.innerHTML = [
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"',
      '     stroke="currentColor" stroke-width="2.5"',
      '     stroke-linecap="round" stroke-linejoin="round">',
      '  <polyline points="6 9 12 15 18 9"/>',
      '</svg>',
    ].join('');

    btn.addEventListener('click', () => {
      this.isUserScrolling = false;
      this.scrollSmooth();
      this.hideScrollBtn();
    });

    const parent = this.container?.parentElement;
    if (parent) {
      parent.style.position = 'relative';
      parent.appendChild(btn);
    }
    this.btn = btn;
  }

  private showScrollBtn(): void { this.btn?.classList.add('visible'); }
  private hideScrollBtn(): void { this.btn?.classList.remove('visible'); }
}
