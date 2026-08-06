// Minimal inline l10n for the Copilot's deterministic strings (resolver summaries +
// edge-function templates). The LLM's free-text replies follow the owner's language via
// the system prompt; these templates are the non-LLM parts and must match that language.
// Pure functions, no I/O. Edge-Function-only.

export type CopilotLang = 'es' | 'en' | 'ca';

export function isCopilotLang(value: string): value is CopilotLang {
  return value === 'es' || value === 'en' || value === 'ca';
}

const DICT: Record<string, Record<CopilotLang, string>> = {
  confirm_needed: {
    es: 'Se necesita tu confirmación: {summary}',
    en: 'Your confirmation is needed: {summary}',
    ca: 'Cal la teva confirmació: {summary}',
  },
  applied: {
    es: '✔ Aplicado. {n} cambio(s) aplicado(s).',
    en: '✔ Applied. {n} change(s) applied.',
    ca: '✔ Aplicat. {n} canvi(s) aplicat(s).',
  },
  cancelled: {
    es: '✖ Acción cancelada. No se ha cambiado nada.',
    en: '✖ Action cancelled. Nothing was changed.',
    ca: "✖ Acció cancel·lada. No s'ha canviat res.",
  },
  preview_expired: {
    es: 'La vista previa ha caducado. Pide al Copilot que repita la acción',
    en: 'Preview expired. Ask the Copilot to repeat the action',
    ca: "La vista prèvia ha caducat. Demana al Copilot que repeteixi l'acció",
  },
  adjust_prices: {
    es: 'Ajustar precios de {n} plato(s){cats}{names}.',
    en: 'Adjust prices of {n} dish(es){cats}{names}.',
    ca: 'Ajustar preus de {n} plat(s){cats}{names}.',
  },
  in_categories: {
    es: ' en categorías que contienen "{c}"',
    en: ' in categories containing "{c}"',
    ca: ' en categories que contenen "{c}"',
  },
  with_names: {
    es: ' con nombres que contienen "{c}"',
    en: ' with names containing "{c}"',
    ca: ' amb noms que contenen "{c}"',
  },
  no_match_adjust: {
    es: 'Ningún plato coincide con el filtro. Nada que ajustar.',
    en: 'No dishes match the filter. Nothing to adjust.',
    ca: 'Cap plat coincideix amb el filtre. Res a ajustar.',
  },
  update_items: {
    es: 'Actualizar {n} plato(s) ({m} cambio(s)).',
    en: 'Update {n} dish(es) ({m} change(s)).',
    ca: 'Actualitzar {n} plat(s) ({m} canvi(s)).',
  },
  includes_hiding: {
    es: ' Incluye ocultar platos (is_active=false). No borrado físico.',
    en: ' Includes hiding dishes (is_active=false). No physical deletion.',
    ca: ' Inclou ocultar plats (is_active=false). No esborrat físic.',
  },
  no_change: {
    es: 'Ningún plato coincide o ningún cambio real. Nada que hacer.',
    en: 'No dishes match or no real change. Nothing to do.',
    ca: 'Cap plat coincideix o cap canvi real. Res a fer.',
  },
  menu_not_found: {
    es: 'No se encontró el menú destino. Di el nombre de un menú existente (usa get_menu_structure).',
    en: 'Target menu not found. Name an existing menu (use get_menu_structure).',
    ca: "No s'ha trobat el menú destí. Digues el nom d'un menú existent (usa get_menu_structure).",
  },
  category_exists: {
    es: 'La categoría "{name}" ya existe en el menú "{menu}".',
    en: 'The category "{name}" already exists in menu "{menu}".',
    ca: 'La categoria "{name}" ja existeix al menú "{menu}".',
  },
  create_category: {
    es: 'Crear categoría "{name}" en el menú "{menu}".',
    en: 'Create category "{name}" in menu "{menu}".',
    ca: 'Crear categoria "{name}" al menú "{menu}".',
  },
  target_category_not_found: {
    es: 'No se encontró la categoría destino. Da el nombre exacto de una categoría existente.',
    en: 'Target category not found. Give the exact name of an existing category.',
    ca: "No s'ha trobat la categoria destí. Dóna el nom exacte d'una categoria existent.",
  },
  dish_exists: {
    es: 'El plato "{name}" ya existe en "{cat}".',
    en: 'The dish "{name}" already exists in "{cat}".',
    ca: 'El plat "{name}" ja existeix a "{cat}".',
  },
  create_item: {
    es: 'Crear plato "{name}"{price} en "{cat}" (oculto hasta publicarlo).',
    en: 'Create dish "{name}"{price} in "{cat}" (hidden until published).',
    ca: 'Crear plat "{name}"{price} a "{cat}" (ocult fins a publicar-lo).',
  },
  price_suffix: {
    es: ' a {p} {currency}',
    en: ' at {p} {currency}',
    ca: ' a {p} {currency}',
  },
  dish_not_found: {
    es: 'No se encontró el plato. Usa search_items para encontrarlo.',
    en: 'Dish not found. Use search_items to locate it.',
    ca: "No s'ha trobat el plat. Usa search_items per trobar-lo.",
  },
  update_item: {
    es: 'Actualizar "{name}" ({m} cambio(s)).',
    en: 'Update "{name}" ({m} change(s)).',
    ca: 'Actualitzar "{name}" ({m} canvi(s)).',
  },
  category_not_found: {
    es: 'No se encontró la categoría. Usa get_menu_structure para verlas.',
    en: 'Category not found. Use get_menu_structure to list them.',
    ca: "No s'ha trobat la categoria. Usa get_menu_structure per veure-les.",
  },
  update_category: {
    es: 'Actualizar categoría "{name}" ({m} cambio(s)).',
    en: 'Update category "{name}" ({m} change(s)).',
    ca: 'Actualitzar categoria "{name}" ({m} canvi(s)).',
  },
  menu_not_found_plural: {
    es: 'No se encontró el menú. Usa get_menu_structure para verlos.',
    en: 'Menu not found. Use get_menu_structure to list them.',
    ca: "No s'ha trobat el menú. Usa get_menu_structure per veure'ls.",
  },
  update_menu: {
    es: 'Actualizar menú "{name}" ({m} cambio(s)).',
    en: 'Update menu "{name}" ({m} change(s)).',
    ca: 'Actualitzar menú "{name}" ({m} canvi(s)).',
  },
  menu_name_missing: {
    es: 'Falta el nombre del menú.',
    en: 'Menu name is missing.',
    ca: 'Falta el nom del menú.',
  },
  create_menu: {
    es: 'Crear menú "{name}"{copy}.',
    en: 'Create menu "{name}"{copy}.',
    ca: 'Crear menú "{name}"{copy}.',
  },
  copy_from: {
    es: ' copiando la estructura de otro menú',
    en: ' copying the structure from another menu',
    ca: " copiant l'estructura d'un altre menú",
  },
  generate_items: {
    es: 'Generar {n} plato(s) propuesto(s) en "{cat}". Se crearán OCULTOS (is_active=false) para que los revises antes de publicar.',
    en: 'Generate {n} proposed dish(es) in "{cat}". They will be created HIDDEN (is_active=false) so you can review them before publishing.',
    ca: 'Generar {n} plat(s) proposat(s) a "{cat}". Es crearan OCULTS (is_active=false) perquè els revisis abans de publicar.',
  },
  translate_items: {
    es: 'Traducir {n} plato(s) al "{lang}". Las traducciones se guardan solo tras tu confirmación.',
    en: 'Translate {n} dish(es) into "{lang}". Translations are only saved after your confirmation.',
    ca: 'Traduir {n} plat(s) al "{lang}". Les traduccions es guarden només després de la teva confirmació.',
  },
  translate_language_missing: {
    es: 'Falta el idioma destino (campo "language").',
    en: 'Target language missing (field "language").',
    ca: 'Falta l\'idioma destí (camp "language").',
  },
  translate_language_unsupported: {
    es: 'El idioma "{lang}" no está entre los idiomas del restaurante ({list}). Actívalo en Ajustes o usa uno de los existentes.',
    en: 'The language "{lang}" is not among the restaurant languages ({list}). Enable it in Settings or use an existing one.',
    ca: 'L\'idioma "{lang}" no és entre els idiomes del restaurant ({list}). Activa\'l a Configuració o fes servir un dels existents.',
  },
  not_generative: {
    es: 'Tool "{tool}" no es generativo',
    en: 'Tool "{tool}" is not generative',
    ca: 'La eina "{tool}" no és generativa',
  },
};

export function copilotT(lang: CopilotLang, key: string, vars?: Record<string, string | number>): string {
  const template = DICT[key]?.[lang];
  if (template === undefined) return key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}
