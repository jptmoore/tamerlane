import { availableLanguages } from '../config/appConfig.ts';

// Utility to extract available languages from IIIF annotations
export function extractLanguagesFromAnnotations(
  annotations: Array<any>,
): Array<{ code: string; name: string }> {
  const langSet = new Set<string>();

  annotations.forEach((anno) => {
    // Check body for language maps
    if (anno && anno.body) {
      // If body is an array, check each item
      const bodies = Array.isArray(anno.body) ? anno.body : [anno.body];
      bodies.forEach((body) => {
        // IIIF language map: { en: ["text"], de: ["text"] }
        if (typeof body.value === 'object' && body.value !== null) {
          Object.keys(body.value).forEach((lang) => langSet.add(lang));
        }
        // If body has a language property
        if (body.language) {
          langSet.add(body.language);
        }
      });
    }
    // Check label for language maps (optional)
    if (anno && anno.label && typeof anno.label === 'object') {
      Object.keys(anno.label).forEach((lang) => langSet.add(lang));
    }
  });

  // Build language code-to-name map from config
  const langNameMap: Record<string, string> = {};
  availableLanguages.forEach((lang) => {
    langNameMap[lang.code] = lang.name;
  });

  return Array.from(langSet).map((code) => ({
    code,
    name: langNameMap[code] || code,
  }));
}
