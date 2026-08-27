import fs from 'fs';

function transform(code) {
  return code
    .replace(/this\./g, 'host.')
    .replace(/host\.currentConversation/g, 'host.sidebarModule.currentConversation')
    .replace(/host\.messages/g, 'host.chatModule.messages')
    .replace(/host\.isGenerating/g, 'host.chatModule.isGenerating')
    .replace(/host\.conversations/g, 'host.sidebarModule.conversations')
    .replace(/host\.voiceState/g, 'host.voiceModule.voiceState')
    .replace(/host\.el\b/g, 'host.getRootElement()')
    .replace(/host\.chatContainer = (document\.getElementById\([^)]+\))/g, 'host.setChatContainer($1)')
    .replace(/host\.chatInput = (document\.getElementById\([^)]+\) as HTMLTextAreaElement)/g, 'host.setChatInput($1)');
}

const lines = fs.readFileSync('src/App.ts', 'utf8').split('\n');

const bubble = lines.slice(756, 807).join('\n');
const compact = lines.slice(809, 857).join('\n');
const compactEvents = lines.slice(859, 914).join('\n');
const expanded = lines.slice(917, 1126).join('\n');
const expandedEvents = lines.slice(1238, 1564).join('\n');

const shellFile = `/**
 * WidgetShell — Renders bubble / compact / expanded widget modes.
 */
import { api } from '../../api';
import { t, isRTL } from '../../i18n';
import { icons } from '../../ui/icons';
import { footerMenuModule } from '../menu/FooterMenuModule';
import { helpModule } from '../help/HelpModule';
import { aboutModule } from '../about/AboutModule';
import type { ShellHost } from './ShellHost';

export class WidgetShell {
  render(host: ShellHost): void {
    document.body.className = \`widget-shell mode-\${host.mode} \${isRTL(host.settings.language) ? 'rtl' : ''}\`;
    if (host.mode === 'bubble') this.renderBubble(host);
    else if (host.mode === 'compact') {
      this.renderCompact(host);
      this.attachCompactEvents(host);
    } else {
      this.renderExpanded(host);
      this.attachExpandedEvents(host);
    }
  }

  private renderBubble(host: ShellHost): void {
${transform(bubble)}
  }

  private renderCompact(host: ShellHost): void {
${transform(compact)}
  }

  attachCompactEvents(host: ShellHost): void {
${transform(compactEvents)}
  }

  private renderExpanded(host: ShellHost): void {
${transform(expanded)}
  }

  attachExpandedEvents(host: ShellHost): void {
${transform(expandedEvents)}
  }
}
`;

fs.writeFileSync('src/modules/shell/WidgetShell.ts', shellFile);
console.log('Shell lines:', shellFile.split('\n').length);
