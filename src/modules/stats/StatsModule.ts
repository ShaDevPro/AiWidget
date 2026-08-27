/**
 * StatsModule - Status bar for expanded and compact modes.
 * Shows: time, date, weather (click to set city), RAM, CPU
 * City preference persisted in localStorage.
 * Weather via Rust/reqwest - no CORS issues.
 */

import { invoke } from '@tauri-apps/api/tauri';
import { t } from '../../i18n';

const CITY_KEY = 'aiwidget_weather_city';
const REFRESH_MS = 10 * 60 * 1000;

interface SystemStats { cpu_pct: number; ram_mb: number; ram_total_mb: number; }
interface WeatherResult { temperature: number; weathercode: number; city: string; }
interface WeatherData { icon: string; tempC: number; city: string; description: string; }

const WMO: Record<number, [string, string]> = {
  0:  ['☀️',  'stats.weather.sunny'],
  1:  ['🌤️', 'stats.weather.mainly_clear'],
  2:  ['⛅',  'stats.weather.partly_cloudy'],
  3:  ['☁️',  'stats.weather.overcast'],
  45: ['🌫️', 'stats.weather.foggy'],
  48: ['🌫️', 'stats.weather.foggy'],
  51: ['🌦️', 'stats.weather.drizzle'],
  53: ['🌦️', 'stats.weather.drizzle'],
  55: ['🌦️', 'stats.weather.drizzle'],
  61: ['🌧️', 'stats.weather.rainy'],
  63: ['🌧️', 'stats.weather.rainy'],
  65: ['🌧️', 'stats.weather.rainy'],
  71: ['❄️',  'stats.weather.snowy'],
  73: ['❄️',  'stats.weather.snowy'],
  75: ['❄️',  'stats.weather.snowy'],
  80: ['🌦️', 'stats.weather.showers'],
  81: ['🌦️', 'stats.weather.showers'],
  82: ['🌦️', 'stats.weather.showers'],
  95: ['⛈️', 'stats.weather.stormy'],
  96: ['⛈️', 'stats.weather.stormy'],
  99: ['⛈️', 'stats.weather.stormy'],
};

function wmo(code: number): [string, string] {
  return WMO[code] ?? ['🌡️', 'stats.weather.unknown'];
}

export class StatsModule {
  private barEl: HTMLElement | null = null;
  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private sysInterval:   ReturnType<typeof setInterval> | null = null;
  private weatherTimeout: ReturnType<typeof setTimeout>  | null = null;
  private lang = 'fr';

  private timeStr = '';
  private dateStr = '';
  private weather: WeatherData | null = null;
  private weatherLoading = true;
  private weatherError = false;
  private weatherRetryCount = 0;
  private static readonly MAX_WEATHER_RETRIES = 4;
  private weatherSearching = false;
  private cpuPct = 0;
  private ramMB = 0;

  // ── Lifecycle ──────────────────────────────────────────────────────────

  attach(barEl: HTMLElement, lang: string): void {
    this.barEl = barEl;
    this.lang  = lang;
    this.startClock(lang);
    this.startSysInfo();
    const saved = localStorage.getItem(CITY_KEY);
    if (saved) void this.fetchWeatherForCity(saved, true);
    else       void this.fetchWeatherAuto();
  }

  detach(): void {
    if (this.clockInterval)  clearInterval(this.clockInterval);
    if (this.sysInterval)    clearInterval(this.sysInterval);
    if (this.weatherTimeout) clearTimeout(this.weatherTimeout);
    this.clockInterval  = null;
    this.sysInterval    = null;
    this.weatherTimeout = null;
    this.barEl          = null;
  }

  // ── Clock ──────────────────────────────────────────────────────────────

  private startClock(lang: string): void {
    const update = () => {
      const now    = new Date();
      const locale = lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-GB' : 'fr-FR';
      this.timeStr = now.toLocaleTimeString(locale,
        { hour: '2-digit', minute: '2-digit', hour12: lang === 'en' });
      this.dateStr = now.toLocaleDateString(locale,
        { weekday: 'short', day: 'numeric', month: 'short' });
      this.render();
    };
    update();
    this.clockInterval = setInterval(update, 60_000);
  }

  // ── Weather auto (IP) ──────────────────────────────────────────────────

  private async fetchWeatherAuto(): Promise<void> {
    this.weatherLoading = true;
    this.weatherError = false;
    this.render();
    try {
      const d = await invoke<WeatherResult>('get_weather');
      const [icon, key] = wmo(d.weathercode);
      this.weather = { icon, tempC: Math.round(d.temperature), city: d.city, description: t(key) };
      this.weatherError = false;
      this.weatherLoading = false;
      this.weatherRetryCount = 0;
      this.render();
      this.weatherTimeout = setTimeout(() => void this.fetchWeatherAuto(), REFRESH_MS);
    } catch (err) {
      console.warn('[StatsModule] Weather auto failed:', err);
      this.weatherRetryCount += 1;
      if (this.weatherRetryCount < StatsModule.MAX_WEATHER_RETRIES) {
        this.weatherLoading = true;
        this.weatherError = false;
        this.render();
        const delay = Math.min(15_000, 2000 * this.weatherRetryCount);
        this.weatherTimeout = setTimeout(() => void this.fetchWeatherAuto(), delay);
        return;
      }
      this.weatherLoading = false;
      this.weatherError = true;
      this.render();
      this.weatherTimeout = setTimeout(() => {
        this.weatherRetryCount = 0;
        void this.fetchWeatherAuto();
      }, 120_000);
    }
  }

  // ── Weather by city name (user choice) ────────────────────────────────

