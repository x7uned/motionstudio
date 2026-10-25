import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/inter";
import "./globals.css";
export const metadata: Metadata = {
  title: "Кадр — Motion Studio",
  description:
    "Локальная студия коротких видео: от темы до проверенного ролика.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
