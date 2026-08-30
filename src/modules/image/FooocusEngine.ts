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
  'dark, underexposed, pitch black, black screen, poorly lit, night, shadow, (worst quality, low quality, normal quality, lowres:1.4), (blur, blurry, grainy, out of focus), morbid, ugly, mutated, malformed, deformed, extra limbs, bad anatomy, bad hands, missing fingers, floating limbs, disfigured, jpeg artifacts, poorly drawn face, poorly drawn hands, duplicate, watermark, text, signature';

export const FOOOCUS_STYLES: Record<string, FooocusStyle> = {
  enhance: {
    id: 'enhance',
    name: 'Fooocus Enhance',
    icon: '✨',
    promptTemplate: 'breathtaking {prompt}, award-winning, professional, highly detailed, masterpiece, sharp focus, 8k, crisp bright lighting',
    negativePrompt: FOOOCUS_DEFAULT_NEGATIVE,
  },
  cinematic: {
    id: 'cinematic',
    name: 'Fooocus Cinematic',
    icon: '🎬',
    promptTemplate:
      'cinematic wide shot of {prompt} . emotional, harmonious, 4k epic detailed photograph, 35mm photo, sharp focus, high budget, cinemascope, gorgeous, natural cinematic film lighting, highly detailed',
    negativePrompt:
      'dark, pitch black, underexposed, anime, cartoon, graphic, (blur, blurry, bokeh), text, painting, crayon, graphite, abstract, glitch, deformed, mutated, ugly, disfigured',
  },
  photograph: {
    id: 'photograph',
    name: 'Photographie Réaliste',
    icon: '📸',
    promptTemplate:
      'professional realistic photograph of {prompt}, 50mm lens, f/1.8, clear daylight lighting, highly detailed, realistic materials, photorealistic, 8k uhd, dslr quality, sharp focus',
    negativePrompt:
      'dark, underexposed, black screen, cgi, 3d render, illustration, anime, cartoon, drawing, painting, sketch, oversaturated, blurry, bad anatomy, deformed, distorted, watermark',
  },
  masterpiece: {
    id: 'masterpiece',
    name: 'Chef-d\'œuvre Artistique',
    icon: '🎨',
    promptTemplate:
      '(masterpiece:1.3), (best quality:1.3), (ultra-detailed:1.2), {prompt}, intricate details, perfect composition, rich colors, vibrant lighting',
    negativePrompt:
      'dark, black screen, lowres, bad anatomy, bad hands, missing fingers, extra digits, cropped, worst quality, low quality, glitch, blurry',
  },
  anime: {
    id: 'anime',
    name: 'Anime & Manga',
    icon: '🌸',
    promptTemplate:
      'anime artwork of {prompt}, makoto shinkai style, studio ghibli aesthetic, vibrant colors, detailed lineart, key visual, beautiful anime aesthetic',
    negativePrompt:
      'dark, photo, photorealistic, realism, 3d, deformed, bad anatomy, disfigured, low contrast, ugly, blurry',
  },
  model3d: {
    id: 'model3d',
    name: 'Rendu 3D Octane',
    icon: '🎮',
    promptTemplate:
      'professional 3d render of {prompt}, octane render, unreal engine 5, ray tracing, volumetric lighting, subsurface scattering, highly detailed 3d asset',
    negativePrompt: 'dark, sketch, 2d, painting, flat, low poly, ugly, deformed, blurry, noisy',
  },
  digitalArt: {
    id: 'digitalArt',
    name: 'Concept Art & Digital',
    icon: '🖌️',
    promptTemplate:
      'epic concept art of {prompt}, digital illustration, artstation trending, matte painting, painterly brushwork, magnificent atmosphere, fantasy lighting',
    negativePrompt: 'dark, photograph, amateur, deformed, ugly, noisy, watermark, blurry',
  },
  fantasy: {
    id: 'fantasy',
    name: 'Fantaisie Féerique',
    icon: '🧚',
    promptTemplate:
      'ethereal fantasy concept art of {prompt}, celestial, magical glowing aura, majestic, dreamy atmosphere, highly detailed fantasy illustration',
    negativePrompt:
      'dark, photographic, 35mm film, modern, text, deformed, bad anatomy, ugly, disfigured, black and white',
  },
  origami: {
    id: 'origami',
    name: 'Origami & Papier Découpé',
    icon: '📄',
    promptTemplate:
      'origami paper craft of {prompt}, layered folded paper art, delicate paper textures, soft ambient lighting, clean composition, artistic minimalism',
    negativePrompt: 'dark, photo, realistic skin, messy, noisy, blurry, painting, ugly',
  },
  isometric: {
    id: 'isometric',
    name: 'Isométrique 3D',
    icon: '📐',
    promptTemplate:
      'isometric miniature diorama of {prompt}, 3d isometric view, tilt-shift, cute voxel art, clean sharp edges, vibrant colors, ambient occlusion',
    negativePrompt: 'dark, perspective distortion, messy, deformed, ugly, blurry, flat 2d',
  },
};

