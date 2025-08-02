'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCpu, FiEdit, FiLayout, FiPlay, FiArrowLeft, FiArrowRight, FiX,
  FiImage, FiVideo, FiMessageSquare, FiBarChart2, FiGitMerge,
  FiShare2, FiDownload, FiBriefcase, FiLink, FiClipboard, FiLogOut,
  FiUploadCloud, FiType, FiGlobe, FiSend, FiPaperclip
} from 'react-icons/fi';
import { createClient } from '../../utils/supabase/client';

// Mock data
const initialSlides = [
  { title: 'The Future of Renewable Energy', points: ['Harnessing the power of tomorrow, today.', 'A presentation by Nether AI.'], notes: 'Start with a strong opening statement.' },
  { title: 'The Rise of Solar Power', points: ['Exponential growth in solar panel efficiency.', 'Decreasing costs making solar more accessible.'], notes: 'Mention key statistics.' },
  { title: 'Wind Energy: A Gentle Giant', points: ['Advancements in turbine design.', 'Offshore wind farms and their potential.'], notes: 'Discuss environmental impact.' },
];

/**
 * NetherAIDashboard Component - v24 (Hotfix)
 *
 * Fixes the 'AnimatedCharacters is not defined' ReferenceError by restoring
 * the missing component definition. All other functionality is preserved.
 */
