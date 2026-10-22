import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata = {
  title: "ResearchTrail",
  description: "Track how your research unfolds",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}