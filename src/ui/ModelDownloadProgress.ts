/**
 * ModelDownloadProgress — Premium i18n download progress UI (settings + shared).
 */
import { t } from '../i18n';
import { icons } from './icons';
import { escapeText, getSafeId } from '../utils/dom';

const ONE_MB = 1024 * 1024;
const ONE_GB = 1024 * ONE_MB;

export interface ModelDownloadProgressPayload {
  model_id?: string;
  status?: string;
  completed?: number;
  completed_bytes?: number;
  total?: number;
  total_bytes?: number;
  percentage?: number;
  speed_mbps?: number;
  resuming?: boolean;
}

export function formatDownloadSize(bytes: number): string {
  if (bytes >= ONE_GB) return `${(bytes / ONE_GB).toFixed(2)} GB`;
  return `${(bytes / ONE_MB).toFixed(0)} MB`;
}

export function getProgressPercent(p: ModelDownloadProgressPayload): number {
  if (typeof p.percentage === 'number') return Math.min(100, Math.max(0, p.percentage));
  const done = p.completed_bytes ?? p.completed ?? 0;
  const total = p.total_bytes ?? p.total ?? 0;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (done / total) * 100));
}

export function getProgressLabel(p: ModelDownloadProgressPayload): string {
  const key = p.status ?? 'downloading';
  const done = formatDownloadSize(p.completed_bytes ?? p.completed ?? 0);
  const total = formatDownloadSize(p.total_bytes ?? p.total ?? 0);
  const speed = (p.speed_mbps ?? 0).toFixed(1);

  switch (key) {
    case 'starting':
      return t('gguf.progressStarting');
    case 'resuming':
      return t('gguf.progressResuming', { done, total });
    case 'complete':
      return t('gguf.progressComplete');
    case 'downloading':
    default:
      return t('gguf.progressDownloading', { done, total, speed });
  }
}

export function showGlobalDownloadBanner(modelName: string, resuming = false): void {
  const banner = document.getElementById('modelDownloadBanner');
  if (!banner) return;
  banner.classList.add('visible');
  banner.innerHTML = `
    <div class="mdl-dl-banner-inner">
      <div class="mdl-dl-banner-icon">${icons.download}</div>
      <div class="mdl-dl-banner-body">
        <div class="mdl-dl-banner-title">${escapeText(t('gguf.downloadBannerTitle'))}</div>
        <div class="mdl-dl-banner-model">${escapeText(modelName)}${resuming ? ` · ${escapeText(t('gguf.resumeBadge'))}` : ''}</div>
        <div class="mdl-dl-banner-bar"><div class="mdl-dl-banner-fill" id="global-dl-fill" style="width:2%"></div></div>
        <div class="mdl-dl-banner-meta">
          <span id="global-dl-status">${escapeText(t('gguf.progressStarting'))}</span>
          <strong id="global-dl-pct">0%</strong>
        </div>
      </div>
    </div>`;
}

export function hideGlobalDownloadBanner(): void {
  const banner = document.getElementById('modelDownloadBanner');
  if (!banner) return;
  banner.classList.remove('visible');
  banner.innerHTML = '';
}

export function initCardDownloadProgress(modelName: string): void {
  const safeId = getSafeId(modelName);
  const cardBtn = document.querySelector(`[data-pull-name="${modelName}"]`) as HTMLButtonElement | null;
  if (cardBtn) {
    cardBtn.classList.add('pulling');
    cardBtn.disabled = true;
    cardBtn.innerHTML = `${icons.refresh} ${t('settings.pulling')}`;
  }

  const progressSlot = document.getElementById(`card-progress-${safeId}`);
  if (progressSlot) {
    progressSlot.innerHTML = `
      <div class="mdl-card-progress">
        <div class="mdl-card-progress-bar"><div class="mdl-card-progress-fill" id="fill-${safeId}" style="width:2%"></div></div>
        <div class="mdl-card-progress-meta">
          <span id="text-status-${safeId}">${escapeText(t('gguf.progressStarting'))}</span>
          <span id="text-pct-${safeId}">0%</span>
        </div>
      </div>`;
  }
}

export function updateModelDownloadProgress(modelName: string, payload: ModelDownloadProgressPayload): void {
  const safeId = getSafeId(modelName);
  const pct = getProgressPercent(payload);
  const pctStr = `${pct.toFixed(pct >= 10 ? 0 : 1)}%`;
  const label = getProgressLabel(payload);

  const fillEl = document.getElementById(`fill-${safeId}`);
  const textStatus = document.getElementById(`text-status-${safeId}`);
  const textPct = document.getElementById(`text-pct-${safeId}`);
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (textStatus) textStatus.textContent = label;
  if (textPct) textPct.textContent = pctStr;

  const globalFill = document.getElementById('global-dl-fill');
  const globalStatus = document.getElementById('global-dl-status');
  const globalPct = document.getElementById('global-dl-pct');
  if (globalFill) globalFill.style.width = `${pct}%`;
  if (globalStatus) globalStatus.textContent = label;
  if (globalPct) globalPct.textContent = pctStr;
}
