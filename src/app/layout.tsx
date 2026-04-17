import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NBA Pickems",
  description: "Pick the winners. Beat your friends. NBA playoff prediction leagues with customizable scoring.",
  metadataBase: new URL("https://nbapickems.com"),
  openGraph: {
    title: "NBA Pickems",
    description: "Pick the winners. Beat your friends. NBA playoff prediction leagues with customizable scoring.",
    url: "https://nbapickems.com",
    siteName: "NBA Pickems",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
