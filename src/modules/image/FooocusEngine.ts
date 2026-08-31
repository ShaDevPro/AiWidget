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

/** Dictionnaire de traduction sémantique universelle FR/AR/EN pour CLIP & Fooocus */
const KEYWORD_TRANSLATIONS: Array<[RegExp, string]> = [
  // Nettoyage des ordres conversationnels et formules de politesse
  [/\b(tu\s+g[eé]n[eè]res?|g[eé]n[eè]re(s)?|peux-tu\s+g[eé]n[eè]rer|fais(-moi)?|cr[eé][eé](s)?|dessine(-moi)?|affiche|donne(-moi)?|cr[eé]ation\s+d['’]|g[eé]n[eé]ration\s+d['’])\s+(une?\s+)?(photo|image|dessin|illustration|visuel|rendu|tableau)?\s*(d['’]|de\s+l['’]|de\s+la|du|des|d['’]un|d['’]une)?\b/gi, ''],
  [/\b(generate|create|draw|make|show\s+me|paint|render)\s+(a\s+|an\s+)?(photo|image|picture|rendering|illustration|painting)?\s*(of)?\b/gi, ''],
  [/\b(قم\s+بتوليد|أنشئ|ارسم|اعمل|أريد|صور\s+لي|اعطني)\s+(صورة|رسمة|منظر)?\s*(لـ|ل)?\b/g, ''],

  // Angles, Perspectives & Vues spatiales (Extérieur / Intérieur / Drone)
  [/\(?\b(vue\s+(de\s+l['’]|d['’])ext[eé]rieur[e]?|vue\s+ext[eé]rieur[e]?|(de\s+l['’]|d['’])ext[eé]rieur[e]?|en\s+ext[eé]rieur|de\s+dehors|outside\s+view|exterior\s+view|exterior|outdoors?)\b\)?/gi, 'exterior wide angle shot from outside on street level, outdoor view of the outer building facade under sunny daylight, clear blue sky'],
  [/\(?\b(vue\s+(de\s+l['’]|d['’])int[eé]rieur[e]?|vue\s+int[eé]rieur[e]?|(de\s+l['’]|d['’])int[eé]rieur[e]?|en\s+int[eé]rieur|de\s+dedans|inside\s+view|interior\s+view|interior|indoors?)\b\)?/gi, 'interior architectural perspective shot from inside the hall, indoor space with ambient indoor lighting'],
  [/\(?\b(vue\s+a[eé]rienne|vue\s+du\s+ciel|par\s+drone|vue\s+d['’]en\s+haut|drone\s+shot|aerial\s+view|bird['’]s?\s+eye\s+view)\b\)?/gi, 'aerial drone photography from high above, breathtaking bird-eye view'],
  [/\(?\b(gros\s+plan|plan\s+rapproch[eé]|portrait\s+serr[eé]|close[-\s]?up|macro)\b\)?/gi, 'macro close-up highly detailed shot, sharp focal point'],
  [/\(?\b(contre[-\s]?plong[eé]e|low\s+angle)\b\)?/gi, 'dramatic low-angle shot looking up, majestic heroic perspective'],

  // Architecture, Monuments & Bâtiments
  [/\b(amphi\s*th[eé][aâ]tre|amphith[eé][aâ]tre|th[eé][aâ]tre\s+antique|colis[eé]e|ar[eè]nes?)\b/gi, 'ancient Roman stone amphitheatre, classical antique architecture, majestic outdoor facade, colonnades and arches'],
  [/\b(monument|temple|ruines?)\b/gi, 'ancient classical stone monument, magnificent ruins under clear sky'],
  [/\b(pyramide|pyramides)\b/gi, 'ancient majestic stone pyramids in desert under sunny blue sky'],
  [/\b(tour\s+eiffel)\b/gi, 'Eiffel tower in Paris, sunny clear daylight'],
  [/\b(ch[aâ]teau|palais|forteresse)\b/gi, 'grand medieval stone castle palace fortress, magnificent exterior architecture'],
  [/\b(stade|ar[eè]ne)\b/gi, 'modern illuminated architectural sports arena stadium'],
  [/\b(mus[eé]e|th[eé][aâ]tre)\b/gi, 'grand classical museum theatre building facade'],
  [/\b(mosqu[eé]e)\b/gi, 'magnificent classical mosque with domes and minarets'],
  [/\b(cath[eé]drale|[eé]glise)\b/gi, 'grand gothic stone cathedral exterior facade'],
  [/\b(gratte[-\s]?ciel|building|tour|tours)\b/gi, 'soaring modern glass skyscrapers, futuristic architecture'],

  // Sujets, Personnages & Réalisme
  [/\b(femme|fille|dame)\b/gi, 'beautiful woman, highly detailed photorealistic face, natural authentic skin texture'],
  [/\b(homme|gar[çc]on|monsieur)\b/gi, 'handsome man, highly detailed photorealistic portrait, natural skin texture'],
  [/\b(personnes?\s+r[eé]elles?|vrais?\s+humains?|vrais?\s+personnes?)\b/gi, 'real authentic human beings, highly detailed photorealistic face, authentic skin pores and texture'],
  [/\b(pas\s+cartoon|non\s+cartoon|pas\s+de\s+dessin\s+anim[eé]|pas\s+d'animation|pas\s+3d)\b/gi, 'hyperrealistic photographic quality, authentic photography, lifelike realism, 35mm film photo'],
  [/\b(astronaute|cosmonaute)\b/gi, 'astronaut in detailed space suit, helmet reflection'],
  [/\b(lune)\b/gi, 'moon surface with cosmic stars'],
  [/\b(coucher\s+de\s+soleil|golden\s+hour)\b/gi, 'dramatic golden hour sunset with warm glowing light'],
  [/\b(lever\s+de\s+soleil)\b/gi, 'peaceful sunrise with morning golden light'],
  [/\b(plein\s+jour|jour\s+ensoleill[eé]|soleil)\b/gi, 'bright sunny daylight, clear blue sky, natural sun illumination'],
  [/\b(nuit|nocturne)\b/gi, 'atmospheric nighttime scene, dramatic night lighting, stars and ambient city lights'],
  [/\b(mer|oc[eé]an|plage)\b/gi, 'ocean coastline beach with turquoise waves and sunlight'],
  [/\b(for[eê]t|arbres|nature)\b/gi, 'lush enchanted green nature forest'],
  [/\b(montagne|montagnes)\b/gi, 'majestic snowy mountain peaks under blue sky'],
  [/\b(voiture|automobile|v[eé]hicule)\b/gi, 'sleek luxury sports car vehicle, automotive photography'],
  [/\b(robot|cyborg|andro[iï]de)\b/gi, 'high-tech humanoid robot with polished metal and glowing fiber optics'],
  [/\b(galaxie|espace|univers|cosmos)\b/gi, 'deep space colorful nebula galaxy with glowing cosmic stars'],
  [/\b(chat|chaton|chats)\b/gi, 'cute domestic cat, detailed fur, sharp eyes'],
  [/\b(chien|chiot|chiens)\b/gi, 'playful happy dog, detailed fur, natural daylight'],
  [/\b(dragon|cr[eé]ature)\b/gi, 'mythical majestic dragon with detailed scales'],
  [/\b(guerrier|chevalier|samoura[iï])\b/gi, 'legendary warrior knight in armor'],

  // Cybersécurité & Tech
  [/\b(tests?\s+intrusion|pentest|oscp|hacking\s+[eé]thique|hacker\s+[eé]thique|piratage\s+[eé]thique)\b/gi, 'ethical cybersecurity engineer in high-tech security operations room, multi-monitor consoles with terminal data'],
  [/\b(serveurs?|data\s*center|salle\s+serveur)\b/gi, 'modern illuminated enterprise datacenter server racks with glowing blue LED lights'],

  // Directives d'exclusion
  [/\b(sans\s+texte|pas\s+de\s+texte|pas\s+de\s+titre|[eé]viter\s+les\s+textes|aucun\s+texte)\b/gi, 'clean background without text or typography, no watermark'],

  // Termes Arabes
  [/\b(مسرح\s+مدرج|مدرج\s+روماني|كولوسيوم|مدرج)\b/g, 'ancient Roman stone amphitheatre, classical antique architecture, majestic outdoor facade, colonnades and arches'],
  [/\b(منظر\s+خارجي|من\s+الخارج|في\s+الخارج)\b/g, 'exterior wide angle shot from outside on street level, outdoor view of the outer building facade under sunny daylight, clear blue sky'],
  [/\b(منظر\s+داخلي|من\s+الداخل|في\s+الداخل)\b/g, 'interior architectural perspective shot from inside the hall, indoor space with ambient indoor lighting'],
  [/\b(أمن\s+سيبراني|اختراق\s+أخلاقي|هاكر)\b/g, 'ethical cybersecurity hacker in high-tech lab with glowing monitors'],
  [/\b(قطة|قط|هر)\b/g, 'cute cat with detailed fur'],
  [/\b(كلب)\b/g, 'happy dog with detailed fur'],
  [/\b(غروب|شمس)\b/g, 'golden hour sunset with warm light'],
  [/\b(بحر|محيط|شاطئ)\b/g, 'ocean beach with turquoise waves and sunlight'],
  [/\b(غابة|طبيعة|أشجار)\b/g, 'lush enchanted green forest'],
  [/\b(جبل|جبال)\b/g, 'majestic snowy mountain peaks under blue sky'],
  [/\b(مدينة|عمارة|مباني)\b/g, 'futuristic modern city architecture'],
  [/\b(سيارة|مركبة)\b/g, 'sleek luxury sports car'],
  [/\b(روبوت|آلي)\b/g, 'humanoid cyborg robot with polished metal'],
  [/\b(قلعة|قصر)\b/g, 'grand majestic medieval stone castle palace'],
  [/\b(فضاء|مجرة|نجوم)\b/g, 'deep space nebula galaxy with glowing stars'],
  [/\b(شخص\s+حقيقي|واقعي|بدون\s+كرتون)\b/g, 'real human person, highly detailed photorealistic portrait, authentic skin texture'],
  [/\b(بدون\s+نصوص|بدون\s+كتابة|بدون\s+عنوان)\b/g, 'clean visual without text, no watermark'],
];

export class FooocusEngine {
  /**
   * Traduit, nettoie et enrichit le prompt pour le modèle CLIP avec injection négative dynamique
   */
  static expandPrompt(prompt: string, styleId = 'cinematic'): { finalPrompt: string; finalNegative: string } {
    let clean = prompt.trim();

    // 1. Détection spatiale préalable pour l'injection négative dynamique
    const lowerPrompt = clean.toLowerCase();
    const isExterior = /ext[eé]rieur|outside|outdoor|outdoors|fa[çc]ade|street|dehors|open[-\s]air|خارجي|من\s*الخارج/.test(lowerPrompt);
    const isInterior = /int[eé]rieur|inside|indoor|indoors|hall|room|dedans|داخلي|من\s*الداخل/.test(lowerPrompt);

    // 2. Nettoyage des parenthèses superflues
    clean = clean.replace(/[()]/g, ' ');

    // 3. Détection et remplacement des mots-clés FR/AR vers EN
    for (const [pattern, replacement] of KEYWORD_TRANSLATIONS) {
      clean = clean.replace(pattern, replacement);
    }

    // 4. Nettoyage des espaces superflus et ponctuation résiduelle
    clean = clean.replace(/\s+/g, ' ').replace(/^[\s,;.-]+|[\s,;.-]+$/g, '').trim();
    if (!clean) {
      clean = 'beautiful scenic landscape, crystal clear daylight, high quality, 8k';
    }

    // 5. Récupération du style Fooocus
    const style = FOOOCUS_STYLES[styleId] ?? FOOOCUS_STYLES.cinematic;

    // 6. Application du template de style Fooocus
    const finalPrompt = style.promptTemplate.replace('{prompt}', clean);

    // 7. Injection Négative Dynamique Contextuelle (Anti-Hallucination Extérieur/Intérieur)
    let finalNegative = style.negativePrompt;
    if (isExterior) {
      finalNegative = `indoors, interior, inside view, indoor room, enclosed space, indoor arena, indoor seating, auditorium, ceiling, ${finalNegative}`;
    } else if (isInterior) {
      finalNegative = `outdoors, exterior, outside view, street, open sky, clouds, landscape, ${finalNegative}`;
    }

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
