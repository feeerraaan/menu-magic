# Archivos de Traducción / Translation Files

## Descripción / Description

Esta carpeta contiene los archivos de traducción para MenuMagic en tres idiomas:

- **es.json** - Español (Spanish)
- **en.json** - Inglés (English)  
- **ca.json** - Catalán (Catalan)

Each translation file contains key-value pairs that map translation keys to their localized text.

## Estructura de Claves / Key Structure

Las claves de traducción están organizadas por secciones:

- `header` - Navegación superior del sitio
- `hero` - Sección principal/hero
- `features` - Características principales
- `pricing` - Información de precios
- `footer` - Pie de página
- `auth` - Autenticación (login, signup, etc.)
- `dashboard` - Panel de control
- `common` - Textos comunes
- `menu` - Textos relacionados con menús

## Uso / Usage

Para usar las traducciones en componentes, importa el hook `useTranslation`:

```tsx
import { useTranslation } from '@/hooks/useTranslation';

export default function MyComponent() {
  const { t } = useTranslation();

  return <h1>{t('header.signIn')}</h1>;
}
```

Puedes acceder a claves anidadas usando notación de punto: `t('section.key.subkey')`

## Agregar Nuevas Traducciones / Adding New Translations

1. Abre los tres archivos JSON (es.json, en.json, ca.json)
2. Agrega la nueva clave en la sección apropiada en los tres idiomas
3. Usa el hook `useTranslation` en tu componente

Ejemplo:
```json
{
  "mySection": {
    "myKey": "Mi valor en español"
  }
}
```

## Cambiar Idioma / Changing Language

El idioma se gestiona a través del `LanguageContext`. Usa `useLanguage()` para acceder y cambiar el idioma:

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
      <option value="es">Español</option>
      <option value="en">English</option>
      <option value="ca">Català</option>
    </select>
  );
}
```

## Idiomas Soportados / Supported Languages

Los idiomas soportados están configurados en `src/contexts/LanguageContext.tsx` en el parámetro `supportedLanguages` del `LanguageProvider`.

Actualmente están habilitados: **es, en, ca**
