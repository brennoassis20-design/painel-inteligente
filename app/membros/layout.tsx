import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { getSettings } from "@/lib/membros";
import "./membros.css";

export const metadata: Metadata = {
  title: "Gênio Play",
  description: "Sua área de membros: aulas, produtos e novidades num lugar só.",
  robots: { index: false, follow: false },
  manifest: "/api/membros/manifest",
  icons: { icon: "/membros/app/icone-192.png", apple: "/membros/app/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Gênio Play", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // iPhones com iOS antigo só abrem em tela cheia com a tag antiga.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0A0C12",
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

// Pixel da Meta configurado em Aparência (mp_settings.meta_pixel_id). Sem pixel, a área funciona igual.
async function pixelId() {
  try {
    const settings = await getSettings();
    return (settings?.meta_pixel_id || "").replace(/\D/g, "");
  } catch {
    return "";
  }
}

export default async function MembrosLayout({ children }: { children: React.ReactNode }) {
  const pixel = await pixelId();
  return (
    <>
      {pixel && (
        <Script id="gp-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}
      {children}
    </>
  );
}
