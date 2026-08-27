import fs from 'fs';
import path from 'path';

const APP = fs.readFileSync('src/App.ts', 'utf8').split('\n');

function transform(code) {
  return code
    .replace(/this\./g, 'host.')
    .replace(/host\.el\b/g, 'host.getRootElement()')
    .replace(/host\.chatContainer\b/g, 'host.getChatContainer()')
    .replace(/host\.chatInput\b/g, 'host.getChatInput()')
    .replace(
      /host\.setChatContainer\((document\.getElementById\('chatContainer'\))\)/g,
      'host.setChatContainer($1)',
    )
    .replace(
      /host\.setChatInput\((document\.getElementById\('chatInput'\) as HTMLTextAreaElement)\)/g,
      'host.setChatInput($1)',
    );
}

function body(start, end) {
  return transform(APP.slice(start - 1, end).join('\n'));
}

const outDir = 'src/modules/shell';
fs.mkdirSync(outDir, { recursive: true });

// Line ranges (1-based, inclusive) — method bodies only
const bubbleBody = body(758, 807);
const compactBody = body(811, 855);
const compactEventsBody = body(861, 914);
const expandedBody = body(918, 1124);
const expandedEventsBody = body(1131, 1457);

fs.writeFileSync(
  path.join(outDir, 'BubbleView.ts'),
  `/**
 * BubbleView — Minimal floating bubble widget mode.
 */
import { api } from '../../api';
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import type { ShellHost } from './ShellHost';

export class BubbleView {
  render(host: ShellHost): void {
${bubbleBody}
  }
}
`,
);

fs.writeFileSync(
  path.join(outDir, 'CompactView.ts'),
  `/**
 * CompactView — Single-line quick prompt bar.
 */
import { api } from '../../api';
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import type { ShellHost } from './ShellHost';

export class CompactView {
  render(host: ShellHost): void {
${compactBody}
  }

  attachEvents(host: ShellHost): void {
${compactEventsBody}
  }
}
`,
);

fs.writeFileSync(
  path.join(outDir, 'ExpandedView.ts'),
  `/**
 * ExpandedView — Full chat layout HTML.
 */
import { t, currentLanguage } from '../../i18n';
import { icons } from '../../ui/icons';
import type { ShellHost } from './ShellHost';

export class ExpandedView {
  render(host: ShellHost): void {
${expandedBody}
  }
}
`,
);

fs.writeFileSync(
  path.join(outDir, 'ExpandedViewController.ts'),
  `/**
 * ExpandedViewController — Event bindings for expanded mode.
 */
import { api } from '../../api';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { t } from '../../i18n';
import type { ShellHost } from './ShellHost';

export class ExpandedViewController {
  attach(host: ShellHost): void {
${expandedEventsBody}
  }
}
`,
);

fs.writeFileSync(
  path.join(outDir, 'WidgetShell.ts'),
  `/**
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
    document.body.className = \`widget-shell mode-\${host.mode} \${isRTL(host.settings.language) ? 'rtl' : ''}\`;

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
`,
);

console.log('WidgetShell files generated.');
