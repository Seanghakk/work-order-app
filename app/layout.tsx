import "./globals.css";
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

export const metadata = { title: "ADTECH | Work Order System" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Almarai:wght@400;500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers session={session}>
          {session && <NavBar />}
          {children}
        </Providers>
      </body>
    </html>
  );
}