  private async fetchWeatherForCity(city: string, fromSaved = false): Promise<void> {
    this.weatherSearching = false;
    this.weatherLoading = true;
    this.weatherError = false;
    this.render();
    try {
      const d = await invoke<WeatherResult>('get_weather_for_city', { city });
      const [icon, key] = wmo(d.weathercode);
      this.weather = { icon, tempC: Math.round(d.temperature), city: d.city, description: t(key) };
      this.weatherError = false;
      this.weatherLoading = false;
      this.weatherRetryCount = 0;
      localStorage.setItem(CITY_KEY, d.city);
      this.render();
      this.weatherTimeout = setTimeout(() => void this.fetchWeatherForCity(d.city), REFRESH_MS);
    } catch (err) {
      console.warn('[StatsModule] Weather for city failed:', city, err);
      if (fromSaved) {
        localStorage.removeItem(CITY_KEY);
        void this.fetchWeatherAuto();
        return;
      }
      this.weatherLoading = false;
      this.weatherError = true;
      this.render();
    }
  }

  // ── City input UI ──────────────────────────────────────────────────────

  private showCityInput(): void {
    if (!this.barEl) return;
    this.weatherSearching = true;
    this.render();
    requestAnimationFrame(() => {
      const inp = this.barEl?.querySelector<HTMLInputElement>('.stats-city-input');
      inp?.focus(); inp?.select();
    });
  }

  private bindCityInput(): void {
    const inp = this.barEl?.querySelector<HTMLInputElement>('.stats-city-input');
    const btn = this.barEl?.querySelector<HTMLButtonElement>('.stats-city-ok');
    if (!inp) return;
    const submit = () => {
      const val = inp.value.trim();
      if (val) void this.fetchWeatherForCity(val);
      else { this.weatherSearching = false; this.render(); }
    };
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); submit(); }
      if (e.key === 'Escape') { this.weatherSearching = false; this.render(); }
    });
    btn?.addEventListener('click', submit);
  }

  // ── Sysinfo ────────────────────────────────────────────────────────────

  private startSysInfo(): void {
    const update = async () => {
      try {
        const s = await invoke<SystemStats>('get_system_stats');
        this.cpuPct = Math.round(s.cpu_pct);
        this.ramMB  = s.ram_mb;
        this.render();
      } catch { /* ignore */ }
    };
    void update();
    this.sysInterval = setInterval(() => void update(), 3000);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  private render(): void {
    if (!this.barEl) return;

    // GUARD: if city input is already in the DOM (user is typing), don't destroy it.
    // The clock fires every 1s — without this guard, it wipes the input field.
    if (this.weatherSearching && this.barEl.querySelector('.stats-city-input')) return;

    let weatherHtml: string;
    if (this.weatherSearching) {
      const saved = localStorage.getItem(CITY_KEY) ?? '';
      weatherHtml = [
        '<span class="stats-item stats-weather-search">',
        '  <input class="stats-city-input" type="text"',
        '    value="' + saved + '"',
        '    placeholder="' + t('stats.weather.cityPlaceholder') + '"',
        '    maxlength="40" />',
        '  <button class="stats-city-ok"',
        '    title="' + t('stats.weather.cityOk') + '">' + '\u2713' + '</button>',
        '</span>',
      ].join('');
    } else {
      const hint = 'title="' + t('stats.weather.clickToChange') + '"';
      if (this.weatherError) {
        weatherHtml = '<span class="stats-item stats-weather stats-clickable stats-error" ' + hint + '>'
          + t('stats.weather.unavailable')
          + ' <span class="stats-weather-edit">\u270e</span></span>';
      } else if (this.weather) {
        const citySpan = this.weather.city
          ? '<span class="stats-weather-city">' + this.weather.city + '</span>'
          : '';
        weatherHtml = '<span class="stats-item stats-weather stats-clickable" ' + hint + '>'
          + '<span class="stats-weather-icon">' + this.weather.icon + '</span>'
          + '<span class="stats-weather-temp">' + this.weather.tempC + '\u00b0C</span>'
          + citySpan
          + '<span class="stats-weather-edit">\u270e</span>'
          + '</span>';
      } else if (this.weatherLoading) {
        weatherHtml = '<span class="stats-item stats-weather stats-loading">'
          + t('stats.weather.loading') + '</span>';
      } else {
        weatherHtml = '<span class="stats-item stats-weather stats-loading">'
          + t('stats.weather.loading') + '</span>';
      }
    }

    const cpuClass = this.cpuPct > 70 ? 'stats-cpu stats-cpu-high' : 'stats-cpu';
    this.barEl.innerHTML = [
      '<span class="stats-item stats-clock">',
      '  <span class="stats-time">' + this.timeStr + '</span>',
      '  <span class="stats-sep">\u00b7</span>',
      '  <span class="stats-date">' + this.dateStr + '</span>',
      '</span>',
      '<span class="stats-divider"></span>',
      weatherHtml,
      '<span class="stats-divider"></span>',
      '<span class="stats-item stats-sys">',
      '  <span class="stats-sys-label">RAM</span>',
      '  <span class="stats-sys-value">' + this.ramMB + ' MB</span>',
      '</span>',
      '<span class="stats-divider"></span>',
      '<span class="stats-item stats-sys">',
      '  <span class="stats-sys-label">CPU</span>',
      '  <span class="stats-sys-value ' + cpuClass + '">' + this.cpuPct + '%</span>',
      '</span>',
    ].join('');

    if (this.weatherSearching) {
      this.bindCityInput();
    } else {
      this.barEl.querySelector('.stats-clickable')
        ?.addEventListener('click', () => {
          if (this.weatherError) {
            this.weatherRetryCount = 0;
            const saved = localStorage.getItem(CITY_KEY);
            if (saved) void this.fetchWeatherForCity(saved, true);
            else void this.fetchWeatherAuto();
          } else {
            this.showCityInput();
          }
        });
    }
  }
}
