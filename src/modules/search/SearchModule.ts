/**
 * SearchModule — Manages web search toggle state and privacy consent.
 */

export class SearchModule {
  webSearchEnabled = false;
  webSearchPrivacyAccepted = localStorage.getItem('aiwidget_web_privacy_accepted') === 'true';

  toggleWebSearch(enabled: boolean): void {
    this.webSearchEnabled = enabled;
  }

  acceptPrivacy(): void {
    this.webSearchPrivacyAccepted = true;
    localStorage.setItem('aiwidget_web_privacy_accepted', 'true');
  }
}
