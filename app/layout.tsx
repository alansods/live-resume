import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Currículo Vivo",
  description:
    "Atualize o currículo antigo, revise as sugestões e exporte em DOCX ou PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
