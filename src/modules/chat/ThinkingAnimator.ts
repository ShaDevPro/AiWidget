/**
 * ThinkingAnimator — Animated status labels during LLM generation.
 */
import { t } from '../../i18n';

export class ThinkingAnimator {
  private stepIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;

  start(webSearchEnabled: boolean, hasRagDocs: boolean): void {
    this.stop();
    this.stepIndex = 0;
    this.interval = setInterval(() => {
      this.stepIndex++;
      const labelEl = document.getElementById('thinkingStepText');
      if (labelEl) {
        labelEl.classList.remove('fade-in');
        void labelEl.offsetWidth;
        labelEl.textContent = this.getLabel(webSearchEnabled, hasRagDocs);
        labelEl.classList.add('fade-in');
      }
    }, 2200);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.stepIndex = 0;
  }

  getLabel(webSearchEnabled: boolean, hasRagDocs: boolean): string {
    if (webSearchEnabled) {
      const steps = [t('anim.webSearch'), t('anim.webAnalyze'), t('anim.synthesizing'), t('anim.refining')];
      return steps[this.stepIndex % steps.length];
    }
    if (hasRagDocs) {
      const steps = [t('anim.ragConsult'), t('anim.ragExtract'), t('anim.thinking'), t('anim.refining')];
      return steps[this.stepIndex % steps.length];
    }
    const steps = [t('anim.thinking'), t('anim.reasoning'), t('anim.refining')];
    return steps[this.stepIndex % steps.length];
  }
}
