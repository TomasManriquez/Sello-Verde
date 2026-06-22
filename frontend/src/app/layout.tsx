import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sello Verde — Sistema de Certificaciones SEC',
  description: 'Gestión de certificaciones de instalaciones de gas para establecimientos educacionales SLEP',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%2301696f'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='14' font-weight='900' font-family='sans-serif'>SV</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('sv_theme');
                  if (!theme) {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
