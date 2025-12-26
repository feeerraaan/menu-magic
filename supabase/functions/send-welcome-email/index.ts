import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  restaurantName?: string;
  language?: string;
}

const translations: Record<string, Record<string, string>> = {
  es: {
    welcome: "¡Bienvenido a SaCarta! 🎉 Tu menú digital te espera",
    greeting: "Hola",
    thanks: "¡Gracias por unirte a SaCarta! Estamos encantados de tenerte con nosotros. Ahora puedes crear tu menú digital profesional en minutos.",
    features: "Con SaCarta podrás:",
    feature1: "✨ Crear menús digitales atractivos",
    feature2: "🌍 Traducir tu menú a múltiples idiomas",
    feature3: "📱 Generar códigos QR personalizados",
    feature4: "📊 Analizar las visitas a tu carta",
    offer: "🎁 Oferta Exclusiva de Bienvenida",
    discount: "10% DE DESCUENTO",
    discountText: "en tu primera suscripción",
    codeText: "Usa este código al suscribirte",
    ctaDefault: "Crear mi menú ahora",
    ctaRestaurant: "Crear menú para",
    help: "¿Necesitas ayuda? Estamos aquí para ti.",
    copyright: "© 2025 SaCarta. Todos los derechos reservados.",
  },
  en: {
    welcome: "Welcome to SaCarta! 🎉 Your digital menu awaits",
    greeting: "Hello",
    thanks: "Thank you for joining SaCarta! We're delighted to have you with us. Now you can create your professional digital menu in minutes.",
    features: "With SaCarta you can:",
    feature1: "✨ Create attractive digital menus",
    feature2: "🌍 Translate your menu into multiple languages",
    feature3: "📱 Generate personalized QR codes",
    feature4: "📊 Analyze visits to your menu",
    offer: "🎁 Exclusive Welcome Offer",
    discount: "10% DISCOUNT",
    discountText: "on your first subscription",
    codeText: "Use this code when subscribing",
    ctaDefault: "Create my menu now",
    ctaRestaurant: "Create menu for",
    help: "Need help? We're here for you.",
    copyright: "© 2025 SaCarta. All rights reserved.",
  },
  ca: {
    welcome: "¡Benvingut a SaCarta! 🎉 El teu menú digital t'espera",
    greeting: "Hola",
    thanks: "Gràcies per unir-te a SaCarta! Estem encantats de tenir-te amb nosaltres. Ara pots crear el teu menú digital professional en minuts.",
    features: "Amb SaCarta podràs:",
    feature1: "✨ Crear menús digitals atractius",
    feature2: "🌍 Traduir el teu menú a múltiples idiomes",
    feature3: "📱 Generar codis QR personalitzats",
    feature4: "📊 Analitzar les visites a la teva carta",
    offer: "🎁 Oferta Exclusiva de Benvinguda",
    discount: "10% DE DESCOMPTE",
    discountText: "en la teva primera subscripció",
    codeText: "Utilitza aquest codi al subscriure't",
    ctaDefault: "Crear el meu menú ara",
    ctaRestaurant: "Crear menú per a",
    help: "¿Necessites ajuda? Estem aquí per a tu.",
    copyright: "© 2025 SaCarta. Tots els drets reservats.",
  },
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, restaurantName, language = 'es' }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email} (${name})`);

    const t = translations[language] || translations['es'];
    const htmlLang = language === 'ca' ? 'ca' : language === 'en' ? 'en' : 'es';

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SaCarta <no-reply@sacarta.azpy.es>",
        to: [email],
        subject: t.welcome,
        html: `
<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${language === 'en' ? 'Welcome to SaCarta' : language === 'ca' ? 'Benvingut a SaCarta' : 'Bienvenido a SaCarta'}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with brand colors -->
          <tr>
            <td style="background: linear-gradient(135deg, #f76201 0%, #e65d01ff 100%); padding: 40px 30px; text-align: center;">
              <table role="presentation" style="margin: 0 auto 20px; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #ffffff; border-radius: 50%; width: 140px; height: 140px; text-align: center; vertical-align: middle;">
                    <img src="https://sacarta.azpy.es/logo.png" alt="SaCarta Logo" style="width: 120px; height: 120px; display: block; margin: 10px auto; object-fit: contain;" />
                  </td>
                </tr>
              </table>
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">${language === 'en' ? 'Welcome to SaCarta!' : language === 'ca' ? '¡Benvingut a SaCarta!' : '¡Bienvenido a SaCarta!'}</h1>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">
                ${t.greeting} <strong style="color: #f76201;">${name || (language === 'en' ? 'Chef' : language === 'ca' ? 'Xef' : 'Chef')}</strong>,
              </p>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ${t.thanks}
              </p>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                ${t.features}
              </p>
              <ul style="color: #6b7280; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                <li>${t.feature1}</li>
                <li>${t.feature2}</li>
                <li>${t.feature3}</li>
                <li>${t.feature4}</li>
              </ul>
            </td>
          </tr>
          
          <!-- Discount banner -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; border: 2px dashed #f59e0b;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="color: #92400e; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">
                      ${t.offer}
                    </p>
                    <p style="color: #78350f; font-size: 24px; font-weight: 700; margin: 0 0 10px;">
                      ${t.discount}
                    </p>
                    <p style="color: #92400e; font-size: 14px; margin: 0 0 15px;">
                      ${t.discountText}
                    </p>
                    <div style="background-color: #ffffff; display: inline-block; padding: 12px 30px; border-radius: 8px; border: 2px solid #f59e0b;">
                      <span style="color: #d97706; font-size: 24px; font-weight: 800; letter-spacing: 3px;">SACARTA</span>
                    </div>
                    <p style="color: #92400e; font-size: 12px; margin: 15px 0 0;">
                      ${t.codeText}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="https://sacarta.azpy.es/dashboard/editor" style="display: inline-block; background: linear-gradient(135deg, #f76201 0%, #e65d01ff 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 14px rgba(204, 92, 61, 0.4);">
                ${restaurantName ? `${t.ctaRestaurant} ${restaurantName}` : t.ctaDefault} →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px;">
                ${t.help}
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ${t.copyright}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Error sending email:", error);
      throw new Error(error);
    }

    const data = await res.json();
    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
