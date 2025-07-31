'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FaGoogle, FaMicrosoft, FaLinkedin } from 'react-icons/fa';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { createClient } from '../utils/supabase/client';

/**
 * NetherAISignIn Component - v11 (Supabase Integrated Auth Portal)
 *
 * This component provides a complete authentication experience:
 * - Handles Sign In, Sign Up, Forgot Password, and OTP Verification.
 * - Integrates with Supabase for all auth operations.
 * - Includes social logins for Google, Microsoft, and LinkedIn.
 * - Features smooth, animated transitions between auth views.
 * - Retains the advanced holographic modal, aurora background, and pearlescent UI effects.
 */
export default function NetherAISignIn() {
  const supabase = createClient();
  
  // Refs and State
  const vantaRef = useRef(null);
  const mainRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);
  const [isClient, setIsClient] = useState(false);
  
  const [view, setView] = useState('signIn'); // 'signIn', 'signUp', 'forgotPassword', 'verifyOtp'
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Form States
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
    dob: '',
    otp: '',
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  // --- Auth Handlers ---

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    const { email, password, firstName, lastName, username, dob } = formState;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          username: username,
          date_of_birth: dob,
        },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setError(error.message);
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('User with this email already exists but is unconfirmed. Please check your email for a verification link.');
    } else if (data.user) {
      setMessage('Confirmation link sent! Please check your email to verify your account.');
      // If you want OTP instead of a link, you'd set that up in Supabase Auth settings.
      // For this example, we'll assume email confirmation is enabled.
      // To show an OTP screen, you would change the view here.
      // setView('verifyOtp'); 
    }
    setLoading(false);
  };
  
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email: formState.email,
      password: formState.password,
    });
    if (error) setError(error.message);
    else setMessage('Successfully signed in! Redirecting...');
    // In a real app, you would redirect here upon success.
    setLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(formState.email, {
      redirectTo: `${window.location.origin}/update-password`, // You'd need a page for this
    });
    if (error) setError(error.message);
    else setMessage('Password reset link sent! Please check your email.');
    setLoading(false);
  };
  
  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(`Error signing in with ${provider}: ${error.message}`);
      setLoading(false);
    }
  };


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

  // --- Animated Title ---
  const AnimatedCharacters = ({ text, className }) => {
    const container = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.2 },
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
  
  // --- Vanta.js Background Effect ---
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

  useEffect(() => {
    let animationFrameId;
    if (vantaEffect && window.THREE) {
      const colorPalettes = [
        { highlight: 0x9c88ff, midtone: 0x4a47a3, lowlight: 0x2c1f8f },
        { highlight: 0xff4b4b, midtone: 0x8f1f1f, lowlight: 0x5e0f0f },
        { highlight: 0x00c19b, midtone: 0x008069, lowlight: 0x004d3e },
        { highlight: 0xff8c00, midtone: 0xcc7000, lowlight: 0x804600 },
      ];
      let currentPaletteIndex = Math.floor(Math.random() * colorPalettes.length);
      let nextPaletteIndex = (currentPaletteIndex + 1) % colorPalettes.length;
      let transitionProgress = 0;
      const currentColor = new window.THREE.Color(colorPalettes[currentPaletteIndex].highlight);
      const nextColor = new window.THREE.Color(colorPalettes[nextPaletteIndex].highlight);
      vantaEffect.setOptions({ highlightColor: currentColor.getHex() });
      const animate = () => {
        transitionProgress += 0.0005;
        if (transitionProgress >= 1) {
          transitionProgress = 0;
          currentPaletteIndex = nextPaletteIndex;
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

  const formVariants = {
    hidden: { opacity: 0, y: 20, transition: { duration: 0.3, ease: 'easeOut' } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeOut' } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };

  const renderInput = (id, type, placeholder, value, required = true) => (
    <motion.div variants={itemVariants} className="relative">
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={handleInputChange}
        required={required}
        placeholder=" "
        className="block w-full appearance-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-transparent transition-colors duration-300 peer focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
      />
      <label
        htmlFor={id}
        className="absolute top-3.5 left-4 text-gray-400 transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-purple-300 peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-purple-300 bg-transparent px-1"
      >
        {placeholder}
      </label>
    </motion.div>
  );

  const renderView = () => {
    switch (view) {
      case 'signUp':
        return (
          <motion.div key="signUp" variants={formVariants} initial="hidden" animate="visible" exit="exit">
            <motion.form onSubmit={handleSignUp} className="space-y-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
              <div className="grid grid-cols-2 gap-4">
                {renderInput('firstName', 'text', 'First Name', formState.firstName)}
                {renderInput('lastName', 'text', 'Last Name', formState.lastName)}
              </div>
              {renderInput('username', 'text', 'Username', formState.username)}
              {renderInput('email', 'email', 'Email Address', formState.email)}
              {renderInput('dob', 'date', 'Date of Birth', formState.dob)}
              {renderInput('password', 'password', 'Password', formState.password)}
              <motion.div variants={itemVariants}>
                <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(223, 215, 233, 0.7)' }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="pearl-button w-full justify-center flex items-center rounded-xl py-3 px-4 text-base font-semibold text-gray-800 shadow-lg">
                  <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                </motion.button>
              </motion.div>
            </motion.form>
            <p className="text-center text-sm text-gray-400 mt-4">
              Already have an account?{' '}
              <button onClick={() => setView('signIn')} className="font-medium text-purple-400 hover:underline">Sign In</button>
            </p>
          </motion.div>
        );
      case 'forgotPassword':
        return (
          <motion.div key="forgotPassword" variants={formVariants} initial="hidden" animate="visible" exit="exit">
             <motion.form onSubmit={handlePasswordReset} className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
              {renderInput('email', 'email', 'Email Address', formState.email)}
              <motion.div variants={itemVariants}>
                <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(223, 215, 233, 0.7)' }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="pearl-button w-full justify-center flex items-center rounded-xl py-3 px-4 text-base font-semibold text-gray-800 shadow-lg">
                  <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
                </motion.button>
              </motion.div>
            </motion.form>
            <p className="text-center text-sm text-gray-400 mt-4">
              Remembered your password?{' '}
              <button onClick={() => setView('signIn')} className="font-medium text-purple-400 hover:underline">Sign In</button>
            </p>
          </motion.div>
        );
      default: // signIn
        return (
          <motion.div key="signIn" variants={formVariants} initial="hidden" animate="visible" exit="exit">
            <motion.form onSubmit={handleSignIn} className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
              {renderInput('email', 'email', 'Email Address', formState.email)}
              {renderInput('password', 'password', 'Password', formState.password)}
              <motion.div variants={itemVariants} className="text-right">
                <button type="button" onClick={() => setView('forgotPassword')} className="text-sm font-medium text-purple-400 hover:underline">Forgot Password?</button>
              </motion.div>
              <motion.div variants={itemVariants}>
                <motion.button whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(223, 215, 233, 0.7)' }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="pearl-button w-full justify-center flex items-center rounded-xl py-3 px-4 text-base font-semibold text-gray-800 shadow-lg">
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                </motion.button>
              </motion.div>
            </motion.form>
            
            <motion.div className="my-6 flex items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="mx-4 flex-shrink text-xs uppercase text-gray-500">Or</span>
              <div className="flex-grow border-t border-white/10"></div>
            </motion.div>

            <motion.div className="space-y-3">
              {[
                { icon: FaGoogle, text: 'Google', provider: 'google' },
                { icon: FaMicrosoft, text: 'Microsoft', provider: 'azure' },
                { icon: FaLinkedin, text: 'LinkedIn', provider: 'linkedin' },
              ].map((p) => (
                <motion.button key={p.provider} whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)' }} whileTap={{ scale: 0.97 }} className="subtle-pearl-button w-full h-[42px] inline-flex items-center justify-center rounded-xl py-2.5 px-4 text-sm font-medium text-gray-300"
                  onClick={() => handleOAuthSignIn(p.provider)} disabled={loading}>
                    <p.icon className="mr-3 h-5 w-5" />
                    Continue with {p.text}
                </motion.button>
              ))}
            </motion.div>

            <p className="text-center text-sm text-gray-400 mt-6">
              Don't have an account?{' '}
              <button onClick={() => setView('signUp')} className="font-medium text-purple-400 hover:underline">Sign Up</button>
            </p>
          </motion.div>
        );
    }
  };

  return (
    <>
      <style jsx global>{`
        /* --- Mother of Pearl Text Effect --- */
        @keyframes mother-of-pearl-sheen { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .mother-of-pearl-text { background-image: linear-gradient(110deg, hsl(300, 20%, 95%), hsl(180, 20%, 85%), hsl(60, 30%, 95%), hsl(0, 30%, 90%), hsl(300, 20%, 95%)); background-size: 400% 100%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: mother-of-pearl-sheen 18s ease-in-out infinite; text-shadow: 0 0 2px rgba(255, 255, 255, 0.5), 0 0 10px rgba(200, 200, 255, 0.3); }
        /* --- Pearlescent Button Effect --- */
        .pearl-button { position: relative; overflow: hidden; background-color: #EAE6F0; background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(220, 220, 255, 0.2) 50%, rgba(255, 220, 230, 0.3) 100%); transition: all 0.4s ease-in-out; border: 1px solid rgba(255, 255, 255, 0.4); }
        .pearl-button:disabled { cursor: not-allowed; opacity: 0.7; }
        .pearl-button::before { content: ''; position: absolute; transform: translate(-50%, -50%) rotate(0deg); width: 250%; height: 250%; background: radial-gradient(circle, rgba(200, 225, 255, 0.6), rgba(255, 200, 255, 0.5), rgba(220, 255, 220, 0.5), transparent 40%); opacity: 0; transition: opacity 0.8s ease-in-out; animation: pearl-swirl 25s linear infinite; }
        @keyframes pearl-swirl { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .pearl-button:hover:not(:disabled)::before { opacity: 1; }
        .pearl-button span { position: relative; z-index: 2; }
        /* --- Subtle Pearl Auth Buttons --- */
        .subtle-pearl-button { background-color: rgba(230, 230, 240, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); position: relative; transition: border-color 0.4s ease, background-color 0.4s ease; }
        .subtle-pearl-button:hover:not(:disabled) { border-color: rgba(255, 255, 255, 0.4); background-color: rgba(230, 230, 240, 0.1); }
        .subtle-pearl-button:disabled { cursor: not-allowed; opacity: 0.6; }
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
        
        <motion.div
          style={{ rotateX, rotateY }}
          className="holographic-modal holographic-container relative z-10 w-full max-w-md rounded-2xl bg-black/40 p-8"
        >
          <div style={{ transform: 'translateZ(20px)' }} className="text-center mb-6">
            <AnimatedCharacters text="Nether AI" className="text-5xl md:text-6xl font-bold mother-of-pearl-text" />
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.8 }} className="text-gray-400 mt-3 text-sm">
              Sign in to access the digital consciousness.
            </motion.p>
          </div>

          <div style={{ transform: 'translateZ(40px)' }}>
            <AnimatePresence mode="wait">
              {renderView()}
            </AnimatePresence>
            
            {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
            {message && <p className="mt-4 text-center text-sm text-green-400">{message}</p>}
          </div>
        </motion.div>
      </main>
    </>
  );
}
