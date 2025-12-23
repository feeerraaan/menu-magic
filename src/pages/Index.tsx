import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QrCode, BarChart3, Globe, ArrowRight, Check } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-20 w-20">
                <img src="/src/assets/logo.png" alt="SaCarta Logo"/>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="font-medium hover:bg-primary/5 hover:text-primary">Iniciar sesión</Button>
            </Link>
            <Link to="/auth">
              <Button className="rounded-full shadow-md shadow-primary/20">Empezar gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pb-32">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        
        <div className="container mx-auto px-4 text-center">
          <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              Menús digitales que <br />
              <span className="relative inline-block mt-1 sm:mt-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-accent drop-shadow-sm">
                  enamoran a tus clientes
                </span>
                <svg className="absolute w-[110%] h-3 -bottom-2 -left-[5%] text-primary/30 hidden sm:block" viewBox="0 0 200 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.00025 6.99997C25.7501 2.49994 132.5 -1.49996 198 6.99997" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Crea menús atractivos, rápidos y adaptados a móvil. 
              Sin descargas, sin esperas y sin complicaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 h-14 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                  Empezar gratis <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/m/demo">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 rounded-full border-2 hover:bg-secondary/50 transition-all hover:-translate-y-0.5">
                  Ver demo en vivo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold mb-4">
              Todo lo que necesitas para crecer
            </h2>
            <p className="text-muted-foreground text-lg">
                Herramientas potentes diseñadas para simplificar la gestión de tu restaurante.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            { [
              { icon: QrCode, title: 'Códigos QR Inteligentes', desc: 'Genera QRs únicos para mesas o marketing. Personalizables y siempre conectados.' },
              { icon: Globe, title: 'Traducción Automática', desc: 'Rompe barreras lingüísticas. Tu menú en múltiples idiomas al instante.' },
              { icon: BarChart3, title: 'Analíticas en Tiempo Real', desc: 'Descubre qué platos triunfan y optimiza tu oferta basándote en datos reales.' },
            ].map((f, i) => (
              <div key={i} className="group bg-card hover:bg-card/50 p-8 rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-display text-4xl font-bold mb-4">Precios transparentes</h2>
            <p className="text-muted-foreground text-lg">Elige el plan que mejor se adapte a tu etapa actual.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            { [
              { name: 'Gratis', price: '0€', period: '/mes', features: ['1 menú digital', '1 idioma', 'QR básico', 'Platos ilimitados', 'Soporte por email'] },
              { name: 'Pro', price: '8.99€', period: '/mes', features: ['Menús ilimitados', '10 idiomas automáticos', 'Fotos de alta calidad', 'Analíticas avanzadas', 'Personalización de marca', 'Soporte prioritario'], popular: true },
              { name: 'Lifetime', price: '149€', period: ' pago único', features: ['Todo lo incluido en Pro', 'Sin cuotas mensuales', 'Acceso de por vida', 'Actualizaciones futuras', 'Soporte VIP'] },
            ].map((plan, i) => (
              <div key={i} className={`relative p-8 rounded-3xl border flex flex-col ${plan.popular ? 'border-primary shadow-xl shadow-primary/10 bg-card z-10' : 'border-border bg-card/50 hover:bg-card transition-colors'}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-0 right-0 mx-auto w-fit px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-sm">
                    Más popular
                  </div>
                )}
                <h3 className="font-display text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className={`h-5 w-5 shrink-0 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} /> 
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/auth" className="block mt-auto">
                  <Button className="w-full h-12 rounded-xl font-medium" variant={plan.popular ? 'default' : 'outline'}>
                    {plan.price === '0€' ? 'Empezar gratis' : 'Seleccionar plan'}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-secondary/20 py-12">
        <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
                 <div className="h-8 w-8 rounded-lg bg-primary/10 p-1.5">
                    <img src="/logo.svg" alt="SaCarta Logo" className="h-full w-full object-contain" />
                 </div>
                 <span className="font-display font-bold text-xl">SaCarta</span>
            </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} SaCarta. Hecho con ❤️ para la hostelería.
          </p>
        </div>
      </footer>
    </div>
  );
}