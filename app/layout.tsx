import type { Metadata } from "next";
import Image from "next/image";
import { LOGO_IMAGE, SCHOOL_NAME } from "@/lib/reportBranding";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestion des Bulletins Scolaires",
  description: "Application de gestion des notes et bulletins scolaires",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-gray-900">
        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 shadow-sm backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 text-gray-900">
              <span className="rounded-2xl border border-indigo-200/70 bg-white/80 p-2 shadow-sm">
                <Image
                  src={LOGO_IMAGE}
                  alt={`Logo ${SCHOOL_NAME}`}
                  width={60}
                  height={55}
                  priority
                  className="h-14 w-16 object-contain "
                />
              </span>
              <span className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-500">
                  Groupe d&apos;etude
                </span>
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  Les Leaders Bulletin Scolaire
                </span>
              </span>
            </Link>
          </div>
        </header>
        <main className="flex-1 max-w-8xl mx-auto w-full px-4 py-8">
          {children}
        </main>
        <footer className="text-center text-sm text-gray-400 py-4">
          Groupe d&apos;étude Les Leaders &copy; {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
