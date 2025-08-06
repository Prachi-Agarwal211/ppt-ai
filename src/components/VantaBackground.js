'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// This component contains the Vanta.js logic.
// It's designed to be lazy-loaded to improve initial page load performance.
const VantaBackground = () => {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  useEffect(() => {
    let effect;
    
    // Dynamically load the Vanta.js FOG script
    const loadVantaScript = () => new Promise((resolve, reject) => {
        // If the script is already loaded, resolve immediately.
        if (window.VANTA && window.VANTA.FOG) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    const initializeVanta = async () => {
        try {
            await loadVantaScript();
            if (vantaRef.current && !vantaEffect) {
                // Initialize the Vanta.js FOG effect with theme-consistent colors
                effect = window.VANTA.FOG({
                    el: vantaRef.current,
                    THREE: THREE,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.0,
                    minWidth: 200.0,
                    // These colors are taken from tailwind.config.js for a cohesive look and feel.
                    highlightColor: 0xfadadd, // pinkBlush
                    midtoneColor: 0xebd8e6,   // mauveLight
                    lowlightColor: 0xffe1c6,  // peachSoft
                    baseColor: 0x0,
                    blurFactor: 0.50,
                    speed: 1.30,
                    zoom: 0.80,
                });
                setVantaEffect(effect);
            }
        } catch (error) {
            console.error("Vanta.js initialization failed:", error);
        }
    };

    initializeVanta();

    // Cleanup function to destroy the effect when the component unmounts
    return () => {
      if (effect) effect.destroy();
    };
  }, [vantaEffect]); // Dependency array ensures this runs only once on mount

  return <div ref={vantaRef} className="fixed top-0 left-0 w-full h-full z-[-1] pointer-events-none" />;
};

export default VantaBackground;