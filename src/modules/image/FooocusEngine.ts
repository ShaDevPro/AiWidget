/**
 * FooocusEngine — Moteur de styles, d'enrichissement de prompts et de filtres négatifs
 * directement inspiré de l'architecture d'excellence de Fooocus (lllyasviel/Fooocus).
 */

export interface FooocusStyle {
  id: string;
  name: string;
  icon: string;
  promptTemplate: string;
  negativePrompt: string;
}

export const FOOOCUS_DEFAULT_NEGATIVE =
  '(worst quality, low quality, normal quality, lowres:1.4), (blur, blurry, grainy, out of focus), morbid, ugly, mutated, malformed, deformed, extra limbs, bad anatomy, bad hands, missing fingers, floating limbs, disfigured, jpeg artifacts, poorly drawn face, poorly drawn hands, duplicate';

export const FOOOCUS_STYLES: Record<string, FooocusStyle> = {
  enhance: {
    id: 'enhance',
    name: 'Fooocus Enhance',
    icon: '✨',
    promptTemplate: 'breathtaking {prompt}, award-winning, professional, highly detailed, masterpiece, sharp focus, 8k',
    negativePrompt: FOOOCUS_DEFAULT_NEGATIVE,
  },
  cinematic: {
    id: 'cinematic',
    name: 'Fooocus Cinematic',
    icon: '🎬',
    promptTemplate:
      'cinematic still of {prompt} . emotional, harmonious, vignette, 4k epic detailed photograph, 35mm photo, sharp focus, high budget, cinemascope, moody, epic, gorgeous, film lighting',
    negativePrompt:
      'anime, cartoon, graphic, (blur, blurry, bokeh), text, painting, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured',
  },
  photograph: {
    id: 'photograph',
    name: 'Photographie Réaliste',
    icon: '📸',
    promptTemplate:
      'professional photograph of {prompt}, 50mm lens, f/1.8, natural cinematic lighting, highly detailed, realistic skin texture, realistic materials, photorealistic, 8k uhd, dslr quality',
    negativePrompt:
      'cgi, 3d render, illustration, anime, cartoon, drawing, painting, sketch, oversaturated, blurry, bad anatomy, deformed, distorted, watermark',
  },
  masterpiece: {
    id: 'masterpiece',
    name: 'Chef-d\'œuvre Artistique',
    icon: '🎨',
    promptTemplate:
      '(masterpiece:1.3), (best quality:1.3), (ultra-detailed:1.2), {prompt}, intricate details, perfect composition, rich colors, artistic lighting',
    negativePrompt:
      'lowres, bad anatomy, bad hands, missing fingers, extra digits, cropped, worst quality, low quality, glitch, blurry',
  },
  anime: {
    id: 'anime',
    name: 'Anime & Manga',
    icon: '🌸',
    promptTemplate:
      'anime artwork of {prompt}, makoto shinkai style, studio ghibli aesthetic, vibrant colors, detailed lineart, key visual, beautiful anime aesthetic',
    negativePrompt:
      'photo, photorealistic, realism, 3d, deformed, bad anatomy, disfigured, low contrast, ugly, blurry',
  },
  model3d: {
    id: 'model3d',
    name: 'Rendu 3D Octane',
    icon: '🎮',
    promptTemplate:
      'professional 3d render of {prompt}, octane render, unreal engine 5, ray tracing, volumetric lighting, subsurface scattering, highly detailed 3d asset',
    negativePrompt: 'sketch, 2d, painting, flat, low poly, ugly, deformed, blurry, noisy',
  },
  digitalArt: {
    id: 'digitalArt',
    name: 'Concept Art & Digital',
    icon: '🖌️',
    promptTemplate:
      'epic concept art of {prompt}, digital illustration, artstation trending, matte painting, painterly brushwork, magnificent atmosphere, fantasy lighting',
    negativePrompt: 'photograph, amateur, deformed, ugly, noisy, watermark, blurry',
  },
  fantasy: {
    id: 'fantasy',
    name: 'Fantaisie Féerique',
    icon: '🧚',
    promptTemplate:
      'ethereal fantasy concept art of {prompt}, celestial, magical glowing aura, majestic, dreamy atmosphere, highly detailed fantasy illustration',
    negativePrompt:
      'photographic, 35mm film, modern, text, deformed, bad anatomy, ugly, disfigured, black and white',
  },
  origami: {
    id: 'origami',
    name: 'Origami & Papier Découpé',
    icon: '📄',
    promptTemplate:
      'origami paper craft of {prompt}, layered folded paper art, delicate paper textures, soft ambient lighting, clean composition, artistic minimalism',
    negativePrompt: 'photo, realistic skin, messy, noisy, blurry, painting, ugly',
  },
  isometric: {
    id: 'isometric',
    name: 'Isométrique 3D',
    icon: '📐',
    promptTemplate:
      'isometric miniature diorama of {prompt}, 3d isometric view, tilt-shift, cute voxel art, clean sharp edges, vibrant colors, ambient occlusion',
    negativePrompt: 'perspective distortion, messy, deformed, ugly, blurry, flat 2d',
  },
};

