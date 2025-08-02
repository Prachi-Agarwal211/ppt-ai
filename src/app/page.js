'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaGoogle } from 'react-icons/fa';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { createClient } from '../utils/supabase/client';

/**
 * NetherAISignIn Component - v18 (UI/UX Enhanced)
 *
 * This component now features:
 * - Direct Vanta.js integration for a consistent, color-changing background.
 * - All purple accents are replaced with a cohesive 'peachSoft' off-white theme.
 * - Buttons are correctly styled with `primary-button` and `secondary-button`.
 * - Added password visibility toggle for improved UX.
 * - Enhanced form submission feedback and error handling.
 */
export default function NetherAISignIn() {
  const supabase = createClient();
  const router = useRouter();

  // --- REFS & HOOKS ---
  const mainRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);

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
    // This div is intended to cover the screen during session check.
    // It should have some background to hide content, but if Vanta needs to show through, it needs to be transparent.
    // For now, keeping it solid black for the "loading" state is fine.
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

  const renderPasswordInput = (id, placeholder, value, required = true) => (
    <motion.div variants={itemVariants} className="relative">
      <input
        id={id} name={id} type={showPassword ? 'text' : 'password'} value={value} onChange={handleInputChange} required={required} placeholder=" "
        className="block w-full appearance-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-transparent transition-colors duration-300 peer focus:border-peachSoft focus:outline-none focus:ring-1 focus:ring-peachSoft"
      />
      <label
        htmlFor={id}
        className="absolute top-3.5 left-4 text-gray-400 transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-peachSoft peer-[:not(:placeholder-shown)]:-top-2.5 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-peachSoft bg-transparent px-1"
      >
        {placeholder}
      </label>
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-400 hover:text-peachSoft transition-colors"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <FiEyeOff /> : <FiEye />}
      </button>
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
            {renderPasswordInput('password', 'Password', formState.password)}
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
                <span>{loading ? 'Sending Reset Link...' : 'Send Reset Link'}</span>
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
            {renderPasswordInput('password', 'Password', formState.password)}
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
    // REMOVED bg-black from main to allow Vanta.js to show through
    <main ref={mainRef} onMouseMove={handleMouseMove} className="min-h-screen w-full text-white flex items-center justify-center font-sans relative p-4">
      {/* Vanta.js background is now managed by layout.js */}
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