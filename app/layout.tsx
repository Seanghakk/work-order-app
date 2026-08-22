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
      <body>
        <Providers session={session}>
          {session && <NavBar />}
          {children}
          <Footer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
