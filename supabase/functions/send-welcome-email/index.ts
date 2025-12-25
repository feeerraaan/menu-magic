import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email} (${name})`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SaCarta <no-reply@sacarta.azpy.es>",
        to: [email],
        subject: "¡Bienvenido a SaCarta! 🎉 Tu menú digital te espera",
        html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a SaCarta</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with brand colors -->
          <tr>
            <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center;">
              <img src="https://sacarta.azpy.es/logo.png" alt="SaCarta Logo" style="width: 120px; height: auto; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">¡Bienvenido a SaCarta!</h1>
            </td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 18px; line-height: 1.6; margin: 0 0 20px;">
                Hola <strong style="color: #16a34a;">${name || 'Chef'}</strong>,
              </p>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ¡Gracias por unirte a SaCarta! Estamos encantados de tenerte con nosotros. Ahora puedes crear tu menú digital profesional en minutos.
              </p>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Con SaCarta podrás:
              </p>
              <ul style="color: #6b7280; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                <li>✨ Crear menús digitales atractivos</li>
                <li>🌍 Traducir tu menú a múltiples idiomas</li>
                <li>📱 Generar códigos QR personalizados</li>
                <li>📊 Analizar las visitas a tu carta</li>
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
                      🎁 Oferta Exclusiva de Bienvenida
                    </p>
                    <p style="color: #78350f; font-size: 24px; font-weight: 700; margin: 0 0 10px;">
                      10% DE DESCUENTO
                    </p>
                    <p style="color: #92400e; font-size: 14px; margin: 0 0 15px;">
                      en tu primera suscripción
                    </p>
                    <div style="background-color: #ffffff; display: inline-block; padding: 12px 30px; border-radius: 8px; border: 2px solid #f59e0b;">
                      <span style="color: #d97706; font-size: 24px; font-weight: 800; letter-spacing: 3px;">SACARTA</span>
                    </div>
                    <p style="color: #92400e; font-size: 12px; margin: 15px 0 0;">
                      Usa este código al suscribirte
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 40px; text-align: center;">
              <a href="https://sacarta.azpy.es/auth" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
                Crear mi menú ahora →
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 14px; margin: 0 0 10px;">
                ¿Necesitas ayuda? Estamos aquí para ti.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © 2024 SaCarta. Todos los derechos reservados.
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
