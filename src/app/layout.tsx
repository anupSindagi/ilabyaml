import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ilabyaml: Generate qna.yaml for Instructlab",
  description:
    "Generate qna.yaml for Instructlab using AI for Taxonomy repository",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
