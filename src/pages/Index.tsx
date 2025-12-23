import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Utensils, QrCode, BarChart3, Globe, ArrowRight, Check } from 'lucide-react';
export default function Index() {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Utensils className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">MenuYa</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto py-20 text-center px-0 text-white">
        <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Beautiful Digital Menus<br />
          <span className="text-gradient">in Minutes</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Create stunning, mobile-first restaurant menus. No coding required. 
          Just scan and browse.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8">
              Start Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/m/demo">
            <Button size="lg" variant="outline" className="text-lg px-8">
              View Demo Menu
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-12">
          Everything you need
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[{
          icon: QrCode,
          title: 'QR Code Ready',
          desc: 'Generate beautiful QR codes for tables, flyers, and more.'
        }, {
          icon: Globe,
          title: 'Multilingual',
          desc: 'Auto-translate menus to any language for international guests.'
        }, {
          icon: BarChart3,
          title: 'Analytics',
          desc: 'See what\'s popular and when customers browse your menu.'
        }].map((f, i) => <div key={i} className="menu-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>)}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-4">Simple Pricing</h2>
        <p className="text-center text-muted-foreground mb-12">Start free, upgrade when you need more.</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[{
          name: 'Free',
          price: '€0',
          features: ['1 menu', '1 language', 'Basic QR code', 'Unlimited items']
        }, {
          name: 'Pro',
          price: '€9/mo',
          features: ['Unlimited menus', '10 languages', 'Photos & schedules', 'Analytics', 'All templates'],
          popular: true
        }, {
          name: 'Lifetime',
          price: '€149',
          features: ['All Pro features', 'One-time payment', 'Priority support', 'Future updates']
        }].map((plan, i) => <div key={i} className={`menu-card p-6 ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
              {plan.popular && <span className="text-xs font-medium text-primary mb-2 block">Most Popular</span>}
              <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
              <p className="text-3xl font-bold my-4">{plan.price}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => <li key={j} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>)}
              </ul>
              <Link to="/auth">
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  Get Started
                </Button>
              </Link>
            </div>)}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 MenuYa. Made with ❤️ for restaurants.</p>
        </div>
      </footer>
    </div>;
}