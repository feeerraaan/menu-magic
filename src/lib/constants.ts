export const PRICING_PLANS = [
  { 
    id: 'sargantana', 
    name: 'Sargantana', 
    price: '0€', 
    period: '/mes', 
    features: ['1 menú digital', '1 idioma', '0 fotos', '5 categorías', '25 platos', 'QR básico', 'Soporte por email'],
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
    features: ['3 menús digitales', '2 idiomas', '50 fotos', '7 categorías', '50 platos', 'Horarios', 'Analíticas avanzadas', 'Personalización de marca', 'Soporte prioritario'], 
    featuresAnnual: ['5 menús digitales', '3 idiomas', '100 fotos', '10 categorías', '100 platos', 'Horarios', 'Analíticas avanzadas', 'Personalización de marca', 'Soporte prioritario'],
    popular: true,
    stripeId: 'price_1SikkXCZS330jw8u1e7cOKrQ',
    stripeIdAnnual: 'price_1SikkrCZS330jw8uTxFrG8c3',
    planIdMonthly: 'pro_monthly',
    planIdAnnual: 'pro_annual',
    mode: 'subscription'
  },
  { 
    id: 'myotragus', 
    name: 'Myotragus', 
    price: '139.99€', 
    period: ' pago único', 
    features: ['10 menús digitales', 'Idiomas ilimitados', '1000 fotos', '100 categorías', '1000 platos', 'Horarios', 'Analíticas avanzadas', 'Personalización de marca', 'Sin cuotas mensuales', 'Acceso de por vida', 'Soporte VIP', 'Configuración manual del menú por nosotros'],
    stripeId: 'price_1Sikn6CZS330jw8uv7g6gUs9',
    mode: 'payment'
  },
];

export const STRIPE_PRICES = {
  pro_monthly: 'price_1SikkXCZS330jw8u1e7cOKrQ',
  pro_annual: 'price_1SikkrCZS330jw8uTxFrG8c3',
  lifetime: 'price_1Sikn6CZS330jw8uv7g6gUs9',
};
