export const NATIVE_SKIP_PREFIXES = [
  "assets/clubs",
  "assets/flags",
  "assets/icons/patreon.svg",
  "src/data/logos.js",
  "src/runtime/productAnalytics.js",
  "src/state/diagnostics.js",
  "src/legacy",
];

const FLAG_CODES = Object.freeze({
  DE: "DE",
  ENGLAND: "EN",
  ES: "ES",
  GB: "EN",
  IT: "IT",
  JP: "JP",
  TR: "TR",
});

export const NATIVE_TEXT_EXTENSIONS = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".webmanifest",
  ".svg",
]);

export function isNativeSkipped(relativePath) {
  const value = relativePath.replace(/\\/g, "/");
  return NATIVE_SKIP_PREFIXES.some(
    (prefix) => value === prefix || value.startsWith(`${prefix}/`),
  );
}

export function transformNativeText(text) {
  const genericCountryMarkup = text.replace(
    /<img\s+src=["']assets\/flags\/([^"']+)["']\s+alt=["'][^"']*["'](?:\s+aria-hidden=["']true["'])?\s*>/gi,
    (_, file) => {
      const key = String(file).split(/[./]/)[0].toUpperCase();
      const code = FLAG_CODES[key] || key.slice(0, 3) || "--";
      return `<span class="generic-country-code" aria-hidden="true">${code}</span>`;
    },
  );
  const replacements = [
    [/FA Cup/g, "England Cup"],
    [/Copa del Rey/g, "Spain Cup"],
    [/Coppa Italia/g, "Italy Cup"],
    [/DFB-Pokal/g, "Germany Cup"],
    [/Emperor(?:'|\u2019)?s Cup/g, "Japan Cup"],
    [/Copa del Emperador/g, "Copa de Japón"],
    [/Kaiserpokal/g, "Japan-Pokal"],
    [/Coppa dell'Imperatore/g, "Coppa del Giappone"],
    [/Türkiye Kupası/g, "Türkiye Ulusal Kupası"],
    [/TÜRKİYE KUPASI/g, "TÜRKİYE ULUSAL KUPASI"],
    [/Turkish Cup/g, "Türkiye National Cup"],
    [/TURKISH CUP/g, "TÜRKİYE NATIONAL CUP"],
    [/Süper Lig \+ 1\. Lig/g, "Türkiye üst ve alt ligleri"],
    [/FM26/g, "copa.life"],
    [/Football Manager/g, "third-party game"],
    [/Patreon/g, "Support"],
    [/url\(["']?\.\.\/\.\.\/assets\/icons\/patreon\.svg["']?\)/gi, "none"],
  ];

  return replacements
    .reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), genericCountryMarkup)
    .replace(/var CONTACT_FORM_KEY="[^"]*";/g, 'var CONTACT_FORM_KEY="";');
}

// Backward-compatible names keep the Android release tooling stable while both
// native stores consume one rights/content policy.
export const ANDROID_SKIP_PREFIXES = NATIVE_SKIP_PREFIXES;
export const ANDROID_TEXT_EXTENSIONS = NATIVE_TEXT_EXTENSIONS;
export const isAndroidSkipped = isNativeSkipped;
export const transformAndroidText = transformNativeText;
