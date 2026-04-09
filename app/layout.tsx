import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <header className="bg-indigo-700 text-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold tracking-tight">
              📚 Bulletins Scolaires Groupe d'étude Les Leaders
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
