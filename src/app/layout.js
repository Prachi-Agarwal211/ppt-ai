// src/app/layout.js

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

// Lazy load the VantaBackground. It will not be in the initial JS bundle.
const VantaBackground = dynamic(() => import('../components/VantaBackground'), {
  ssr: false, // This component only renders on the client
  loading: () => <div className="fixed top-0 left-0 w-full h-full z-[-1] bg-black" />
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Phase 1: Preconnect to CDNs for better performance */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* VantaBackground is placed here as a persistent, animated background layer */}
        <Suspense>
            <VantaBackground />
        </Suspense>
        
        {/* Page content is rendered on top of the background */}
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