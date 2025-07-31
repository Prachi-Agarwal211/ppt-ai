'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

/**
 * NetherAISignIn Component - v10 (Refined Aurora Edition)
 *
 * This component creates a deeply immersive and interactive sign-in page.
 * It features:
 * - Slower, more refined fused color transitions for the background aurora effect.
 * - The background now starts instantly with a random color.
 * - Generative input visualization where typed characters animate into the form.
 * - An advanced holographic modal that tilts in 3D space with the cursor.
 * - A "Mother of Pearl" text effect and "Pearlescent" interactive buttons.
 *
 * All necessary libraries (Three.js, Vanta.js) are loaded via CDN.
 */
export default function NetherAISignIn() {
  // Refs for canvases and main container
  const vantaRef = useRef(null);
  const mainRef = useRef(null);

  // State management
  const [vantaEffect, setVantaEffect] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [authAction, setAuthAction] = useState(null);
  const [email, setEmail] = useState('');
  const [floatingChars, setFloatingChars] = useState([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- 3D TILT EFFECT ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-400, 400], [10, -10]);
  const rotateY = useTransform(x, [-400, 400], [-10, 10]);

  const handleMouseMove = (e) => {
    if (mainRef.current) {
      const rect = mainRef.current.getBoundingClientRect();
      x.set(e.clientX - rect.left - rect.width / 2);
      y.set(e.clientY - rect.top - rect.height / 2);
    }
  };
  // --- END 3D TILT EFFECT ---

  // Component for staggered character animation
  const AnimatedCharacters = ({ text, className }) => {
    const container = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.8 },
      },
    };
    const child = {
      visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', damping: 12, stiffness: 100 },
      },
      hidden: {
        opacity: 0,
        y: 20,
      },
    };
    return (
      <motion.div variants={container} initial="hidden" animate="visible" className={className} style={{ display: 'flex', justifyContent: 'center' }}>
        {text.split('').map((char, index) => (
          <motion.span variants={child} key={index}>{char === ' ' ? '\u00A0' : char}</motion.span>
        ))}
      </motion.div>
    );
  };

  // Effect to initialize Vanta.js
  useEffect(() => {
    if (isClient && !vantaEffect) {
      const threeScript = document.createElement('script');
      threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
      threeScript.async = true;
      threeScript.onload = () => {
        const vantaScript = document.createElement('script');
        vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js';
        vantaScript.async = true;
        vantaScript.onload = () => {
          if (window.VANTA && window.THREE && vantaRef.current) {
            setVantaEffect(
              window.VANTA.FOG({
                el: vantaRef.current,
                THREE: window.THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.0,
                minWidth: 200.0,
                baseColor: 0x0,
                blurFactor: 0.55,
                speed: 1.5,
                zoom: 0.9,
              })
            );
          }
        };
        document.head.appendChild(vantaScript);
      };
      document.head.appendChild(threeScript);
    }
    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [isClient]);

  // Effect for Vanta.js color animation (Fused Aurora Theme)
  useEffect(() => {
    let animationFrameId;
    if (vantaEffect && window.THREE) {
      const colorPalettes = [
        { highlight: 0x9c88ff, midtone: 0x4a47a3, lowlight: 0x2c1f8f }, // 1. Original Purple
        { highlight: 0xff4b4b, midtone: 0x8f1f1f, lowlight: 0x5e0f0f }, // 2. Crimson Red
        { highlight: 0x00c19b, midtone: 0x008069, lowlight: 0x004d3e }, // 3. Mystic Teal
        { highlight: 0xff8c00, midtone: 0xcc7000, lowlight: 0x804600 }, // 4. Ember Orange
      ];

      let currentPaletteIndex = Math.floor(Math.random() * colorPalettes.length);
      let nextPaletteIndex = (currentPaletteIndex + 1) % colorPalettes.length;
      let transitionProgress = 0;

      const currentColor = new window.THREE.Color(colorPalettes[currentPaletteIndex].highlight);
      const nextColor = new window.THREE.Color(colorPalettes[nextPaletteIndex].highlight);

      // Set initial color immediately
      vantaEffect.setOptions({
          highlightColor: currentColor.getHex()
      });

      const animate = () => {
        // Slower transition speed
        transitionProgress += 0.0005; 

        if (transitionProgress >= 1) {
          transitionProgress = 0;
          currentPaletteIndex = nextPaletteIndex;
          // Ensure next color is different
          do {
            nextPaletteIndex = Math.floor(Math.random() * colorPalettes.length);
          } while (nextPaletteIndex === currentPaletteIndex);
          
          currentColor.set(colorPalettes[currentPaletteIndex].highlight);
          nextColor.set(colorPalettes[nextPaletteIndex].highlight);
        }
        
        const interpolatedColor = currentColor.clone().lerp(nextColor, transitionProgress);

        vantaEffect.setOptions({
          highlightColor: interpolatedColor.getHex(),
          midtoneColor: interpolatedColor.clone().multiplyScalar(0.5).getHex(),
          lowlightColor: interpolatedColor.clone().multiplyScalar(0.2).getHex(),
        });

        animationFrameId = requestAnimationFrame(animate);
      };
      animate();
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [vantaEffect]);
  
  // Handler for Generative Input
  const handleEmailKeyDown = (e) => {
    e.preventDefault();
    const { key } = e;

    if (key.length === 1 && email.length < 50) {
      const newChar = {
        id: Date.now() + key,
        char: key,
        x: Math.random() * 50 - 25,
        y: -40,
      };
      setFloatingChars(chars => [...chars, newChar]);
      setEmail(email + key);

      setTimeout(() => {
        setFloatingChars(chars => chars.filter(c => c.id !== newChar.id));
      }, 1000);
    } else if (key === 'Backspace') {
      setEmail(email.slice(0, -1));
    }
  };

  const handleLogin = (e) => { e.preventDefault(); console.log('Login initiated...'); };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  return (
    <>
      <style jsx global>{`
        /* --- Mother of Pearl Text Effect --- */
        @keyframes mother-of-pearl-sheen { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .mother-of-pearl-text { background-image: linear-gradient(110deg, hsl(300, 20%, 95%), hsl(180, 20%, 85%), hsl(60, 30%, 95%), hsl(0, 30%, 90%), hsl(300, 20%, 95%)); background-size: 400% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: mother-of-pearl-sheen 18s ease-in-out infinite; text-shadow: 0 0 2px rgba(255, 255, 255, 0.5), 0 0 10px rgba(200, 200, 255, 0.3); }
        /* --- Pearlescent Button Effect --- */
        .pearl-button { position: relative; overflow: hidden; background-color: #EAE6F0; background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(220, 220, 255, 0.2) 50%, rgba(255, 220, 230, 0.3) 100%); transition: all 0.4s ease-in-out; border: 1px solid rgba(255, 255, 255, 0.4); }
        .pearl-button::before { content: ''; position: absolute; transform: translate(-50%, -50%) rotate(0deg); width: 250%; height: 250%; background: radial-gradient(circle, rgba(200, 225, 255, 0.6), rgba(255, 200, 255, 0.5), rgba(220, 255, 220, 0.5), transparent 40%); opacity: 0; transition: opacity 0.8s ease-in-out; animation: pearl-swirl 25s linear infinite; }
        @keyframes pearl-swirl { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .pearl-button:hover::before { opacity: 1; }
        .pearl-button span { position: relative; z-index: 2; }
        /* --- Subtle Pearl Auth Buttons --- */
        .subtle-pearl-button { background-color: rgba(230, 230, 240, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); position: relative; transition: border-color 0.4s ease, background-color 0.4s ease; }
        .subtle-pearl-button:hover { border-color: rgba(255, 255, 255, 0.4); background-color: rgba(230, 230, 240, 0.1); }
        /* --- Holographic Modal & Sheen --- */
        @keyframes holographic-sheen { 0% { transform: translateX(-150%) skewX(-30deg); opacity: 0.5; } 100% { transform: translateX(150%) skewX(-30deg); opacity: 0; } }
        .holographic-container::before { content: ''; position: absolute; top: 0; left: 0; width: 50%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%); animation: holographic-sheen 6s infinite linear; animation-delay: 2s; pointer-events: none; }
        .holographic-modal { 
          transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1); 
          transform-style: preserve-3d;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .holographic-modal:hover { 
          backdrop-filter: blur(20px); 
          box-shadow: 0 0 50px rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <main ref={mainRef} onMouseMove={handleMouseMove} className="min-h-screen w-full bg-black text-white flex items-center justify-center font-sans relative overflow-hidden p-4">
        <div ref={vantaRef} className="absolute top-0 left-0 w-full h-full z-0" />
        
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{ rotateX, rotateY }}
            className="holographic-modal holographic-container relative z-10 w-full max-w-md rounded-2xl bg-black/40 p-8"
          >
            <motion.div style={{ transform: 'translateZ(20px)' }} className="text-center mb-8">
              <AnimatedCharacters text="Nether AI" className="text-5xl md:text-6xl font-bold mother-of-pearl-text" />
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.4 }} className="text-gray-400 mt-3 text-sm">
                Sign in to access the digital consciousness.
              </motion.p>
            </motion.div>

            <motion.form onSubmit={handleLogin} className="space-y-6" style={{ transform: 'translateZ(40px)' }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 1.6 } } }}>
              <motion.div variants={itemVariants} className="relative">
                <div className="relative">
                  <motion.input id="email" type="email" value={email} onChange={() => {}} onKeyDown={handleEmailKeyDown} required placeholder=" " className="block w-full appearance-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-transparent transition-colors duration-300 peer focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                  <label htmlFor="email" className="absolute top-3.5 left-4 text-gray-400 transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-purple-300 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-purple-300 bg-transparent px-1">Email Address</label>
                  <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence>
                      {floatingChars.map(c => (
                        <motion.span
                          key={c.id}
                          initial={{ opacity: 0, scale: 0.5, x: c.x, y: c.y }}
                          animate={{ opacity: [0.5, 1, 0.5], scale: 1, y: -10, x: c.x, transition: { duration: 0.5, ease: 'easeOut' } }}
                          exit={{ opacity: 0, y: 20, x: email.length * 8, transition: { duration: 0.5, ease: 'easeIn' } }}
                          className="absolute top-1/2 left-4 text-purple-300 text-lg font-medium"
                        >
                          {c.char}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
              <motion.div variants={itemVariants} className="relative">
                <motion.input id="password" type="password" required placeholder=" " className="block w-full appearance-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-transparent transition-colors duration-300 peer focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                <label htmlFor="password" className="absolute top-3.5 left-4 text-gray-400 transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-purple-300 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-purple-300 bg-transparent px-1">Password</label>
              </motion.div>
              <motion.div variants={itemVariants}>
                <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(223, 215, 233, 0.7)' }} whileTap={{ scale: 0.98 }} type="submit" className="pearl-button w-full justify-center flex items-center rounded-xl py-3 px-4 text-base font-semibold text-gray-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#d8d0e1] focus:ring-offset-2 focus:ring-offset-black">
                  <span>Sign In</span>
                </motion.button>
              </motion.div>
            </motion.form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 2.2 }} className="my-6 flex items-center" style={{ transform: 'translateZ(20px)' }}>
              <div className="flex-grow border-t border-white/10"></div>
              <span className="mx-4 flex-shrink text-xs uppercase text-gray-500">Or Continue With</span>
              <div className="flex-grow border-t border-white/10"></div>
            </motion.div>

            <motion.div className="space-y-3" style={{ transform: 'translateZ(30px)' }} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 2.4 } } }}>
              {[ { icon: FaGoogle, text: 'Google', key: 'google' }, { icon: FaGithub, text: 'GitHub', key: 'github' } ].map((provider) => (
                <motion.button key={provider.key} variants={itemVariants} whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)' }} whileTap={{ scale: 0.97 }} className="subtle-pearl-button w-full h-[42px] inline-flex items-center justify-center rounded-xl py-2.5 px-4 text-sm font-medium text-gray-300"
                  onClick={() => { console.log(`Authenticate with ${provider.text}`); setAuthAction(provider.key); setTimeout(() => setAuthAction(null), 2500); }}>
                  <AnimatePresence mode="wait">
                    {authAction === provider.key ? (
                      <motion.span key="action" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="text-purple-300">Connecting...</motion.span>
                    ) : (
                      <motion.span key="idle" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="flex items-center justify-center">
                        <provider.icon className="mr-3 h-5 w-5" />
                        Continue with {provider.text}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}