/** Dictionnaire de traduction rapide des mots-clés fréquents FR/AR -> EN pour CLIP */
const KEYWORD_TRANSLATIONS: Array<[RegExp, string]> = [
  // Nettoyage des ordres conversationnels
  [/\b(tu\s+g[eé]n[eè]res?|g[eé]n[eè]re|peux-tu\s+g[eé]n[eè]rer|fais(-moi)?|cr[eé][eé]|dessine(-moi)?|affiche)\s+(une?\s+)?(photo|image|dessin|illustration|visuel|rendu)?\s*(d['’]|de\s+l['’]|de\s+la|du|des|d['’]un|d['’]une)?\b/gi, ''],
  [/\b(generate|create|draw|make|show\s+me)\s+(a\s+|an\s+)?(photo|image|picture|rendering|illustration)?\s*(of)?\b/gi, ''],
  [/\b(قم\s+بتوليد|أنشئ|ارسم|اعمل|أريد)\s+(صورة|رسمة|منظر)?\s*(لـ|ل)?\b/g, ''],

  // Architecture, Monuments & Bâtiments
  [/\b(amphi\s*th[eé][aâ]tre|amphith[eé][aâ]tre|colis[eé]e)\b/gi, 'ancient classical stone amphitheater with open-air arena seating'],
  [/\b(vue\s+de\s+l['’]ext[eé]rieur|vue\s+ext[eé]rieure|de\s+l['’]ext[eé]rieur)\b/gi, 'exterior panoramic wide angle view, bright daylight, clear sky'],
  [/\b(vue\s+de\s+l['’]int[eé]rieur|vue\s+int[eé]rieure|de\s+l['’]int[eé]rieur)\b/gi, 'interior architectural perspective view'],
  [/\b(monument|temple|ruines?)\b/gi, 'ancient classical stone monument ruins'],
  [/\b(pyramide|pyramides)\b/gi, 'ancient majestic pyramids in desert under blue sky'],
  [/\b(tour\s+eiffel)\b/gi, 'Eiffel tower in Paris, sunny clear day'],
  [/\b(ch[aâ]teau|palais|forteresse)\b/gi, 'magnificent medieval stone castle fortress'],
  [/\b(stade|ar[eè]ne)\b/gi, 'modern illuminated sports arena stadium'],
  [/\b(mus[eé]e|th[eé][aâ]tre)\b/gi, 'grand classical museum theatre building'],
  [/\b(mosqu[eé]e)\b/gi, 'magnificent classical mosque with minarets'],
  [/\b(cath[eé]drale|[eé]glise)\b/gi, 'grand gothic cathedral facade'],

  // Sujets / Animaux
  [/\b(chat|chaton|chats)\b/gi, 'cute cat'],
  [/\b(chien|chiot|chiens)\b/gi, 'happy dog'],
  [/\b(astronaute|cosmonaute)\b/gi, 'astronaut in space suit'],
  [/\b(lune)\b/gi, 'moon surface with stars'],
  [/\b(soleil|coucher de soleil)\b/gi, 'gorgeous golden sunset'],
  [/\b(mer|oc[eé]an|plage)\b/gi, 'ocean beach with turquoise waves and sunlight'],
  [/\b(for[eê]t|arbres|nature)\b/gi, 'enchanted lush green forest'],
  [/\b(montagne|montagnes)\b/gi, 'majestic snowy mountains peak under blue sky'],
  [/\b(ville|cit[eé]|immeubles)\b/gi, 'futuristic cityscape with modern architecture'],
  [/\b(voiture|automobile|v[eé]hicule)\b/gi, 'sleek luxury sports car vehicle'],
  [/\b(robot|cyborg|andro[iï]de)\b/gi, 'high-tech humanoid robot with polished metal'],
  [/\b(galaxie|espace|univers|cosmos)\b/gi, 'deep space colorful nebula galaxy with glowing stars'],
  [/\b(fleur|fleurs|rose|jardin)\b/gi, 'vibrant blooming flowers garden'],
  [/\b(femme|fille|dame)\b/gi, 'beautiful woman portrait with natural lighting'],
  [/\b(homme|gar[çc]on)\b/gi, 'handsome man portrait with natural lighting'],
  [/\b(dragon|cr[eé]ature)\b/gi, 'mythical majestic dragon with detailed scales'],
  [/\b(guerrier|chevalier|samoura[iï])\b/gi, 'legendary warrior knight in armor'],

  // Cybersécurité & Tech
  [/\b(tests?\s+intrusion|pentest|oscp)\b/gi, 'cybersecurity penetration testing offensive security lab, terminal consoles'],
  [/\b(hacking\s+[eé]thique|hacker\s+[eé]thique|piratage\s+[eé]thique)\b/gi, 'ethical hacker, cybersecurity operations room, high-tech monitors'],
  [/\b(serveurs?|data\s*center|salle\s+serveur)\b/gi, 'glowing datacenter server racks with led lights'],
  [/\b(ordinateurs?|multi-[\s\w]+[eé]crans?|[eé]crans?)\b/gi, 'advanced multi-monitor cybersecurity workstation setup'],

  // Personnages & Réalisme
  [/\b(personnes?\s+r[eé]elles?|vrais?\s+humains?|vrais?\s+personnes?)\b/gi, 'real authentic human beings, highly detailed photorealistic face, authentic skin pores and texture'],
  [/\b(pas\s+cartoon|non\s+cartoon|pas\s+de\s+dessin\s+anim[eé]|pas\s+d'animation)\b/gi, 'hyperrealistic photographic quality, non-cartoon, lifelike realism'],
  [/\b(africain|africaine|ivoirien|ivoirienne|afrique|d'ivoire)\b/gi, 'African person, natural photorealistic lighting'],
  [/\b(asiatique|caucasien|arabe|m[eé]tis)\b/gi, 'realistic human portrait'],

  // Directives d'exclusion de texte
  [/\b(sans\s+texte|pas\s+de\s+texte|pas\s+de\s+titre|[eé]viter\s+les\s+textes|aucun\s+texte)\b/gi, 'clean background without text or typography, no watermark'],

  // Termes Arabes
  [/\b(مسرح\s+مدرج|مدرج\s+روماني|كولوسيوم)\b/g, 'ancient classical stone amphitheater exterior view with arena seating'],
  [/\b(منظر\s+خارجي|من\s+الخارج)\b/g, 'exterior wide angle view, bright daylight'],
  [/\b(أمن\s+سيبراني|اختراق\s+أخلاقي|هاكر)\b/g, 'ethical cybersecurity hacker in high-tech lab with glowing monitors'],
  [/\b(قطة|قط|هر)\b/g, 'cute cat'],
  [/\b(كلب)\b/g, 'happy dog'],
  [/\b(رائد فضاء)\b/g, 'astronaut in space suit'],
  [/\b(القمر|قمر)\b/g, 'moon surface with stars'],
  [/\b(غروب|شمس)\b/g, 'golden hour sunset'],
  [/\b(بحر|محيط|شاطئ)\b/g, 'ocean beach with turquoise waves'],
  [/\b(غابة|طبيعة|أشجار)\b/g, 'lush enchanted green forest'],
  [/\b(جبل|جبال)\b/g, 'majestic snowy mountain peaks under blue sky'],
  [/\b(مدينة|عمارة|مباني)\b/g, 'futuristic modern city architecture'],
  [/\b(سيارة|مركبة)\b/g, 'sleek sports car vehicle'],
  [/\b(روبوت|آلي)\b/g, 'humanoid cyborg robot'],
  [/\b(قلعة|قصر)\b/g, 'grand majestic stone castle'],
  [/\b(فضاء|مجرة|نجوم)\b/g, 'deep space nebula galaxy with glowing stars'],
  [/\b(وردة|زهور|حديقة)\b/g, 'vibrant colorful flowers garden'],
  [/\b(تنين)\b/g, 'mythical majestic dragon'],
  [/\b(فارس|محارب)\b/g, 'epic fantasy warrior knight'],
  [/\b(شخص\s+حقيقي|واقعي|بدون\s+كرتون)\b/g, 'real human person, photorealistic portrait'],
  [/\b(بدون\s+نصوص|بدون\s+كتابة|بدون\s+عنوان)\b/g, 'clean visual without text, no watermark'],
];

export class FooocusEngine {
  /**
   * Traduit, nettoie et enrichit le prompt pour le modèle CLIP
   */
  static expandPrompt(prompt: string, styleId = 'cinematic'): { finalPrompt: string; finalNegative: string } {
    let clean = prompt.trim();

    // 1. Détection et remplacement des mots-clés FR/AR vers EN
    for (const [pattern, replacement] of KEYWORD_TRANSLATIONS) {
      clean = clean.replace(pattern, replacement);
    }

    // 2. Nettoyage des espaces superflus et ponctuation résiduelle
    clean = clean.replace(/\s+/g, ' ').replace(/^[\s,;.-]+|[\s,;.-]+$/g, '').trim();
    if (!clean) {
      clean = 'beautiful scenic landscape, crystal clear daylight, high quality';
    }

    // 3. Récupération du style Fooocus
    const style = FOOOCUS_STYLES[styleId] ?? FOOOCUS_STYLES.cinematic;

    // 4. Application du template de style Fooocus
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
      { label: 'Carré SDXL HD (1024x1024)', width: 1024, height: 1024, ratio: '1:1' },
      { label: 'Paysage Cinéma 16:9 (1152x896)', width: 1152, height: 896, ratio: '16:9' },
      { label: 'Portrait / Story (896x1152)', width: 896, height: 1152, ratio: '9:16' },
      { label: 'Photo Standard (1024x768)', width: 1024, height: 768, ratio: '4:3' },
      { label: 'Rapide SD 1.5 (512x512)', width: 512, height: 512, ratio: '1:1 SD' },
    ];
  }
}
