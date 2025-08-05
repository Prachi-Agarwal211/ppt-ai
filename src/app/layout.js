'use client'; 

import React, { useEffect, useRef, useState } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import * as THREE from 'three'; // Import THREE from the installed package

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Vanta.js Background Component (Client-side)
const VantaBackground = () => {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  const loadVantaScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => {
        console.error(`[VantaLoader] Error loading script: ${src}`, e);
        reject(e);
      };
      document.head.appendChild(script);
    });
  };

  useEffect(() => {
    let effect;
    const initializeVanta = async () => {
      try {
        await loadVantaScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js');
        
        let attempts = 0;
        const maxAttempts = 30;
        while (!window.VANTA && attempts < maxAttempts) {
          await new Promise(res => setTimeout(res, 100));
          attempts++;
        }

        if (!window.VANTA) {
          console.error("[VantaInit] window.VANTA is NOT available. Aborting Vanta init.");
          return;
        }

        if (vantaRef.current && !vantaEffect) {
          effect = window.VANTA.FOG({
            el: vantaRef.current,
            THREE: THREE, // Use the imported THREE object
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            baseColor: 0x0,
            highlightColor: 0x9c88ff,
            midtoneColor: new THREE.Color(0x9c88ff).multiplyScalar(0.5).getHex(),
            lowlightColor: new THREE.Color(0x9c88ff).multiplyScalar(0.2).getHex(),
            blurFactor: 0.55,
            speed: 1.2,
            zoom: 0.8,
          });
          setVantaEffect(effect);
        }
      } catch (error) {
        console.error("[VantaInit] Vanta initialization process encountered an error:", error);
      }
    };

    initializeVanta();

    return () => {
      if (effect) {
        effect.destroy();
      }
    };
  }, []); // Run only once

  useEffect(() => {
    let animationFrameId;
    if (vantaEffect) {
      const colorPalettes = [
        { highlight: 0x9c88ff },
        { highlight: 0xff4b4b },
        { highlight: 0x00c19b },
        { highlight: 0xff8c00 },
      ];

      let currentPaletteIndex = 0;
      let nextPaletteIndex = 1;
      let transitionProgress = 0;
      const transitionSpeed = 0.0005;

      const animateColors = () => {
        transitionProgress += transitionSpeed;
        if (transitionProgress >= 1) {
          transitionProgress = 0;
          currentPaletteIndex = nextPaletteIndex;
          nextPaletteIndex = (currentPaletteIndex + 1) % colorPalettes.length;
        }

        const interpolatedColor = new THREE.Color(colorPalettes[currentPaletteIndex].highlight).lerp(new THREE.Color(colorPalettes[nextPaletteIndex].highlight), transitionProgress);

        vantaEffect.setOptions({
          highlightColor: interpolatedColor.getHex(),
          midtoneColor: interpolatedColor.clone().multiplyScalar(0.5).getHex(),
          lowlightColor: interpolatedColor.clone().multiplyScalar(0.2).getHex(),
        });

        animationFrameId = requestAnimationFrame(animateColors);
      };

      animateColors();
    }
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [vantaEffect]);

  return <div ref={vantaRef} className="fixed top-0 left-0 w-full h-full z-[-1] pointer-events-none" />;
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VantaBackground />
        <div className="relative z-[1] min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}