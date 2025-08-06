'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const VantaBackground = () => {
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);

  const colorPalettes = [
    { highlight: 0xfadadd, midtone: 0xebd8e6, lowlight: 0xffe1c6 },
    { highlight: 0xebd8e6, midtone: 0xffe1c6, lowlight: 0xfadadd },
    { highlight: 0xffe1c6, midtone: 0xfadadd, lowlight: 0xebd8e6 },
  ];

  useEffect(() => {
    let effect;
    
    const loadVantaScript = () => new Promise((resolve, reject) => {
        if (window.VANTA && window.VANTA.FOG) return resolve();
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
                effect = window.VANTA.FOG({
                    el: vantaRef.current,
                    THREE: THREE,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.0,
                    minWidth: 200.0,
                    highlightColor: colorPalettes[0].highlight,
                    midtoneColor: colorPalettes[0].midtone,
                    lowlightColor: colorPalettes[0].lowlight,
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

    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, []); 

  useEffect(() => {
    if (!vantaEffect) return;

    let paletteIndex = 0;
    const colorInterval = setInterval(() => {
      paletteIndex = (paletteIndex + 1) % colorPalettes.length;
      vantaEffect.setOptions(colorPalettes[paletteIndex]);
    }, 10000);

    return () => clearInterval(colorInterval);
  }, [vantaEffect]);

  return <div ref={vantaRef} className="fixed top-0 left-0 w-full h-full z-[-1] pointer-events-none" />;
};

export default VantaBackground;