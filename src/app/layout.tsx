import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "https://splittayo.vercel.app"
  ),
  title: "SplitTayo — Split expenses with friends",
  description:
    "Split trip expenses easily. No app, no sign-up. Just open, add expenses, and settle up.",
  openGraph: {
    title: "SplitTayo — Split expenses with friends",
    description:
      "Split trip expenses easily. No app, no sign-up. Just open, add expenses, and settle up.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SplitTayo — Split expenses with friends",
    description:
      "Split trip expenses easily. No app, no sign-up. Just open, add expenses, and settle up.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased bg-gray-50 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
