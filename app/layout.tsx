import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIMS Issues",
  description: "Private LIMS issue log"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
