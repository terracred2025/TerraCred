
'use client';

import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { Provider } from 'react-redux';
import { store } from '../store';
import { Toaster } from "@/components/Toaster";

// Professional font setup
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className={inter.className}>
      <Provider store={store}>
      <Header />
          {children}
          <Toaster />
          </Provider>
          </body>
    </html>
  );
}