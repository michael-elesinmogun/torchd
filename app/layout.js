import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";
import ThemeProvider from "./components/ThemeProvider";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export const metadata = {
  title: "Torchd — Sports Debate. Live. Unfiltered.",
  description: "The live video debate platform for sports fans.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`} data-theme="dark">
      <body>
        <ThemeProvider />
        <NavBar />
        {children}
      </body>
    </html>
  );
}