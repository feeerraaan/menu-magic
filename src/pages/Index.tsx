import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QrCode, BarChart3, Globe, ArrowRight, Check } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container pt-0 pb-0 mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <a href="/"><img src="/public/favicon.ico" alt="SaCarta Logo" height={92} width={92}/></a>    
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link to="/auth">
              <Button>Empezar gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto py-20 text-center">
        <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Menús digitales bonitos<br />
          <span className="text-gradient">en minutos</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Crea menús atractivos y adaptados a móvil para tu restaurante. 
          Sin código. Solo escanea y navega.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8">
              Empezar gratis <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/m/demo">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Ver menú demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-12">
          Todo lo que necesitas
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: QrCode, title: 'Código QR listo', desc: 'Genera códigos QR bonitos para mesas, flyers y más.' },
            { icon: Globe, title: 'Multiidioma', desc: 'Traduce tu menú automáticamente a cualquier idioma para clientes internacionales.' },
            { icon: BarChart3, title: 'Analíticas', desc: 'Ve qué platos son los más populares y cuándo consultan tu menú.' },
          ].map((f, i) => (
            <div key={i} className="menu-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <f.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto py-20">
        <h2 className="font-display text-3xl font-bold text-center mb-4">Precios simples</h2>
        <p className="text-center text-muted-foreground mb-12">Empieza gratis, mejora cuando lo necesites.</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { name: 'Gratis', price: '0€', features: ['1 menú', '1 idioma', 'Código QR básico', 'Platos ilimitados'] },
            { name: 'Pro', price: '9€/mes', features: ['Menús ilimitados', '10 idiomas', 'Fotos y horarios', 'Analíticas', 'Todas las plantillas'], popular: true },
            { name: 'De por vida', price: '149€', features: ['Todo lo de Pro', 'Pago único', 'Soporte prioritario', 'Actualizaciones futuras'] },
          ].map((plan, i) => (
            <div key={i} className={`menu-card p-6 ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
              {plan.popular && <span className="text-xs font-medium text-primary mb-2 block">Más popular</span>}
              <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
              <p className="text-3xl font-bold my-4">{plan.price}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" /> {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth">
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  Empezar
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 SaCarta. Hecho con ❤️ para restaurantes.</p>
        </div>
      </footer>
    </div>
  );
}