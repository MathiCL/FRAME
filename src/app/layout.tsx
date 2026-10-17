import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full overflow-hidden antialiased`}
    >
      <body className="h-full w-full overflow-hidden flex flex-col bg-[#0A0A0B]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
