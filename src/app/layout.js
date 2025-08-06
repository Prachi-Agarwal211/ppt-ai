'use client'; 

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Geist } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Lazy load the heavy VantaBackground component.
// It will not be included in the initial JS bundle, making the login page load instantly.
const VantaBackground = dynamic(() => import('../components/VantaBackground'), {
  ssr: false, // This component will only render on the client
  loading: () => <div className="fixed top-0 left-0 w-full h-full z-[-1] bg-black" />
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Suspense>
            <VantaBackground />
        </Suspense>
        <div className="relative z-[1] min-h-screen">
          {children}
        </div>
        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
      </body>
    </html>
  );
}