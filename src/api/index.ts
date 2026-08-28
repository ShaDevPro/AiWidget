/**
 * API barrel — backward-compatible re-export.
 * All existing `import { api } from './api'` continue to work unchanged.
 * Each domain is also available individually:
 *   import { chatApi } from './api/chat';
 *   import { voiceApi } from './api/voice';
 */
export { conversationsApi } from './conversations';
export { settingsApi } from './settings';
export { chatApi } from './chat';
export { modelsApi } from './models';
export { ollamaApi } from './ollama';
export { voiceApi } from './voice';
export { searchApi } from './search';
export { memoryApi } from './memory';
export { ragApi } from './rag';
export { widgetApi } from './widget';
export { hardwareApi } from './hardware';
export { quotaApi } from './quota';
export { policyApi } from './policy';
export { profileApi } from './profile';
export { licenseApi } from './license';
export { imageApi } from './image';
export { updaterApi } from './updater';

// ── Unified `api` object — 100% backward compatible ───────────────────────
import { conversationsApi } from './conversations';
import { settingsApi } from './settings';
import { chatApi } from './chat';
import { modelsApi } from './models';
import { ollamaApi } from './ollama';
import { voiceApi } from './voice';
import { searchApi } from './search';
import { memoryApi } from './memory';
import { ragApi } from './rag';
import { widgetApi } from './widget';
import { hardwareApi } from './hardware';
import { quotaApi } from './quota';
import { policyApi } from './policy';
import { profileApi } from './profile';
import { licenseApi } from './license';
import { imageApi } from './image';
import { updaterApi } from './updater';

export const api = {
  ...conversationsApi,
  ...settingsApi,
  ...chatApi,
  ...modelsApi,
  ...ollamaApi,
  ...voiceApi,
  ...searchApi,
  ...memoryApi,
  ...ragApi,
  ...widgetApi,
  ...hardwareApi,
  ...quotaApi,
  ...policyApi,
  ...profileApi,
  ...licenseApi,
  ...imageApi,
  ...updaterApi,
};
