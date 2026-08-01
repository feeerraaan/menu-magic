// Typed function-calling definitions for the AI Restaurant Copilot (Phase 6). Edge-Function-only.
// These are the JSON-Schema tool definitions sent to the provider, plus helpers to build them.
// The EXECUTORS live in packages/ai/tools/executor.ts — the only code allowed to mutate the
// DB on the agent's behalf. See docs/FEATURE_SPECIFICATIONS.md §Phase 6 and docs/AI_ARCHITECTURE.md §3.

import type { LLMToolDefinition } from '../providers/types.ts';

const emptyObject = { type: 'object', properties: {} } as const;

const STRING = { type: 'string' } as const;
const NUMBER = { type: 'number' } as const;
const BOOLEAN = { type: 'boolean' } as const;
const stringArray = { type: 'array', items: STRING } as const;

// The union of every mutating tool name. Executors key off this to decide preview-vs-execute.
export const MUTATING_TOOLS = [
  'bulk_adjust_prices',
  'bulk_update_dietary_flags',
  'generate_new_items',
  'create_menu',
  'create_category',
  'create_item',
  'update_item',
  'update_category',
  'update_menu',
  'bulk_translate',
] as const;

export type MutatingToolName = (typeof MUTATING_TOOLS)[number];

export const READ_ONLY_TOOLS = ['search_items', 'get_menu_structure'] as const;
export type ReadOnlyToolName = (typeof READ_ONLY_TOOLS)[number];

// Destructive keywords the agent maps to soft-hide by default (see the hard rule in
// FEATURE_SPECIFICATIONS.md §Phase 6) — kept here for the executor/system prompt.
export const SOFT_HIDE_TOOLS = ['update_item', 'bulk_update_dietary_flags'] as const;

