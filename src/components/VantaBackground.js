'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// This component contains the Vanta.js logic, moved from the layout.
// It's designed to be lazy-loaded.
const VantaBackground = () => {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  useEffect(() => {
    let effect;
    
    const loadVantaScript = () => new Promise((resolve, reject) => {
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
                // FIX: Restore the color-changing fog using the theme's colors
                effect = window.VANTA.FOG({
                    el: vantaRef.current,
                    THREE: THREE,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.0,
                    minWidth: 200.0,
                    // Use theme colors from tailwind.config.js for a cohesive look
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
            console.error("Vanta initialization failed:", error);
        }
    };

    initializeVanta();

    return () => {
      if (effect) effect.destroy();
    };
  }, [vantaEffect]); // Dependency array is correct

  return <div ref={vantaRef} className="fixed top-0 left-0 w-full h-full z-[-1] pointer-events-none" />;
};

export default VantaBackground;