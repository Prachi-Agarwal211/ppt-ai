'use client'; // This directive is needed for client-side components in the app directory

import React, { useEffect, useRef, useState } from 'react';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
  const threeLibRef = useRef(null); // Ref to hold the dynamically loaded THREE instance

  // Function to load a script and return a promise
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      // console.log(`[VantaLoader] Attempting to load script: ${src}`);
      if (document.querySelector(`script[src="${src}"]`)) {
        // console.log(`[VantaLoader] Script already exists, resolving: ${src}`);
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => {
        // console.log(`[VantaLoader] Script loaded successfully: ${src}`);
        resolve();
      };
      script.onerror = (e) => {
        console.error(`[VantaLoader] Error loading script: ${src}`, e);
        reject(e);
      };
      document.head.appendChild(script);
    });
  };

  // Effect for loading scripts and initializing Vanta.js
  useEffect(() => {
    const initializeVanta = async () => {
      // console.log("[VantaInit] Starting Vanta initialization process.");

      try {
        // Load THREE.js
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        // Poll for window.THREE to ensure it's available
        let attempts = 0;
        const maxAttempts = 30; // Try for up to 3 seconds (100ms * 30)
        while (!window.THREE && attempts < maxAttempts) {
          await new Promise(res => setTimeout(res, 100));
          attempts++;
          // console.log(`[VantaInit] Waiting for window.THREE... (Attempt ${attempts})`);
        }

        if (!window.THREE) {
          console.error("[VantaInit] window.THREE is NOT available after multiple attempts. Aborting Vanta init.");
          return;
        }
        threeLibRef.current = window.THREE; // Store the THREE object
        // console.log("[VantaInit] window.THREE is now available.");

        // Load Vanta.js
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js');
        // Poll for window.VANTA to ensure it's available
        attempts = 0;
        while (!window.VANTA && attempts < maxAttempts) {
          await new Promise(res => setTimeout(res, 100));
          attempts++;
          // console.log(`[VantaInit] Waiting for window.VANTA... (Attempt ${attempts})`);
        }

        if (!window.VANTA) {
          console.error("[VantaInit] window.VANTA is NOT available after multiple attempts. Aborting Vanta init.");
          return;
        }
        // console.log("[VantaInit] window.VANTA is now available.");

        // Check if vantaRef.current is available and Vanta effect hasn't been set yet
        if (vantaRef.current && !vantaEffect) {
          // console.log("[VantaInit] Initializing Vanta.FOG effect...");
          setVantaEffect(
            window.VANTA.FOG({
              el: vantaRef.current,
              THREE: threeLibRef.current, // Pass the stored THREE object
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              minHeight: 200.0,
              minWidth: 200.0,
              baseColor: 0x0,
              highlightColor: 0x9c88ff, // Initial purple
              // Derive midtone and lowlight colors from the highlight color using THREE.Color
              midtoneColor: new threeLibRef.current.Color(0x9c88ff).multiplyScalar(0.5).getHex(),
              lowlightColor: new threeLibRef.current.Color(0x9c88ff).multiplyScalar(0.2).getHex(),
              blurFactor: 0.55,
              speed: 1.2,
              zoom: 0.8,
            })
          );
          // console.log("[VantaInit] Vanta.FOG effect successfully initialized.");
        } else {
          // console.log("[VantaInit] Vanta.FOG initialization conditions not met:", {
          //   vantaRefReady: !!vantaRef.current,
          //   vantaEffectExists: !!vantaEffect,
          // });
        }
      } catch (error) {
        console.error("[VantaInit] Vanta initialization process encountered an error:", error);
      }
    };

    initializeVanta();

    // Cleanup function: destroy the Vanta effect when the component unmounts
    return () => {
      if (vantaEffect) {
        // console.log("[VantaInit] Destroying Vanta effect on component unmount.");
        vantaEffect.destroy();
      }
    };
  }, [vantaEffect]); // Dependency array includes vantaEffect so the effect re-runs if effect state changes

  // Effect for the color animation loop
  useEffect(() => {
    let animationFrameId;
    // Only run this effect if Vanta is initialized and THREE is available
    if (vantaEffect && threeLibRef.current) {
      // console.log("[VantaAnimation] Starting color animation loop.");
      const THREE = threeLibRef.current; // Use the stored THREE object
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
    } else {
      // console.log("[VantaAnimation] Skipping color animation: Vanta effect or THREE not ready.");
    }
    // Cleanup function for the animation loop
    return () => {
      if (animationFrameId) {
        // console.log("[VantaAnimation] Stopping color animation loop.");
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [vantaEffect, threeLibRef]); // Dependencies: animation depends on vantaEffect and threeLibRef

  // The Vanta.js canvas will be attached to this div
  return <div ref={vantaRef} className="fixed top-0 left-0 w-full h-full z-[-1] pointer-events-none" />;
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <VantaBackground /> {/* Render the Vanta.js background here */}
        {/* Ensure your main content has a z-index higher than the Vanta background (z-[-1]) */}
        <div className="relative z-[1] min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}