export const COPILOT_TOOLS: LLMToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'search_items',
      description:
        'Busca platos del menú con filtros opcionales. Solo lectura: devuelve items que coinciden, para orientarte antes de mutar.',
      parameters: {
        type: 'object',
        properties: {
          name_contains: { ...STRING, description: 'Fragmento del nombre del plato (insensible a mayúsculas)' },
          category_name_contains: { ...STRING, description: 'Fragmento del nombre de la categoría' },
          price_min: { ...NUMBER, description: 'Precio mínimo' },
          price_max: { ...NUMBER, description: 'Precio máximo' },
          is_vegetarian: BOOLEAN,
          is_vegan: BOOLEAN,
          is_spicy: BOOLEAN,
          is_gluten_free: BOOLEAN,
          is_active: { ...BOOLEAN, description: 'Filtrar por estado publicado. Por defecto se incluyen todos.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_menu_structure',
      description: 'Devuelve la estructura del menú (menús, categorías y conteo de platos) sin volcar todos los items. Útil para orientarse.',
      parameters: emptyObject,
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_adjust_prices',
      description:
        'Ajusta los precios de los platos que coinciden con el filtro, con un delta porcentual o absoluto, y opcionalmente redondeo. Requiere confirmación antes de aplicarse.',
      parameters: {
        type: 'object',
        properties: {
          category_name_filter: { ...STRING, description: 'Fragmento del nombre de categoría a afectar' },
          item_name_filter: { ...STRING, description: 'Fragmento del nombre del plato a afectar' },
          price_delta_percent: { ...NUMBER, description: 'Cambio porcentual, p.ej. 10 = +10%, -5 = -5%' },
          price_delta_absolute: { ...NUMBER, description: 'Cambio absoluto en la moneda del restaurante' },
          round_to: { ...NUMBER, description: 'Redondear a este número de decimales (opcional)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_update_dietary_flags',
      description:
        'Actualiza flags dietéticos (vegano, vegetariano, picante, sin gluten, activo) y/o alérgenos de los platos que coinciden con el filtro. Requiere confirmación. Para "quitar/eliminar" platos usa set.is_active=false (soft-hide), nunca DELETE.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'object',
            properties: {
              category_name_contains: STRING,
              name_contains: STRING,
              has_flag: { ...STRING, description: 'Filtrar por flag actual: is_vegan | is_vegetarian | is_spicy | is_gluten_free | is_active' },
            },
            required: [],
          },
          set: {
            type: 'object',
            properties: {
              is_active: BOOLEAN,
              is_vegan: BOOLEAN,
              is_vegetarian: BOOLEAN,
              is_gluten_free: BOOLEAN,
              is_spicy: BOOLEAN,
              allergens_add: { ...stringArray, description: 'Alérgenos a añadir' },
              allergens_remove: { ...stringArray, description: 'Alérgenos a quitar' },
            },
            required: [],
          },
        },
        required: ['filter', 'set'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_new_items',
      description:
        'Genera y crea platos nuevos en una categoría (por nombre o id) según un criterio. Los platos nuevos se crean SIEMPRE ocultos (is_active=false) para que el dueño los revise antes de publicar. Requiere confirmación.',
      parameters: {
        type: 'object',
        properties: {
          category_name_or_id: { ...STRING, description: 'Nombre o id de la categoría destino' },
          criteria: { ...STRING, description: 'Criterio de generación, p.ej. "añade 3 opciones veganas baratas"' },
          count: { ...NUMBER, description: 'Número de platos a generar (por defecto 1)' },
          price_hint: { ...NUMBER, description: 'Precio aproximado sugerido por plato' },
        },
        required: ['category_name_or_id', 'criteria'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_translate',
      description:
        'Traduce los platos/categorías seleccionados a un idioma objetivo usando el traductor IA. Requiere confirmación antes de escribir las traducciones.',
      parameters: {
        type: 'object',
        properties: {
          language: { ...STRING, description: 'Código del idioma destino, p.ej. "en", "de", "ca"' },
          category_name_contains: { ...STRING, description: 'Limitar a una categoría (opcional)' },
          name_contains: { ...STRING, description: 'Limitar por nombre de plato (opcional)' },
        },
        required: ['language'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_menu',
      description: 'Crea un menú nuevo (por ejemplo "menú de mediodía"). Requiere confirmación.',
      parameters: {
        type: 'object',
        properties: {
          name: STRING,
          description: STRING,
          copy_items_from_menu_id: { ...STRING, description: 'Id de otro menú del que copiar categorías/platos (opcional)' },
          is_active: { ...BOOLEAN, description: 'Por defecto true' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_category',
      description: 'Crea una categoría en un menú. Requiere confirmación.',
      parameters: {
        type: 'object',
        properties: {
          menu_id: { ...STRING, description: 'Id del menú donde crearla' },
          menu_name: { ...STRING, description: 'Nombre del menú si no conoces el id' },
          name: STRING,
          description: STRING,
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_item',
      description: 'Crea un plato nuevo en una categoría (por id o nombre). Requiere confirmación. Creado oculto (is_active=false) por defecto.',
      parameters: {
        type: 'object',
        properties: {
          category_id: STRING,
          category_name: STRING,
          name: STRING,
          description: STRING,
          price: NUMBER,
          is_vegetarian: BOOLEAN,
          is_vegan: BOOLEAN,
          is_spicy: BOOLEAN,
          is_gluten_free: BOOLEAN,
          allergens: stringArray,
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_item',
      description: 'Actualiza campos de un plato existente (resuelto por id o nombre). Para retirar un plato usa is_active=false. Requiere confirmación.',
      parameters: {
        type: 'object',
        properties: {
          item_id: STRING,
          item_name: STRING,
          set: {
            type: 'object',
            properties: {
              name: STRING,
              description: STRING,
              price: NUMBER,
              is_active: BOOLEAN,
              is_vegetarian: BOOLEAN,
              is_vegan: BOOLEAN,
              is_spicy: BOOLEAN,
              is_gluten_free: BOOLEAN,
              allergens: stringArray,
            },
            required: [],
          },
        },
        required: ['set'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_category',
      description: 'Actualiza el nombre/descripción de una categoría existente (por id o nombre). Requiere confirmación.',
      parameters: {
        type: 'object',
        properties: {
          category_id: STRING,
          category_name: STRING,
          set: {
            type: 'object',
            properties: { name: STRING, description: STRING },
            required: [],
          },
        },
        required: ['set'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_menu',
      description: 'Actualiza nombre/descripción/estado de un menú existente (por id o nombre). Requiere confirmación.',
      parameters: {
        type: 'object',
        properties: {
          menu_id: STRING,
          menu_name: STRING,
          set: {
            type: 'object',
            properties: { name: STRING, description: STRING, is_active: BOOLEAN },
            required: [],
          },
        },
        required: ['set'],
      },
    },
  },
];
