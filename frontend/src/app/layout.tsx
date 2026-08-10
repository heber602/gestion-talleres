import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/context/I18nContext";

export const metadata: Metadata = {
  title: "81cc | Plataforma para talleres",
  description: "81cc es la plataforma de gestion inteligente para talleres mecanicos y servicio automotor.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <I18nProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
