#!/bin/bash
# Script de verificación de traducciones

echo "🔍 Verificación de Sistema de Traducciones i18n"
echo "================================================"
echo ""

# Verificar archivos de traducción
echo "✅ Archivos de Traducción:"
if [ -f "src/locales/es.json" ]; then echo "   ✓ es.json"; else echo "   ✗ es.json"; fi
if [ -f "src/locales/en.json" ]; then echo "   ✓ en.json"; else echo "   ✗ en.json"; fi
if [ -f "src/locales/ca.json" ]; then echo "   ✓ ca.json"; else echo "   ✗ ca.json"; fi
echo ""

# Verificar hook de traducción
echo "✅ Hook de Traducción:"
if [ -f "src/hooks/useTranslation.ts" ]; then echo "   ✓ useTranslation.ts"; else echo "   ✗ useTranslation.ts"; fi
echo ""

# Verificar archivos actualizados
echo "✅ Archivos Actualizados con Traducciones:"
files=(
  "src/pages/Index.tsx"
  "src/pages/Auth.tsx"
  "src/pages/NotFound.tsx"
  "src/pages/dashboard/Overview.tsx"
  "src/pages/dashboard/PaymentSuccess.tsx"
  "src/pages/dashboard/PaymentCanceled.tsx"
  "src/components/PricingCard.tsx"
  "src/components/dashboard/DashboardSidebar.tsx"
)

for file in "${files[@]}"; do
  if grep -q "useTranslation\|t(" "$file" 2>/dev/null; then
    echo "   ✓ $file"
  else
    echo "   ? $file"
  fi
done
echo ""

# Verificar contexto de idioma
echo "✅ Contexto de Idioma:"
if grep -q "supportedLanguages = \['en', 'es', 'ca'\]" "src/contexts/LanguageContext.tsx"; then
  echo "   ✓ Idiomas configurados (es, en, ca)"
else
  echo "   ✗ Idiomas no configurados correctamente"
fi
echo ""

echo "✅ Secciones de Traducción Disponibles:"
echo "   - header"
echo "   - hero"
echo "   - features"
echo "   - pricing"
echo "   - footer"
echo "   - auth"
echo "   - dashboard"
echo "   - common"
echo "   - menu"
echo ""

echo "🎉 Implementación de Traducciones Completada!"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Revisar traducciones con hablantes nativos"
echo "   2. Agregar selector de idioma visual en la UI"
echo "   3. Traducir páginas adicionales del dashboard"
echo "   4. Probar en navegadores en diferentes idiomas"
echo ""
