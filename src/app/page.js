'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaGoogle } from 'react-icons/fa';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { createClient } from '../utils/supabase/client';

/**
 * NetherAISignIn Component - v17 (Final & Complete)
 *
 * This component now features:
 * - Direct Vanta.js integration for a consistent, color-changing background.
 * - All purple accents are replaced with a cohesive 'peachSoft' off-white theme.
 * - Buttons are correctly styled with `primary-button` and `secondary-button`.
 */
export default function NetherAISignIn() {
  const supabase = createClient();
  const router = useRouter();

  // --- REFS & HOOKS ---
  const mainRef = useRef(null);
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);
  const threeRef = useRef(null); // Ref to hold THREE instance

  // --- Vanta.js Background Logic (Integrated) ---
  useEffect(() => {
    // Function to load a script and return a promise
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    const initVanta = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        threeRef.current = window.THREE; // Store THREE in ref
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js');

        if (window.VANTA && vantaRef.current && !vantaEffect) {
          const colorPalettes = [
            { highlight: 0x9c88ff }, // Original Purple
            { highlight: 0xff4b4b }, // Original Red
            { highlight: 0x00c19b }, // Original Green
            { highlight: 0xff8c00 }, // Original Orange
          ];

          setVantaEffect(
            window.VANTA.FOG({
              el: vantaRef.current,
              THREE: threeRef.current,
              mouseControls: true,
              touchControls: true,
              gyroControls: false,
              minHeight: 200.0,
              minWidth: 200.0,
              baseColor: 0x0,
              highlightColor: colorPalettes[0].highlight, // Initialize with first palette's highlight
              midtoneColor: new threeRef.current.Color(colorPalettes[0].highlight).multiplyScalar(0.5).getHex(), // Derived
              lowlightColor: new threeRef.current.Color(colorPalettes[0].highlight).multiplyScalar(0.2).getHex(), // Derived
              blurFactor: 0.55,
              speed: 1.2,
              zoom: 0.8,
            })
          );
        }
      } catch (error) {
        console.error("Vanta.js script loading failed:", error);
      }
    };

    initVanta();

    return () => {
      if (vantaEffect) vantaEffect.destroy();
    };
  }, [vantaRef]); // Only re-run if the ref changes

  useEffect(() => {
    let animationFrameId;
    if (vantaEffect && threeRef.current) {
      const THREE = threeRef.current;
      const colorPalettes = [
        { highlight: 0x9c88ff },
        { highlight: 0xff4b4b },
        { highlight: 0x00c19b },
        { highlight: 0xff8c00 },
      ];
      
      let currentPaletteIndex = 0;
      let nextPaletteIndex = 1;
      let transitionProgress = 0;
      const transitionSpeed = 0.0005; // Original speed

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
      cancelAnimationFrame(animationFrameId);
    };
  }, [vantaEffect]);


  // --- STATE ---
  const [view, setView] = useState('signIn');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [formState, setFormState] = useState({
    email: '', password: '', firstName: '', lastName: '', username: '', dob: '', phone: '',
  });

  // --- SESSION & AUTH LOGIC ---
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      } else {
        setCheckingSession(false);
      }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.push('/dashboard');
    });
    return () => subscription?.unsubscribe();
  }, [router, supabase.auth]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSignUp = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    const { email, password, firstName, lastName, username, dob, phone } = formState;
    const { data, error } = await supabase.auth.signUp({
      email, password, phone,
      options: { data: { first_name: firstName, last_name: lastName, username, date_of_birth: dob, phone }, emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) setError(error.message);
    else if (data.user?.identities?.length === 0) setError('User with this email already exists but is unconfirmed.');
    else setMessage('Confirmation link sent! Please check your email.');
    setLoading(false);
  };

  const handleSignIn = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: formState.email, password: formState.password });
    if (error) { setError(error.message); setLoading(false); }
  };
  
  const handlePasswordReset = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(formState.email, { redirectTo: `${window.location.origin}/update-password` });
    if (error) setError(error.message);
    else setMessage('Password reset link sent! Please check your email.');
    setLoading(false);
  };
  
  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) { setError(`Error signing in with ${provider}: ${error.message}`); setLoading(false); }
  };

  // --- UI & ANIMATION LOGIC ---
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

  const AnimatedCharacters = ({ text, className }) => {
    const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } } };
    const child = { visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 12, stiffness: 100 } }, hidden: { opacity: 0, y: 20 } };
    return (
      <motion.div variants={container} initial="hidden" animate="visible" className={className} style={{ display: 'flex', justifyContent: 'center' }}>
        {text.split('').map((char, index) => (<motion.span variants={child} key={index}>{char === ' ' ? '\u00A0' : char}</motion.span>))}
      </motion.div>
    );
  };

  if (checkingSession) {
    return <main className="min-h-screen w-full bg-black" />;
  }
  
  const formVariants = {
    hidden: { opacity: 0, y: 20, transition: { duration: 0.3, ease: 'easeOut' } },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeOut' } },
  };
  const itemVariants = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };

  const renderInput = (id, type, placeholder, value, required = true) => (
    <motion.div variants={itemVariants} className="relative">
      <input
        id={id} name={id} type={type} value={value} onChange={handleInputChange} required={required} placeholder=" "
        className="block w-full appearance-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-transparent transition-colors duration-300 peer focus:border-peachSoft focus:outline-none focus:ring-1 focus:ring-peachSoft"
      />
      <label
        htmlFor={id}
        className="absolute top-3.5 left-4 text-gray-400 transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-peachSoft peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-peachSoft bg-transparent px-1"
      >
        {placeholder}
      </label>
    </motion.div>
  );

  const renderView = () => {
    switch (view) {
      case 'signUp': return (
        <motion.div key="signUp" variants={formVariants} initial="hidden" animate="visible" exit="exit">
          <motion.form onSubmit={handleSignUp} className="space-y-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07 } } }}>
            <div className="grid grid-cols-2 gap-4">
              {renderInput('firstName', 'text', 'First Name', formState.firstName)}
              {renderInput('lastName', 'text', 'Last Name', formState.lastName)}
            </div>
            {renderInput('username', 'text', 'Username', formState.username)}
            {renderInput('email', 'email', 'Email Address', formState.email)}
            {renderInput('phone', 'tel', 'Phone Number', formState.phone, false)}
            {renderInput('dob', 'date', 'Date of Birth', formState.dob)}
            {renderInput('password', 'password', 'Password', formState.password)}
            <motion.div variants={itemVariants}>
              <motion.button type="submit" disabled={loading} className="primary-button w-full justify-center">
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
              </motion.button>
            </motion.div>
          </motion.form>
          <p className="text-center text-sm text-gray-400 mt-4"> Already have an account?{' '}
            <button onClick={() => setView('signIn')} className="font-medium text-peachSoft hover:text-white transition-colors">Sign In</button>
          </p>
        </motion.div>
      );
      case 'forgotPassword': return (
        <motion.div key="forgotPassword" variants={formVariants} initial="hidden" animate="visible" exit="exit">
           <motion.form onSubmit={handlePasswordReset} className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {renderInput('email', 'email', 'Email Address', formState.email)}
            <motion.div variants={itemVariants}>
              <motion.button type="submit" disabled={loading} className="primary-button w-full justify-center">
                <span>{loading ? 'Sending...' : 'Send Reset Link'}</span>
              </motion.button>
            </motion.div>
          </motion.form>
          <p className="text-center text-sm text-gray-400 mt-4"> Remembered your password?{' '}
            <button onClick={() => setView('signIn')} className="font-medium text-peachSoft hover:text-white transition-colors">Sign In</button>
          </p>
        </motion.div>
      );
      default: return ( // signIn
        <motion.div key="signIn" variants={formVariants} initial="hidden" animate="visible" exit="exit">
          <motion.form onSubmit={handleSignIn} className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            {renderInput('email', 'email', 'Email Address', formState.email)}
            {renderInput('password', 'password', 'Password', formState.password)}
            <motion.div variants={itemVariants} className="text-right">
              <button type="button" onClick={() => setView('forgotPassword')} className="text-sm font-medium text-peachSoft hover:text-white transition-colors">Forgot Password?</button>
            </motion.div>
            <motion.div variants={itemVariants}>
              <motion.button type="submit" disabled={loading} className="primary-button w-full justify-center">
                <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              </motion.button>
            </motion.div>
          </motion.form>
          <motion.div className="my-6 flex items-center"><div className="flex-grow border-t border-white/10" /><span className="mx-4 flex-shrink text-xs uppercase text-gray-500">Or</span><div className="flex-grow border-t border-white/10" /></motion.div>
          <motion.div className="space-y-3">
            <motion.button className="secondary-button w-full" onClick={() => handleOAuthSignIn('google')} disabled={loading}>
              <FaGoogle className="mr-3 h-5 w-5" /> Continue with Google
            </motion.button>
          </motion.div>
          <p className="text-center text-sm text-gray-400 mt-6"> Don't have an account?{' '}
            <button onClick={() => setView('signUp')} className="font-medium text-peachSoft hover:text-white transition-colors">Sign Up</button>
          </p>
        </motion.div>
      );
    }
  };

  return (
    <main ref={mainRef} onMouseMove={handleMouseMove} className="min-h-screen w-full bg-black text-white flex items-center justify-center font-sans relative overflow-hidden p-4">
      <div ref={vantaRef} className="absolute top-0 left-0 w-full h-full z-0" />
      <motion.div style={{ rotateX, rotateY }} className="holographic-modal holographic-container relative z-10 w-full max-w-md rounded-2xl bg-black/40 p-8">
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
  );
}