/** Known Ollama vision / multimodal model name patterns. */
const VISION_MODEL_PATTERNS = [
  'llava',
  'moondream',
  'minicpm-v',
  'qwen2-vl',
  'qwen2.5vl',
  'qwen3-vl',
  'bakllava',
  'llama3.2-vision',
  'llama4',
  'gemma3',
  'vision',
  'vl-',
  '-vl',
  'cogvlm',
  'internvl',
];

export function isVisionModel(modelName: string): boolean {
  const m = modelName.toLowerCase();
  return VISION_MODEL_PATTERNS.some((p) => m.includes(p));
}

export function stripDataUrlBase64(dataUrlOrBase64: string): string {
  const match = dataUrlOrBase64.match(/^data:image\/[^;]+;base64,(.+)$/i);
  return match ? match[1] : dataUrlOrBase64;
}
