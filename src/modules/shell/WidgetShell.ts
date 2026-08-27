/**
 * WidgetShell — Dispatches bubble / compact / expanded rendering.
 */
import { isRTL } from '../../i18n';
import { BubbleView } from './BubbleView';
import { CompactView } from './CompactView';
import { ExpandedView } from './ExpandedView';
import { ExpandedViewController } from './ExpandedViewController';
import type { ShellHost } from './ShellHost';

export class WidgetShell {
  private bubbleView = new BubbleView();
  private compactView = new CompactView();
  private expandedView = new ExpandedView();
  private expandedController = new ExpandedViewController();

  render(host: ShellHost): void {
    document.body.className = `widget-shell mode-${host.mode} ${isRTL(host.settings.language) ? 'rtl' : ''}`;

    if (host.mode === 'bubble') {
      this.bubbleView.render(host);
    } else if (host.mode === 'compact') {
      this.compactView.render(host);
      this.compactView.attachEvents(host);
    } else {
      this.expandedView.render(host);
      this.expandedController.attach(host);
    }
  }
}