/** Dictionnaire de traduction rapide des mots-clés fréquents FR/AR -> EN pour CLIP */
const KEYWORD_TRANSLATIONS: Array<[RegExp, string]> = [
  // Sujets / Animaux
  [/\b(chat|chaton|chats)\b/gi, 'cat'],
  [/\b(chien|chiot|chiens)\b/gi, 'dog'],
  [/\b(astronaute|cosmonaute)\b/gi, 'astronaut in space suit'],
  [/\b(lune)\b/gi, 'moon surface with stars'],
  [/\b(soleil|coucher de soleil)\b/gi, 'gorgeous sunset'],
  [/\b(mer|oc[eé]an|plage)\b/gi, 'ocean beach with waves'],
  [/\b(for[eê]t|arbres|nature)\b/gi, 'enchanted lush forest'],
  [/\b(montagne|montagnes)\b/gi, 'majestic mountains peak'],
  [/\b(ville|cit[eé]|immeubles)\b/gi, 'futuristic cityscape with skyscrapers'],
  [/\b(voiture|automobile|v[eé]hicule)\b/gi, 'sleek sports car vehicle'],
  [/\b(robot|cyborg|andro[iï]de)\b/gi, 'high-tech humanoid robot'],
  [/\b(ch[aâ]teau|forteresse)\b/gi, 'medieval fantasy castle'],
  [/\b(galaxie|espace|univers|cosmos)\b/gi, 'deep space nebula galaxy'],
  [/\b(fleur|fleurs|rose|jardin)\b/gi, 'blooming flowers garden'],
  [/\b(femme|fille|dame)\b/gi, 'beautiful woman portrait'],
  [/\b(homme|gar[çc]on)\b/gi, 'handsome man portrait'],
  [/\b(dragon|cr[eé]ature)\b/gi, 'mythical majestic dragon'],
  [/\b(guerrier|chevalier|samoura[iï])\b/gi, 'legendary warrior knight in armor'],

  // Termes Arabes
  [/\b(قطة|قط|هر)\b/g, 'cat'],
  [/\b(كلب)\b/g, 'dog'],
  [/\b(رائد فضاء)\b/g, 'astronaut in space suit'],
  [/\b(القمر|قمر)\b/g, 'moon surface with stars'],
  [/\b(غروب|شمس)\b/g, 'golden hour sunset'],
  [/\b(بحر|محيط|شاطئ)\b/g, 'ocean beach with waves'],
  [/\b(غابة|طبيعة|أشجار)\b/g, 'lush enchanted forest'],
  [/\b(جبل|جبال)\b/g, 'majestic mountain peaks'],
  [/\b(مدينة|عمارة|مباني)\b/g, 'futuristic modern city'],
  [/\b(سيارة|مركبة)\b/g, 'sports car'],
  [/\b(روبوت|آلي)\b/g, 'humanoid cyborg robot'],
  [/\b(قلعة|قصر)\b/g, 'grand majestic castle'],
  [/\b(فضاء|مجرة|نجوم)\b/g, 'deep space nebula galaxy'],
  [/\b(وردة|زهور|حديقة)\b/g, 'colorful flowers garden'],
  [/\b(تنين)\b/g, 'mythical dragon with fire'],
  [/\b(فارس|محارب)\b/g, 'epic fantasy warrior knight'],
];

export class FooocusEngine {
  /**
   * Traduit et enrichit le prompt pour le modèle CLIP
   */
  static expandPrompt(prompt: string, styleId = 'cinematic'): { finalPrompt: string; finalNegative: string } {
    let clean = prompt.trim();

    // 1. Détection et remplacement des mots-clés FR/AR vers EN
    for (const [pattern, replacement] of KEYWORD_TRANSLATIONS) {
      clean = clean.replace(pattern, replacement);
    }

    // 2. Récupération du style Fooocus
    const style = FOOOCUS_STYLES[styleId] ?? FOOOCUS_STYLES.enhance;

    // 3. Application du template de style Fooocus
    const finalPrompt = style.promptTemplate.replace('{prompt}', clean);
    const finalNegative = style.negativePrompt;

    return {
      finalPrompt,
      finalNegative,
    };
  }

  /**
   * Liste des résolutions Fooocus optimisées
   */
  static getAspectRatios(): Array<{ label: string; width: number; height: number; ratio: string }> {
    return [
      { label: 'Carré Standard (1:1)', width: 512, height: 512, ratio: '1:1' },
      { label: 'Paysage Cinéma (16:9)', width: 640, height: 384, ratio: '16:9' },
      { label: 'Portrait / Story (9:16)', width: 384, height: 640, ratio: '9:16' },
      { label: 'Photo Standard (4:3)', width: 576, height: 448, ratio: '4:3' },
      { label: 'HD Équilibré (768x768)', width: 768, height: 768, ratio: '1:1 HD' },
    ];
  }
}
