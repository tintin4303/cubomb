import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "3D Minesweeper | Cube Adventure",
  description: "A 3D cube minesweeper game with animated character, planetoid exploration, and party multiplayer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
