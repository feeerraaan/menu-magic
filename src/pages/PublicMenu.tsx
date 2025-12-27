import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Menu, Category, Item, ScheduleRule } from '@/types/database';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { Language, languages, t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { isMenuAvailable } from '@/components/dashboard/MenuScheduleEditor';
import { 
  Leaf, 
  Flame, 
  Wheat, 
  MapPin, 
  Phone,
  ChevronDown,
  AlertCircle,
  ChefHat,
  Wine
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicMenuData {
  restaurant: Restaurant;
  menu: Menu;
  categories: (Category & { items: Item[] })[];
  canShowLanguageSelector: boolean; // true if plan supports multiple languages
}

function MenuContent({ data }: { data: PublicMenuData }) {
  const { restaurant, categories, canShowLanguageSelector } = data;
  const { language, setLanguage } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const { t } = useTranslation();
  const navRef = useRef<HTMLElement>(null);

  // Track view with throttling to prevent analytics abuse
  const trackedViews = useRef(new Set<string>());
  
  useEffect(() => {
    const viewKey = `${restaurant.id}-${language}`;
    if (!trackedViews.current.has(viewKey)) {
      supabase.from('menu_views').insert({
        restaurant_id: restaurant.id,
        language: language,
      }).then(() => {});
      trackedViews.current.add(viewKey);
    }
  }, [restaurant.id, language]);

  // Featured items
  const featuredItems = categories.flatMap(c => c.items.filter(i => i.is_featured && i.is_active));

  // Get translated content
  const getItemName = (item: Item) => {
    if (language === restaurant.default_language) return item.name;
    const translation = item.translations?.find(t => t.language === language);
    return translation?.name || item.name;
  };

  const getItemDescription = (item: Item) => {
    if (language === restaurant.default_language) return item.description;
    const translation = item.translations?.find(t => t.language === language);
    return translation?.description || item.description;
  };

  const getCategoryName = (category: Category) => {
    if (language === restaurant.default_language) return category.name;
    const translation = category.translations?.find(t => t.language === language);
    return translation?.name || category.name;
  };

  // Scroll spy for active category
  useEffect(() => {
    const handleScroll = () => {
      const navHeight = navRef.current?.offsetHeight || 0;
      let current: string | null = null;
      
      for (const cat of categories) {
        const el = categoryRefs.current[cat.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= navHeight + 100) {
            current = cat.id;
          }
        }
      }
      setActiveCategory(current);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const scrollToCategory = (categoryId: string) => {
    const el = categoryRefs.current[categoryId];
    const navHeight = navRef.current?.offsetHeight || 0;
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || restaurant.hide_prices) return null;
    const symbol = restaurant.currency === 'EUR' ? '€' : restaurant.currency === 'GBP' ? '£' : '$';
    return `${symbol}${price.toFixed(2)}`;
  };

  const supportedLangs = canShowLanguageSelector 
    ? languages.filter(l => restaurant.supported_languages.includes(l.code))
    : [];
  const currentLang = languages.find(l => l.code === language);

  return (
    <div className={cn(
      'min-h-screen bg-white dark:bg-slate-950',
      restaurant.theme === 'dark' && 'dark'
    )}>
      {/* Elegant Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          {/* Logo and Restaurant Info */}
          <div className="max-w-2xl">
            {restaurant.logo_url && (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name} 
                className="h-16 w-16 rounded-lg object-cover mb-4"
              />
            )}
            <h1 className="font-serif text-4xl sm:text-5xl font-light text-slate-900 dark:text-white mb-2">
              {restaurant.name}
            </h1>
            {restaurant.address && (
              <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4" /> {restaurant.address}
              </p>
            )}
            {restaurant.phone && (
              <p className="text-slate-600 dark:text-slate-400 flex items-center gap-2 mb-4">
                <Phone className="h-4 w-4" /> {restaurant.phone}
              </p>
            )}
          </div>
          
          {/* Language Selector - Prominent Position */}
          {supportedLangs.length > 1 && (
            <div className="relative mt-6 w-fit">
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                className="gap-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="text-lg">🌐</span>
                <span className="font-medium">{currentLang?.name}</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showLanguageMenu && "rotate-180"
                )} />
              </Button>
              {showLanguageMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                  <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 min-w-[160px]">
                    {supportedLangs.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLanguageMenu(false);
                        }}
                        className={cn(
                          'w-full px-4 py-3 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3',
                          language === lang.code && 'bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white'
                        )}
                      >
                        {language === lang.code && <span className="text-emerald-500">✓</span>}
                        <span className={language !== lang.code ? 'ml-6' : ''}>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Sticky Category Navigation - Minimalist */}
      <nav 
        ref={navRef}
        className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800"
      >
        <div className="container mx-auto px-4">
          <div className="flex gap-6 py-4 overflow-x-auto scrollbar-hide">
            {categories.filter(c => c.is_active).map(category => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={cn(
                  'text-sm font-medium whitespace-nowrap transition-colors pb-3 border-b-2 -mb-4',
                  activeCategory === category.id
                    ? 'text-slate-900 dark:text-white border-slate-900 dark:border-white'
                    : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                {getCategoryName(category)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 pb-safe-bottom overflow-x-hidden max-w-4xl">
        {/* Featured Items */}
        {featuredItems.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700"></div>
              <h2 className="font-serif text-2xl text-slate-900 dark:text-white">{t('menu.featured')}</h2>
              <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700"></div>
            </div>
            <div className="grid gap-4 md:gap-6">
              {featuredItems.map(item => (
                <FeaturedItemCard 
                  key={item.id} 
                  item={item} 
                  getName={getItemName}
                  getDescription={getItemDescription}
                  formatPrice={formatPrice}
                  restaurantId={restaurant.id}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {categories.filter(c => c.is_active).map(category => (
          <section
            key={category.id}
            ref={(el) => { if (el) categoryRefs.current[category.id] = el; }}
            className="mb-16 scroll-mt-32"
          >
            <h2 className="font-serif text-2xl text-slate-900 dark:text-white mb-6 pb-3 border-b border-slate-200 dark:border-slate-800">
              {getCategoryName(category)}
            </h2>
            <div className="space-y-6">
              {category.items.filter(i => i.is_active).map(item => (
                <MenuItemCard 
                  key={item.id} 
                  item={item}
                  getName={getItemName}
                  getDescription={getItemDescription}
                  formatPrice={formatPrice}
                  restaurantId={restaurant.id}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
              {category.items.filter(i => i.is_active).length === 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4">{t('menu.noItems')}</p>
              )}
            </div>
          </section>
        ))}
      </main>

      {/* Item Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white dark:bg-slate-950">
          {selectedItem && (
            <>
              {/* Large Image */}
              {selectedItem.photo_url && (
                <div className="relative w-full">
                  <img 
                    src={selectedItem.photo_url} 
                    alt={getItemName(selectedItem)}
                    className="w-full max-h-[50vh] object-contain bg-slate-100 dark:bg-slate-900"
                  />
                </div>
              )}
              
              <div className="p-6 sm:p-8">
                {/* Header with name and price */}
                <div className="mb-6">
                  <h2 className="font-serif text-3xl font-light text-slate-900 dark:text-white mb-4">
                    {getItemName(selectedItem)}
                  </h2>
                  
                  {/* Dietary badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {selectedItem.is_vegetarian && (
                      <Badge variant="outline" className="gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        <Leaf className="h-3 w-3" /> {t('menu.vegetarian')}
                      </Badge>
                    )}
                    {selectedItem.is_vegan && (
                      <Badge variant="outline" className="gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        <Leaf className="h-3 w-3 fill-current" /> {t('menu.vegan')}
                      </Badge>
                    )}
                    {selectedItem.is_spicy && (
                      <Badge variant="outline" className="gap-1 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                        <Flame className="h-3 w-3" /> {t('menu.spicy')}
                      </Badge>
                    )}
                    {selectedItem.is_gluten_free && (
                      <Badge variant="outline" className="gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                        <Wheat className="h-3 w-3" /> {t('menu.glutenFree')}
                      </Badge>
                    )}
                  </div>

                  {/* Price */}
                  {formatPrice(selectedItem.price) && (
                    <span className="font-serif text-3xl font-light text-slate-900 dark:text-white">
                      {formatPrice(selectedItem.price)}
                    </span>
                  )}
                </div>
                
                {/* Description */}
                {getItemDescription(selectedItem) && (
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-base">
                    {getItemDescription(selectedItem)}
                  </p>
                )}
                
                {/* Allergens */}
                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-4">
                    <AlertCircle className="h-5 w-5 mt-0.5 text-orange-600 dark:text-orange-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{t('menu.allergens')}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedItem.allergens.join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500 dark:text-slate-400 mt-16">
        <p>{t('footer.copyright', { year: new Date().getFullYear().toString() })}</p>
      </footer>
    </div>
  );
}

interface ItemCardProps {
  item: Item;
  getName: (item: Item) => string;
  getDescription: (item: Item) => string | null;
  formatPrice: (price: number | null) => string | null;
  restaurantId: string;
  onSelect?: () => void;
}

// Use a module-level set to track viewed items across all ItemCard instances
const trackedItemViews = new Set<string>();

// Featured Item Card - Horizontal layout with emphasis
function FeaturedItemCard({ item, getName, getDescription, formatPrice, restaurantId, onSelect }: ItemCardProps) {
  const price = formatPrice(item.price);
  const description = getDescription(item);

  const handleClick = () => {
    const viewKey = `${restaurantId}-${item.id}`;
    if (!trackedItemViews.has(viewKey)) {
      supabase.from('menu_views').insert({
        restaurant_id: restaurantId,
        item_id: item.id,
      }).then(() => {});
      trackedItemViews.add(viewKey);
    }
    onSelect?.();
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6 transition-all hover:shadow-md cursor-pointer hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div className="flex gap-6">
        {/* Photo */}
        {item.photo_url && (
          <div className="shrink-0">
            <img 
              src={item.photo_url} 
              alt={getName(item)}
              className="h-32 w-32 rounded-lg object-cover"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-serif text-xl font-light text-slate-900 dark:text-white">
              {getName(item)}
            </h3>
            {price && (
              <span className="font-serif text-lg text-slate-900 dark:text-white shrink-0">{price}</span>
            )}
          </div>
          
          {/* Dietary Icons */}
          <div className="flex items-center gap-1.5 mb-3">
            {item.is_vegetarian && (
              <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                <Leaf className="h-3 w-3" />
              </Badge>
            )}
            {item.is_vegan && (
              <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                <Leaf className="h-3 w-3 fill-current" /> 
              </Badge>
            )}
            {item.is_spicy && (
              <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                <Flame className="h-3 w-3" />
              </Badge>
            )}
            {item.is_gluten_free && (
              <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                <Wheat className="h-3 w-3" />
              </Badge>
            )}
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-5">{description}</p>
          )}
          
          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {item.allergens.map((allergen) => (
                <Badge 
                  key={allergen} 
                  variant="outline" 
                  className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 text-sm py-1.5"
                >
                  ⚠️ {allergen}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Menu Item Card - Compact layout
function MenuItemCard({ item, getName, getDescription, formatPrice, restaurantId, onSelect }: ItemCardProps) {
  const price = formatPrice(item.price);
  const description = getDescription(item);

  const handleClick = () => {
    const viewKey = `${restaurantId}-${item.id}`;
    if (!trackedItemViews.has(viewKey)) {
      supabase.from('menu_views').insert({
        restaurant_id: restaurantId,
        item_id: item.id,
      }).then(() => {});
      trackedItemViews.add(viewKey);
    }
    onSelect?.();
  };

  return (
    <div 
      onClick={handleClick}
      className="group transition-all hover:bg-slate-50 dark:hover:bg-slate-900/50 p-4 -mx-4 rounded-lg cursor-pointer"
    >
      <div className="flex gap-4">
        {/* Photo */}
        {item.photo_url && (
          <div className="shrink-0">
            <img 
              src={item.photo_url} 
              alt={getName(item)}
              className="h-20 w-20 rounded-lg object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h3 className="font-serif text-lg text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
              {getName(item)}
            </h3>
            
            {/* Price */}
            {price && (
              <span className="font-serif text-lg text-slate-900 dark:text-white shrink-0">{price}</span>
            )}
          </div>
          
          {/* Dietary Icons - Compact */}
          {(item.is_vegetarian || item.is_vegan || item.is_spicy || item.is_gluten_free) && (
            <div className="flex items-center gap-1 mt-1.5">
              {item.is_vegetarian && (
                <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <Leaf className="h-3 w-3" />
                </Badge>
              )}
              {item.is_vegan && (
                <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                  <Leaf className="h-3 w-3 fill-current" />
                </Badge>
              )}
              {item.is_spicy && (
                <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800">
                  <Flame className="h-3 w-3" />
                </Badge>
              )}
              {item.is_gluten_free && (
                <Badge variant="outline" className="h-5 px-1.5 text-xs gap-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                  <Wheat className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}
          
          {/* Description */}
          {description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">{description}</p>
          )}
          
          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {item.allergens.map((allergen) => (
                <Badge 
                  key={allergen} 
                  variant="outline" 
                  className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 text-xs py-1"
                >
                  ⚠️ {allergen}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PublicMenu() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicMenuData | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchMenu() {
      if (!slug) {
        setError('Menu not found');
        setLoading(false);
        return;
      }

      try {
        // Fetch restaurant - explicitly select public fields only (exclude owner_id, custom_domain)
        const { data: restaurant, error: restError } = await supabase
          .from('restaurants')
          .select('id, name, slug, logo_url, address, phone, instagram_url, website_url, currency, default_language, supported_languages, hide_prices, theme, is_published, onboarding_completed, created_at, updated_at, template')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle();

        if (restError) throw restError;
        if (!restaurant) {
          setError('Menu not found');
          setLoading(false);
          return;
        }
        
        // Cast to Restaurant type with owner_id as undefined (not used in public view)
        const restaurantData: Restaurant = {
          id: restaurant.id,
          owner_id: '',
          name: restaurant.name,
          slug: restaurant.slug,
          logo_url: restaurant.logo_url,
          address: restaurant.address,
          phone: restaurant.phone,
          instagram_url: restaurant.instagram_url,
          website_url: restaurant.website_url,
          currency: restaurant.currency,
          default_language: restaurant.default_language,
          supported_languages: restaurant.supported_languages,
          hide_prices: restaurant.hide_prices,
          theme: restaurant.theme as 'light' | 'dark',
          template: restaurant.template,
          custom_domain: null,
          is_published: restaurant.is_published,
          onboarding_completed: restaurant.onboarding_completed,
          created_at: restaurant.created_at,
          updated_at: restaurant.updated_at,
        };

        // Fetch active menus
        const { data: menus, error: menuError } = await supabase
          .from('menus')
          .select('*')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_active', true)
          .order('display_order');

        if (menuError) throw menuError;
        if (!menus || menus.length === 0) {
          setError('No menu available');
          setLoading(false);
          return;
        }

        // Find the first menu that is available based on schedule
        const availableMenu = menus.find(m => {
          const scheduleRules = m.schedule_rules as unknown as ScheduleRule[] | null;
          return isMenuAvailable(scheduleRules);
        });

        if (!availableMenu) {
          setError('Menu not available at this time');
          setLoading(false);
          return;
        }

        const menu = availableMenu;

        // Fetch categories with items
        const { data: categoriesData, error: catError } = await supabase
          .from('categories')
          .select(`
            *,
            category_translations(*),
            items(
              *,
              item_translations(*)
            )
          `)
          .eq('menu_id', menu.id)
          .eq('is_active', true)
          .order('display_order');

        if (catError) throw catError;

        const categories = (categoriesData || []).map(cat => ({
          ...cat,
          translations: cat.category_translations,
          items: ((cat.items as any[]) || [])
            .filter((i: any) => i.is_active)
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((item: any) => ({
              ...item,
              translations: item.item_translations,
            })),
        })) as (Category & { items: Item[] })[];

        // Show language selector if restaurant has multiple languages configured
        // (The plan check is done in settings - if they have multiple languages, the plan allows it)
        const canShowLanguageSelector = restaurantData.supported_languages.length > 1;

        setData({
          restaurant: restaurantData,
          menu: menu as unknown as Menu,
          categories,
          canShowLanguageSelector,
        });
      } catch (e: unknown) {
        if (import.meta.env.DEV) {
          console.error('Error fetching menu:', e);
        }
        setError('Failed to load menu');
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="font-display text-2xl font-bold mb-2">{t('common.menuUnavailable')}</h1>
          <p className="text-muted-foreground">{error || t('common.menuNotAvailable')}</p>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider 
      defaultLanguage={data.restaurant.default_language as Language}
      supportedLanguages={data.restaurant.supported_languages}
    >
      <MenuContent data={data} />
    </LanguageProvider>
  );
}