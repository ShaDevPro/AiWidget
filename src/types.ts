export interface Conversation {
  id: string;
  title: string;
  model: string;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  /** UI-only label; falls back to `content` when absent (legacy). */
  displayContent?: string;
  /** Full LLM payload when a document was attached (persisted). */
  llmContent?: string;
  /** Ephemeral vision payload (base64, not persisted). */
  images?: string[];
  /** Web sources cited for this assistant reply (persisted in SQLite). */
  webSources?: WebSource[];
}

export interface WebSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  role: string;
  content: string;
  images?: string[];
}

export interface LLMModel {
  name: string;
  size?: string;
  modified_at?: string;
}

export interface AppSettings {
  language: string;
  ollama_base_url: string;
  temperature: number;
  max_tokens: number;
  default_model: string;
  theme: string;
  voice_enabled: boolean;
  voice_auto_speak: boolean;
  voice_continuous_mode: boolean;
  voice_id: string;
  voice_speed: number;
  whisper_model: string;
  execution_mode?: 'lite' | 'pro';
  server_url?: string;
  server_auth_token?: string;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  engine: string;
}

export interface WhisperStatus {
  installed: boolean;
  model_installed: boolean;
  binary_path: string;
}

export interface MessageInput {
  conversation_id: string;
  role: string;
  content: string;
  llmContent?: string;
  webSources?: WebSource[];
}

export type View = 'chat' | 'settings';

export interface CuratedGGUFModel {
  id: string;
  name: string;
  filename: string;
  size_mb: number;
  ram_needed: string;
  url: string;
  description_key: string;
  tag: string;
  is_recommended: boolean;
}

export interface InstalledGGUFModel {
  id: string;
  name: string;
  filename: string;
  file_path: string;
  size_bytes: number;
  size_formatted: string;
  is_curated: boolean;
}

export interface GGUFDownloadProgress {
  model_id: string;
  completed_bytes: number;
  total_bytes: number;
  percentage: number;
  speed_mbps: number;
  status: string;
  resuming: boolean;
}

export interface PartialGGUFDownload {
  model_id: string;
  filename: string;
  partial_bytes: number;
  total_bytes: number;
  percentage: number;
}

export interface LlamaEngineStatus {
  running: boolean;
  port: number;
  current_model: string | null;
  binary_installed: boolean;
}

export interface UserMemory {
  id: string;
  category: string;
  key: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface RAGDocument {
  id: string;
  filename: string;
  filepath: string;
  file_type: string;
  size_bytes: number;
  chunk_count: number;
  created_at: string;
}

export interface RAGSearchResult {
  document_id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  score: number;
  metadata: string;
}

export interface VectorDBStats {
  total_documents: number;
  total_chunks: number;
  dimensions: number;
  is_ready: boolean;
  memory_bytes: number;
}

export interface RAGSemanticSearchResult {
  document_id: string;
  document_name: string;
  chunk_index: number;
  content: string;
  similarity: number;
  similarity_pct: number;
  metadata: string;
}

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface HardwareSpecs {
  cpu_name: string;
  cpu_cores: number;
  cpu_threads: number;
  total_ram_gb: number;
  available_ram_gb: number;
  gpu_name: string;
  gpu_vram_gb: number;
  has_discrete_gpu: boolean;
  tier: 'cpu_entry' | 'cpu_mid' | 'gpu_mid' | 'gpu_high';
  recommended_model_id: string;
  recommended_model_name: string;
  estimated_speed_tokens_sec: string;
  score: number;
  profile_label_key: string;
}

export interface UserQuota {
  profile_id: string;
  is_admin: boolean;
  daily_limit: number;
  used_today: number;
  remaining_today: number;
  reset_date: string;
  is_exceeded: boolean;
}

export interface EnterprisePolicy {
  is_managed: boolean;
  locked_mode?: 'lite' | 'pro' | null;
  enforced_server_url?: string | null;
  allow_mode_switch: boolean;
  allow_local_models: boolean;
  company_name?: string | null;
  department?: string | null;
}

export type LicenseTier = 'free' | 'lite' | 'pro';

export interface LicenseStatus {
  is_licensed: boolean;
  tier: LicenseTier;
  hwid: string;
  license_key?: string | null;
  activated_at?: string | null;
  is_lite_unlocked: boolean;
  is_pro_unlocked: boolean;
  company?: string | null;
}

export type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'image' | 'code' | 'text';

export interface AttachedDocument {
  id: string;
  name: string;
  size: number;
  type: DocumentType;
  path?: string;
  base64Preview?: string;
  extractedText?: string;
  isOcr?: boolean;
  isVision?: boolean;
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string;
}

export interface MessageSearchResult {
  message_id: string;
  conversation_id: string;
  conversation_title: string;
  snippet: string;
}

export interface IntegrityStatus {
  is_genuine: boolean;
  status_code: string;
  message: string;
  last_verified_at?: string | null;
  binary_sha256: string;
  channel: string;
}
