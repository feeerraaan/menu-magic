export const PRICING_PLANS = [
  { 
    id: 'sargantana', 
    name: 'Sargantana', 
    price: '0€', 
    period: '/mes', 
    features: ['1 menú digital', '1 idioma', '10 fotos', 'QR básico', 'Platos ilimitados', 'Soporte por email'],
    stripeId: null,
    mode: null
  },
  { 
    id: 'ferreret', 
    name: 'Ferreret', 
    price: '8.99€', 
    period: '/mes', 
    priceAnnual: '79.99€',
    periodAnnual: '/año',
    features: ['Menús ilimitados', '3 idiomas automáticos', 'Fotos de alta calidad', 'Analíticas avanzadas', 'Personalización de marca', 'Soporte prioritario'], 
    popular: true,
    stripeId: 'price_1ShbjSClyJbFQEQavF7mAwX9',
    stripeIdAnnual: 'price_1ShbkAClyJbFQEQa0JUtzEOp',
    planIdMonthly: 'pro_monthly',
    planIdAnnual: 'pro_annual',
    mode: 'subscription'
  },
  { 
    id: 'myotragus', 
    name: 'Myotragus', 
    price: '139.99€', 
    period: ' pago único', 
    features: ['Todo lo incluido en Ferreret', 'Sin cuotas mensuales', 'Acceso de por vida', 'Soporte VIP'],
    stripeId: 'price_1ShbkTClyJbFQEQaodGb9UEE',
    mode: 'payment'
  },
];

export const STRIPE_PRICES = {
  pro_monthly: 'price_1ShbjSClyJbFQEQavF7mAwX9',
  pro_annual: 'price_1ShbkAClyJbFQEQa0JUtzEOp',
  lifetime: 'price_1ShbkTClyJbFQEQaodGb9UEE',
};
