import type { Metadata } from "next";
import "../index.css";

export const metadata: Metadata = {
  title: "EMERGENCE DRC",
  description: "RH Admin",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}