import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, Menu, Category, Item } from '@/types/database';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { Language, languages, getBrowserLanguage, t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Leaf, 
  Flame, 
  Wheat, 
  Star, 
  MapPin, 
  Phone, 
  Instagram, 
  Globe,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicMenuData {
  restaurant: Restaurant;
  menu: Menu;
  categories: (Category & { items: Item[] })[];
}

function MenuContent({ data }: { data: PublicMenuData }) {
  const { restaurant, categories } = data;
  const { language, setLanguage, t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLElement>(null);

  // Track view
  useEffect(() => {
    supabase.from('menu_views').insert({
      restaurant_id: restaurant.id,
      language: language,
    }).then(() => {});
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

  const supportedLangs = languages.filter(l => restaurant.supported_languages.includes(l.code));
  const currentLang = languages.find(l => l.code === language);

  return (
    <div className={cn(
      'min-h-screen',
      restaurant.theme === 'dark' ? 'dark bg-background text-foreground' : 'bg-background text-foreground'
    )}>
      {/* Header */}
      <header className="relative bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {restaurant.logo_url && (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name} 
                  className="h-12 w-12 rounded-full object-cover"
                />
              )}
              <div>
                <h1 className="font-display text-2xl font-bold">{restaurant.name}</h1>
                {restaurant.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {restaurant.address}
                  </p>
                )}
              </div>
            </div>
            
            {/* Language Selector */}
            {supportedLangs.length > 1 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="gap-2"
                >
                  <span>{currentLang?.flag}</span>
                  <span className="hidden sm:inline">{currentLang?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {showLanguageMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLanguageMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                      {supportedLangs.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setLanguage(lang.code);
                            setShowLanguageMenu(false);
                          }}
                          className={cn(
                            'w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors',
                            language === lang.code && 'bg-accent'
                          )}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Contact Links */}
          <div className="flex gap-4 mt-4">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-5 w-5" />
              </a>
            )}
            {restaurant.instagram_url && (
              <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {restaurant.website_url && (
              <a href={restaurant.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                <Globe className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Category Navigation */}
      <nav 
        ref={navRef}
        className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border"
      >
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
            {categories.filter(c => c.is_active).map(category => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  activeCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                {getCategoryName(category)}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6 pb-safe-bottom">
        {/* Featured Items */}
        {featuredItems.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-warning fill-warning" />
              {t('menu.featured')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredItems.map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  getName={getItemName}
                  getDescription={getItemDescription}
                  formatPrice={formatPrice}
                  restaurantId={restaurant.id}
                  featured
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
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4 sticky top-[60px] bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 z-20">
              {getCategoryName(category)}
            </h2>
            <div className="space-y-3">
              {category.items.filter(i => i.is_active).map(item => (
                <ItemCard 
                  key={item.id} 
                  item={item}
                  getName={getItemName}
                  getDescription={getItemDescription}
                  formatPrice={formatPrice}
                  restaurantId={restaurant.id}
                />
              ))}
              {category.items.filter(i => i.is_active).length === 0 && (
                <p className="text-muted-foreground text-center py-4">{t('menu.noItems')}</p>
              )}
            </div>
          </section>
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>Powered by MenuYa</p>
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
  featured?: boolean;
}

function ItemCard({ item, getName, getDescription, formatPrice, restaurantId, featured }: ItemCardProps) {
  const price = formatPrice(item.price);
  const description = getDescription(item);

  // Track item view
  const handleClick = () => {
    supabase.from('menu_views').insert({
      restaurant_id: restaurantId,
      item_id: item.id,
    }).then(() => {});
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        'bg-card rounded-xl border border-border p-4 transition-all hover:shadow-md',
        featured && 'ring-2 ring-warning/20 bg-warning/5'
      )}
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
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight">
                {getName(item)}
                {featured && <Star className="inline ml-1 h-3 w-3 text-warning fill-warning" />}
              </h3>
              
              {/* Dietary Icons */}
              <div className="flex items-center gap-1.5 mt-1">
                {item.is_vegetarian && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Leaf className="h-3 w-3" /> V
                  </Badge>
                )}
                {item.is_vegan && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Leaf className="h-3 w-3 fill-current" /> VG
                  </Badge>
                )}
                {item.is_spicy && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <Flame className="h-3 w-3" />
                  </Badge>
                )}
                {item.is_gluten_free && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Wheat className="h-3 w-3" /> GF
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Price */}
            {price && (
              <span className="font-bold text-primary text-lg shrink-0">{price}</span>
            )}
          </div>
          
          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>
          )}
          
          {/* Allergens */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              <span>{item.allergens.join(', ')}</span>
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

  useEffect(() => {
    async function fetchMenu() {
      if (!slug) {
        setError('Menu not found');
        setLoading(false);
        return;
      }

      try {
        // Fetch restaurant
        const { data: restaurant, error: restError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .maybeSingle();

        if (restError) throw restError;
        if (!restaurant) {
          setError('Menu not found');
          setLoading(false);
          return;
        }

        // Fetch active menu
        const { data: menus, error: menuError } = await supabase
          .from('menus')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
          .order('display_order')
          .limit(1);

        if (menuError) throw menuError;
        if (!menus || menus.length === 0) {
          setError('No menu available');
          setLoading(false);
          return;
        }

        const menu = menus[0];

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
          items: (cat.items || [])
            .filter((i: any) => i.is_active)
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((item: any) => ({
              ...item,
              translations: item.item_translations,
            })),
        })) as (Category & { items: Item[] })[];

        setData({
          restaurant: restaurant as unknown as Restaurant,
          menu: menu as unknown as Menu,
          categories,
        });
      } catch (e: any) {
        console.error('Error fetching menu:', e);
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
          <h1 className="font-display text-2xl font-bold mb-2">Menu Unavailable</h1>
          <p className="text-muted-foreground">{error || 'This menu is not available.'}</p>
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