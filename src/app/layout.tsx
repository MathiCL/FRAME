import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FRAME — Editor fotográfico cinematográfico",
  description:
    "Convierte tus fotografías en fotogramas de cine: elige el formato, aplica un estilo cinematográfico, añade subtítulos y exporta en JPG.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script
          id="clean-bis-skin"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++){if(m[i].attributeName==='bis_skin_checked'){m[i].target.removeAttribute('bis_skin_checked');}}});o.observe(document.documentElement,{attributes:true,subtree:true,attributeFilter:['bis_skin_checked']});window.addEventListener('load',function(){setTimeout(function(){o.disconnect();},3000);});}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
