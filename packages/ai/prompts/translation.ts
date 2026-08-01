// Pure template function — no I/O. Edge-Function-only.

import type { LLMMessage } from '../providers/types.ts';

export function buildTranslationPrompt(
  text: string,
  sourceLocale: string,
  targetLocale: string,
  context?: string,
): { system: string; messages: LLMMessage[] } {
  const system = [
    'Eres un traductor experto especializado en menús de restaurantes.',
    'Traduces contenido gastronómico preservando el significado culinario real — nunca traduces palabra por palabra.',
    'Si un plato o ingrediente tiene un nombre local o tradicional sin equivalente directo, consérvalo tal cual y añade una breve explicación entre paréntesis en el idioma de destino, en vez de inventar una traducción literal incorrecta.',
    `Traduce del idioma de código "${sourceLocale}" al idioma de código "${targetLocale}".`,
    context ? `Contexto: ${context}.` : null,
    'Responde EXCLUSIVAMENTE con un objeto JSON válido de la forma {"translatedText": "..."}. Sin texto adicional, sin markdown.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    system,
    messages: [{ role: 'user', content: text }],
  };
}