export default function DashboardPage() {
  // --- CORE HOOKS & CLIENTS ---
  const supabase = createClient();
  const router = useRouter();
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);
  const threeRef = useRef(null); // Ref to hold THREE instance
  const fileInputRef = useRef(null);

  // --- Vanta.js Background Logic (Integrated) ---
  useEffect(() => {
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
        threeRef.current = window.THREE;
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js');

        if (window.VANTA && vantaRef.current && !vantaEffect) {
          const colorPalettes = [
            { highlight: 0x9c88ff },
            { highlight: 0xff4b4b },
            { highlight: 0x00c19b },
            { highlight: 0xff8c00 },
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
              highlightColor: colorPalettes[0].highlight,
              midtoneColor: new threeRef.current.Color(colorPalettes[0].highlight).multiplyScalar(0.5).getHex(),
              lowlightColor: new threeRef.current.Color(colorPalettes[0].highlight).multiplyScalar(0.2).getHex(),
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
  }, [vantaRef]);

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
      cancelAnimationFrame(animationFrameId);
    };
  }, [vantaEffect]);


  // --- GLOBAL UI STATE ---
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('idea');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState('Minimalist');
  const [toolMode, setToolMode] = useState('custom');

  // --- PRESENTATION DATA STATE ---
  const [slides, setSlides] = useState(initialSlides);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  
  // --- CONVERSATIONAL UI STATE ---
  const chatContainerRef = useRef(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [conversationStage, setConversationStage] = useState('awaiting_initial_prompt');
  const [presentationConfig, setPresentationConfig] = useState({});
  const [deckChat, setDeckChat] = useState('');
  const [deckChatHistory, setDeckChatHistory] = useState([]);
  const [attachedFile, setAttachedFile] = useState(null);

  // --- SESSION & INITIALIZATION ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.replace('/');
      else setLoading(false);
    };
    checkUser();
  }, []);

  // Auto-scroll chat
  useEffect(() => { if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight; }, [chatHistory, isAiTyping]);

  // --- HANDLERS ---
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };
  const handleSlideChange = (index) => { if (index >= 0 && index < slides.length) setActiveSlideIndex(index); };
  const handleOutlineUpdate = (index, field, value) => { const newSlides = [...slides]; newSlides[index][field] = field === 'points' ? value.split('\n') : value; setSlides(newSlides); };
  const handleDeckChatSubmit = (e) => { e.preventDefault(); if (deckChat.trim()) { setDeckChatHistory(prev => [...prev, { role: 'user', content: deckChat }]); setTimeout(() => setDeckChatHistory(prev => [...prev, { role: 'ai', content: `Okay, I've made that change to slide ${activeSlideIndex + 1}.` }]), 1000); setDeckChat(''); } };
  const handleFileAttach = (e) => { if (e.target.files && e.target.files[0]) setAttachedFile(e.target.files[0]); };
  const handleRemoveFile = () => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

  // --- CHAT LOGIC ---
  const addMessage = (role, message) => setChatHistory(prev => [...prev, { role, ...message }]);
  const addAiMessage = (message, delay = 1000) => { setIsAiTyping(true); setTimeout(() => { addMessage('ai', message); setIsAiTyping(false); }, delay); };

  const handleUserPromptSubmit = () => {
    if (!userInput.trim() && !attachedFile) return;
    const message = { text: userInput.trim(), file: attachedFile };
    addMessage('user', message);
    setUserInput('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPresentationConfig({ prompt: userInput.trim(), file: attachedFile });
    setConversationStage('awaiting_slides');
    addAiMessage({ text: "That's a great starting point! How many slides should I create for this presentation?", options: ["5", "10", "15"] });
  };

  const handleFollowUpSubmit = (response) => {
    addMessage('user', { text: response });
    switch(conversationStage) {
      case 'awaiting_slides': setPresentationConfig(p => ({ ...p, numSlides: response })); setConversationStage('awaiting_theme'); addAiMessage({ text: "Got it. Which theme would you like to use?", options: ["Minimalist", "Corporate", "Tech"] }); break;
      case 'awaiting_theme': setPresentationConfig(p => ({ ...p, theme: response })); setConversationStage('awaiting_color_preference'); addAiMessage({ text: "Excellent choice. Would you like to specify a custom color palette?", options: ["No, use the theme's default", "Yes, let me specify"] }); break;
      case 'awaiting_color_preference': if (response.includes('Yes')) { setConversationStage('awaiting_custom_color'); addAiMessage({ text: "Of course. Please describe the colors or mood you're going for (e.g., 'A calming blue and gray palette')." }); } else { setPresentationConfig(p => ({ ...p, customColor: 'Default' })); setConversationStage('awaiting_confirmation'); addAiMessage({ text: "Understood. Let's confirm everything before we proceed.", component: 'confirmation' }); } break;
      case 'awaiting_custom_color': setPresentationConfig(p => ({ ...p, customColor: response })); setConversationStage('awaiting_confirmation'); addAiMessage({ text: "Perfect. I have all the details. Please review and confirm.", component: 'confirmation' }); break;
      case 'awaiting_confirmation': if (response === 'confirm') { addAiMessage({ text: "Great! Generating your presentation outline now..." }); setTimeout(() => setView('outline'), 2000); } else { setChatHistory([]); setPresentationConfig({}); setConversationStage('awaiting_initial_prompt'); addAiMessage({ text: "No problem. Let's start over. What would you like to make a presentation about?" }, 500); } break;
    }
  };

  // --- LOADING STATE ---
  if (loading) return <main className="min-h-screen w-full bg-black flex items-center justify-center"><p className="text-white">Loading Session...</p></main>;

  // --- REUSABLE COMPONENTS ---
  // FIXED: Restored the AnimatedCharacters component definition
  const AnimatedCharacters = ({ text, className }) => {
    const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
    const child = { visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 12, stiffness: 100 } }, hidden: { opacity: 0, y: 20 } };
    return <motion.div variants={container} initial="hidden" animate="visible" className={className} style={{ display: 'flex' }}>{text.split('').map((char, index) => <motion.span variants={child} key={index}>{char === ' ' ? '\u00A0' : char}</motion.span>)}</motion.div>;
  };

  const renderThemePanel = () => ( <div className="p-2 bg-white/5 rounded-lg"> <h4 className="text-sm font-semibold mb-2 text-gray-300">Theme</h4> <div className="flex gap-2">{['Minimalist', 'Corporate', 'Tech'].map(theme => (<motion.button key={theme} onClick={() => setActiveTheme(theme)} className={`flex-1 text-xs py-2 rounded-full transition-all duration-300 ${activeTheme === theme ? 'text-[#665c59] bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight font-semibold shadow-inner' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>{theme}</motion.button>))}</div> </div> );
  const renderToolPanel = () => ( <div className="relative mt-4"> <div className="mt-3 space-y-1"><h4 className="text-xs text-gray-400 px-2 pt-1 font-semibold">CUSTOM</h4><button className="secondary-button w-full justify-start text-sm"><FiImage className="mr-2"/> Insert Image</button><button className="secondary-button w-full justify-start text-sm"><FiVideo className="mr-2"/> Insert Video</button><div className="border-t border-white/10 my-1 !mx-2"></div><h4 className="text-xs text-gray-400 px-2 pt-1 font-semibold">AI GENERATED</h4><button className="secondary-button w-full justify-start text-sm"><FiCpu className="mr-2"/> Generate Image</button><button className="secondary-button w-full justify-start text-sm"><FiGitMerge className="mr-2"/> Generate Diagram</button></div> </div> );

  // --- RENDER FUNCTIONS FOR VIEWS ---
  const renderIdeaView = () => (
    <motion.div key="idea" className="flex h-full flex-col items-center justify-center">
      <AnimatedCharacters text="Let's Create Your Presentation" className="text-4xl font-bold bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight bg-clip-text text-transparent mb-4" />
      <p className="text-gray-400 mb-6">Start by describing your topic or attaching a file below.</p>
      <div className="w-full max-w-3xl h-[60vh] bg-black/20 rounded-2xl border border-white/10 flex flex-col p-4">
        <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-2 space-y-6">{chatHistory.map((msg, index) => <ChatMessage key={index} {...msg} />)}{isAiTyping && <TypingIndicator />}</div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <AnimatePresence>
            {attachedFile && (
              <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="mb-2">
                <div className="flex items-center justify-between bg-white/10 text-white text-sm rounded-lg px-3 py-2">
                  <span>Attached: <span className="font-medium">{attachedFile.name}</span></span>
                  <button onClick={handleRemoveFile} className="text-gray-400 hover:text-white"><FiX /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-3">
            <label htmlFor="chat-file-input" className="secondary-button p-3 cursor-pointer"><FiPaperclip /></label>
            <input ref={fileInputRef} id="chat-file-input" type="file" className="sr-only" onChange={handleFileAttach} />
            <form onSubmit={(e) => { e.preventDefault(); handleUserPromptSubmit(); }} className="flex-grow">
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Make a presentation about..." className="w-full bg-white/5 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-1 focus:ring-peachSoft" />
            </form>
            <button onClick={handleUserPromptSubmit} className="primary-button p-3" disabled={(!userInput && !attachedFile) || isAiTyping}><FiSend /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const ChatMessage = ({ role, text, file, options, component }) => {
    const isAi = role === 'ai';
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${isAi ? 'justify-start' : 'justify-end'}`}>
        <div className={`w-full max-w-xl p-4 rounded-2xl ${isAi ? 'bg-white/10 text-white rounded-bl-none' : 'bg-peachSoft/80 text-gray-800 font-medium rounded-br-none'}`}>
          {text && <p>{text}</p>}
          {file && <div className="mt-2 text-sm bg-black/10 p-2 rounded-lg">File: {file.name}</div>}
          {options && <div className="mt-3 flex flex-wrap gap-2">{options.map(opt => <motion.button key={opt} whileHover={{scale: 1.05}} onClick={() => handleFollowUpSubmit(opt)} className="secondary-button text-xs !rounded-lg" disabled={isAiTyping}>{opt}</motion.button>)}</div>}
          {component === 'confirmation' && <ConfirmationComponent config={presentationConfig} onConfirm={() => handleFollowUpSubmit('confirm')} onReset={() => handleFollowUpSubmit('reset')} />}
        </div>
      </motion.div>
    );
  };
  
  const ConfirmationComponent = ({ config, onConfirm, onReset }) => (
    <div className="mt-2 space-y-3">
        <h4 className="font-bold">Summary:</h4>
        <ul className="text-sm space-y-1 list-disc list-inside">
            <li><strong>Source:</strong> {config.file ? `File (${config.file.name})` : `Topic ("${config.prompt}")`}</li>
            <li><strong>Slides:</strong> {config.numSlides}</li>
            <li><strong>Theme:</strong> {config.theme}</li>
            <li><strong>Colors:</strong> {config.customColor}</li>
        </ul>
        <div className="flex gap-2 pt-2">
            <button onClick={onConfirm} className="primary-button w-full justify-center">Looks Good, Generate!</button>
            <button onClick={onReset} className="secondary-button w-full justify-center">Start Over</button>
        </div>
    </div>
  );

  const TypingIndicator = () => <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-end gap-2 justify-start"><div className="p-4 rounded-2xl rounded-bl-none bg-white/10 flex items-center gap-2"><motion.span className="h-2 w-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }} /><motion.span className="h-2 w-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, delay: 0.1, repeat: Infinity, ease: "easeInOut" }} /><motion.span className="h-2 w-2 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }} /></div></motion.div>;
  const renderOutlineView = () => ( <motion.div key="outline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full gap-6"> <div className="w-1/3 flex flex-col"><h3 className="text-xl font-semibold mb-4 text-gray-200">Outline</h3><div className="flex-grow overflow-y-auto pr-2">{slides.map((slide, index) => <button key={index} onClick={() => setActiveSlideIndex(index)} className={`w-full text-left p-3 rounded-lg mb-2 transition-colors duration-200 ${activeSlideIndex === index ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}><span className="font-semibold">Slide {index + 1}:</span> {slide.title}</button>)}</div></div> <div className="w-2/3 flex flex-col"><h3 className="text-xl font-semibold mb-4 text-gray-200">Edit Content</h3><div className="flex-grow overflow-y-auto pr-2 space-y-4"><div><label className="text-sm font-medium text-gray-300">Title</label><input type="text" value={slides[activeSlideIndex].title} onChange={(e) => handleOutlineUpdate(activeSlideIndex, 'title', e.target.value)} className="mt-1 block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white" /></div><div><label className="text-sm font-medium text-gray-300">Content</label><textarea value={slides[activeSlideIndex].points.join('\n')} onChange={(e) => handleOutlineUpdate(activeSlideIndex, 'points', e.target.value)} rows={6} className="mt-1 block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white resize-none" /></div><div><label className="text-sm font-medium text-gray-300">Speaker Notes</label><textarea value={slides[activeSlideIndex].notes} onChange={(e) => handleOutlineUpdate(activeSlideIndex, 'notes', e.target.value)} rows={4} className="mt-1 block w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-white resize-none" /></div><motion.button className="secondary-button w-full justify-center"><FiCpu /><span className="ml-2">Generate Speaker Notes</span></motion.button>{renderToolPanel()}<motion.button onClick={() => setView('deck')} className="primary-button mt-4 w-full">Proceed to Deck</motion.button></div></div> </motion.div> );
  const renderDeckView = () => ( <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full gap-6"> <div className="w-1/4 flex flex-col"><h3 className="text-xl font-semibold mb-4 text-gray-200">Slides</h3><div className="flex-grow overflow-y-auto pr-2">{slides.map((slide, index) => <button key={index} onClick={() => setActiveSlideIndex(index)} className={`w-full aspect-video rounded-lg mb-3 transition-all duration-200 border-2 ${activeSlideIndex === index ? 'border-peachSoft' : 'border-transparent hover:border-white/30'}`}><div className="bg-gray-800/50 w-full h-full rounded-md p-2 flex flex-col justify-center items-center text-xs text-center"><p className="font-bold truncate">{slide.title}</p><p className="text-gray-400 mt-1">{slide.points.length} points</p></div></button>)}</div></div> <div className="w-1/2 flex items-center justify-center"><div className="w-full aspect-video bg-black/20 rounded-xl p-8 flex flex-col justify-center items-center border border-white/10"><AnimatePresence mode="wait"><motion.div key={activeSlideIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full h-full flex flex-col justify-center items-center text-center"><h2 className="text-3xl font-bold text-white mb-4">{slides[activeSlideIndex].title}</h2><ul className="space-y-2 text-lg text-gray-300">{slides[activeSlideIndex].points.map((point, i) => <li key={i}>{point}</li>)}</ul></motion.div></AnimatePresence></div></div> <div className="w-1/4 flex flex-col"><h3 className="text-xl font-semibold mb-4 text-gray-200">Tools</h3><div className="space-y-2 mb-4">{renderThemePanel()}<motion.button className="secondary-button w-full justify-center">Magic Layout</motion.button></div>{renderToolPanel()}<div className="flex-grow flex flex-col border-t border-white/10 pt-4 mt-4"><h4 className="text-lg font-semibold mb-2 text-gray-300 flex items-center gap-2"><FiMessageSquare /> AI Slide Editor</h4><div className="flex-grow bg-white/5 rounded-t-lg p-2 overflow-y-auto space-y-2">{deckChatHistory.map((msg,i)=><div key={i} className={`text-sm p-2 rounded-lg ${msg.role==='user'?'bg-blue-500/20 ml-auto':'bg-gray-600/30'}`}>{msg.content}</div>)}</div><form onSubmit={handleDeckChatSubmit}><input type="text" value={deckChat} onChange={e=>setDeckChat(e.target.value)} placeholder="e.g., Make the title bolder" className="w-full bg-black/30 p-2 rounded-b-lg border-t border-white/10 focus:outline-none" /></form></div></div> </motion.div> );
  const renderPresentationView = () => ( <AnimatePresence>{view === 'presentation' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50 flex flex-col"><div className="w-full h-full p-16 flex items-center justify-center"><AnimatePresence mode="wait"><motion.div key={activeSlideIndex} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col justify-center items-center text-center p-8"><h1 className="text-6xl font-bold text-white mb-8">{slides[activeSlideIndex].title}</h1><ul className="space-y-4 text-3xl text-gray-300">{slides[activeSlideIndex].points.map((point, i) => <motion.li key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.2 }}>{point}</motion.li>)}</ul></motion.div></AnimatePresence></div><button onClick={() => setView('deck')} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FiX size={32} /></button><button onClick={() => handleSlideChange(activeSlideIndex - 1)} disabled={activeSlideIndex === 0} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-20"><FiArrowLeft size={40} /></button><button onClick={() => handleSlideChange(activeSlideIndex + 1)} disabled={activeSlideIndex === slides.length - 1} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-20"><FiArrowRight size={40} /></button><div className="absolute bottom-6 text-gray-400 text-lg">{activeSlideIndex + 1} / {slides.length}</div></motion.div>)}</AnimatePresence> );
  const renderShareModal = () => ( <AnimatePresence>{isShareModalOpen && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setIsShareModalOpen(false)}><motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-[#1a1a2e] rounded-xl p-6 border border-white/20 w-full max-w-md"><h3 className="text-xl font-bold mb-4">Share Presentation</h3><div className="flex items-center gap-2"><FiLink className="text-gray-400" /><input type="text" readOnly value={`${window.location.origin}/some-share-path`} className="w-full bg-white/5 p-2 rounded text-gray-300" /><motion.button className="secondary-button p-2"><FiClipboard size={20} /></motion.button></div></motion.div></motion.div>)}</AnimatePresence> );

  return (
    <main className="min-h-screen w-full bg-black text-white flex items-center justify-center font-sans relative overflow-hidden p-4 md:p-8">
      <div ref={vantaRef} className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="holographic-modal holographic-container relative z-10 w-full max-w-7xl h-[90vh] rounded-2xl bg-black/50 backdrop-blur-lg p-6 flex flex-col border border-white/10">
        <header className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="text-2xl font-bold bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight bg-clip-text text-transparent">Nether AI</div>
          <nav className="flex items-center gap-2 p-1 rounded-full bg-black/30 border border-white/10">{[{name:'Idea',icon:FiCpu,key:'idea'},{name:'Outline',icon:FiEdit,key:'outline'},{name:'Deck',icon:FiLayout,key:'deck'}].map(item=><motion.button key={item.key} onClick={()=>setView(item.key)} className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${view===item.key?'text-white':'text-gray-400 hover:text-white'}`}>{view===item.key&&<motion.div layoutId="nav-underline" className="absolute inset-0 bg-white/10 rounded-full" transition={{type:'spring',stiffness:300,damping:30}}/>} <span className="relative z-10 flex items-center gap-2"><item.icon/> {item.name}</span></motion.button>)}</nav>
          <div className="flex items-center gap-2"><motion.button title="My Projects" className="secondary-button p-2"><FiBriefcase size={20}/></motion.button><motion.button title="Share" onClick={() => setIsShareModalOpen(true)} className="secondary-button p-2"><FiShare2 size={20}/></motion.button><motion.button title="Download" className="secondary-button p-2"><FiDownload size={20}/></motion.button><motion.button title="Present" onClick={() => setView('presentation')} className="primary-button text-sm py-2 px-3"><FiPlay className="mr-2"/> Present</motion.button><motion.button title="Logout" onClick={handleLogout} className="secondary-button p-2"><FiLogOut size={20}/></motion.button></div>
        </header>
        <div className="flex-grow pt-6 relative overflow-hidden">
          <AnimatePresence mode="wait">
            {view === 'idea' && renderIdeaView()}
            {view === 'outline' && renderOutlineView()}
            {view === 'deck' && renderDeckView()}
          </AnimatePresence>
        </div>
      </div>
      {renderPresentationView()}
      {renderShareModal()}
    </main>
  );
}