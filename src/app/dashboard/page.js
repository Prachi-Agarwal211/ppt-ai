'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCpu, FiEdit, FiLayout, FiPlay, FiArrowLeft, FiArrowRight, FiX,
  FiImage, FiVideo, FiMessageSquare, FiBarChart2, FiGitMerge,
  FiShare2, FiDownload, FiBriefcase, FiLink, FiClipboard, FiLogOut,
  FiUploadCloud, FiType, FiGlobe, FiSend, FiPaperclip, FiMenu, FiSettings,
  FiPlus, FiTrash2, FiLayers, FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import { createClient } from '../../utils/supabase/client';

// Mock data for initial state and history
const initialSlides = [
  { id: 1, title: 'The Future of Renewable Energy', points: ['Harnessing the power of tomorrow, today.', 'A presentation by Nether AI.'], notes: 'Start with a strong opening statement.' },
  { id: 2, title: 'The Rise of Solar Power', points: ['Exponential growth in solar panel efficiency.', 'Decreasing costs making solar more accessible.'], notes: 'Mention key statistics.' },
  { id: 3, title: 'Wind Energy: A Gentle Giant', points: ['Advancements in turbine design.', 'Offshore wind farms and their potential.'], notes: 'Discuss environmental impact.' },
];

const presentationHistory = [
    { id: 'pres-1', title: 'Quarterly Business Review', date: '2 days ago' },
    { id: 'pres-2', title: 'Marketing Strategy Q3', date: '1 week ago' },
    { id: 'pres-3', title: 'Project Phoenix Kickoff', date: '3 weeks ago' },
];

/**
 * ====================================================================
 * Main Dashboard Component
 * Manages state for the entire presentation creation process.
 * ====================================================================
 */
export default function DashboardPage() {
  // --- CORE HOOKS & CLIENTS ---
  const supabase = createClient();
  const router = useRouter();
  const vantaRef = useRef(null);
  const [vantaEffect, setVantaEffect] = useState(null);
  const threeRef = useRef(null);

  // --- GLOBAL UI STATE ---
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('idea'); // 'idea', 'outline', 'deck', 'presentation'
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // --- PRESENTATION DATA STATE ---
  const [slides, setSlides] = useState([]);
  const [activeSlideId, setActiveSlideId] = useState(null);
  
  // --- SESSION & INITIALIZATION ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.replace('/');
      else setLoading(false);
    };
    checkUser();
  }, [router]);

  // --- VANTA.JS BACKGROUND LOGIC ---
  useEffect(() => {
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    const initVanta = async () => {
      try {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        threeRef.current = window.THREE;
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js');

        if (window.VANTA && vantaRef.current && !vantaEffect) {
          setVantaEffect(
            window.VANTA.FOG({
              el: vantaRef.current, THREE: threeRef.current,
              mouseControls: true, touchControls: true, gyroControls: false,
              minHeight: 200.0, minWidth: 200.0, baseColor: 0x0,
              highlightColor: 0x9c88ff, midtoneColor: 0x4d4480, lowlightColor: 0x19142b,
              blurFactor: 0.55, speed: 1.2, zoom: 0.8,
            })
          );
        }
      } catch (error) { console.error("Vanta.js script loading failed:", error); }
    };
    initVanta();
    return () => vantaEffect?.destroy();
  }, [vantaRef]);

  // --- HANDLERS ---
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/'); };
  const handleStartPresentation = (config) => {
    // In a real app, you'd generate slides based on the config from an API
    console.log("Starting presentation with config:", config);
    setSlides(initialSlides);
    setActiveSlideId(initialSlides[0]?.id);
    setView('outline');
  };
  const handleSlideChange = (id) => setActiveSlideId(id);
  const handleUpdateSlide = (id, field, value) => {
    setSlides(slides.map(s => s.id === id ? { ...s, [field]: field === 'points' ? value.split('\n') : value } : s));
  };
  const activeSlide = slides.find(s => s.id === activeSlideId);

  // --- LOADING STATE ---
  if (loading) return <main className="min-h-screen w-full bg-black flex items-center justify-center"><p className="text-white">Loading Session...</p></main>;

  // --- RENDER ---
  return (
    <main className="h-screen w-full bg-black text-white flex flex-col font-sans relative overflow-hidden">
      <div ref={vantaRef} className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="relative z-10 flex flex-col flex-grow h-full">
        <Header 
          view={view} 
          setView={setView} 
          onShare={() => setIsShareModalOpen(true)} 
          onPresent={() => setView('presentation')} 
          onLogout={handleLogout} 
        />
        <div className="flex-grow flex overflow-hidden">
          {/* Left Sidebar for Outline and Deck views */}
          <AnimatePresence>
            {(view === 'outline' || view === 'deck') && (
              <motion.aside 
                initial={{ width: 0, opacity: 0, padding: 0 }}
                animate={{ width: 288, opacity: 1, padding: '1rem' }}
                exit={{ width: 0, opacity: 0, padding: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-black/20 border-r border-white/10 flex flex-col overflow-hidden"
              >
                <LeftSidebar slides={slides} activeSlideId={activeSlideId} onSlideChange={handleSlideChange} />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <main className="flex-grow p-6 flex flex-col overflow-y-auto">
            <AnimatePresence mode="wait">
              {view === 'idea' && <IdeaView key="idea" onStart={handleStartPresentation} />}
              {view === 'outline' && <OutlineView key="outline" slide={activeSlide} onUpdate={handleUpdateSlide} onProceed={() => setView('deck')} />}
              {view === 'deck' && <DeckView key="deck" slide={activeSlide} />}
            </AnimatePresence>
          </main>

          {/* Right Sidebar */}
          <AnimatePresence>
            {isRightSidebarOpen && (
              <motion.aside 
                initial={{ width: 0, opacity: 0, padding: 0 }}
                animate={{ width: 352, opacity: 1, padding: '1rem' }}
                exit={{ width: 0, opacity: 0, padding: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="w-88 bg-black/20 border-l border-white/10 flex flex-col overflow-hidden"
              >
                {view === 'idea' && <HistorySidebar history={presentationHistory} />}
                {(view === 'outline' || view === 'deck') && <AIChatSidebar />}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Modals and Fullscreen Views */}
      <PresentationView isVisible={view === 'presentation'} slides={slides} onClose={() => setView('deck')} />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </main>
  );
}

/**
 * ====================================================================
 * Header Component
 * ====================================================================
 */
const Header = ({ view, setView, onShare, onPresent, onLogout }) => (
  <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm flex-shrink-0">
    <div className="flex items-center gap-4">
      <div className="text-2xl font-bold bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight bg-clip-text text-transparent">Nether AI</div>
    </div>
    <nav className="flex items-center gap-2 p-1 rounded-full bg-black/30 border border-white/10">
      {[{name:'Idea',icon:FiCpu,key:'idea'},{name:'Outline',icon:FiEdit,key:'outline'},{name:'Deck',icon:FiLayout,key:'deck'}].map(item=>(
        <motion.button 
          key={item.key} 
          onClick={()=>setView(item.key)} 
          className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${view===item.key?'text-white':'text-gray-400 hover:text-white'}`}
        >
          {view===item.key&&<motion.div layoutId="nav-underline" className="absolute inset-0 bg-white/10 rounded-full" transition={{type:'spring',stiffness:300,damping:30}}/>} 
          <span className="relative z-10 flex items-center gap-2"><item.icon/> {item.name}</span>
        </motion.button>
      ))}
    </nav>
    <div className="flex items-center gap-2">
      <motion.button title="My Projects" className="secondary-button p-2"><FiBriefcase size={20}/></motion.button>
      <motion.button title="Share" onClick={onShare} className="secondary-button p-2"><FiShare2 size={20}/></motion.button>
      <motion.button title="Download" className="secondary-button p-2"><FiDownload size={20}/></motion.button>
      <motion.button title="Present" onClick={onPresent} className="primary-button text-sm py-2 px-3"><FiPlay className="mr-2"/> Present</motion.button>
      <motion.button title="Logout" onClick={onLogout} className="secondary-button p-2"><FiLogOut size={20}/></motion.button>
    </div>
  </header>
);

/**
 * ====================================================================
 * Idea View Components
 * ====================================================================
 */
const IdeaView = ({ onStart }) => {
  const [inputMode, setInputMode] = useState('text'); // 'text', 'link', 'file'
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    let config = {};
    if (inputMode === 'text' && text.trim()) config = { type: 'text', content: text };
    if (inputMode === 'link' && link.trim()) config = { type: 'link', content: link };
    if (inputMode === 'file' && file) config = { type: 'file', content: file.name };
    
    if (Object.keys(config).length > 0) {
      onStart(config);
    }
  };

  return (
    <motion.div key="idea" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="flex h-full flex-col items-center justify-center">
      <AnimatedCharacters text="Let's Create Your Presentation" className="text-4xl font-bold bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight bg-clip-text text-transparent mb-4" />
      <p className="text-gray-400 mb-6">Start with a topic, a link, or a document.</p>
      
      <div className="w-full max-w-2xl bg-black/20 rounded-2xl border border-white/10 p-6">
        <div className="flex gap-2 mb-4 p-1 bg-black/20 rounded-full">
          {[{key: 'text', icon: FiType, label: 'From Text'}, {key: 'link', icon: FiLink, label: 'From Link'}, {key: 'file', icon: FiUploadCloud, label: 'From File'}].map(mode => (
            <button key={mode.key} onClick={() => setInputMode(mode.key)} className={`flex-1 text-sm py-2 rounded-full flex items-center justify-center gap-2 transition-colors ${inputMode === mode.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
              <mode.icon /> {mode.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {inputMode === 'text' && (
              <motion.textarea key="text" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} value={text} onChange={e => setText(e.target.value)} placeholder="e.g., A presentation on the history of space exploration..." rows="4" className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-peachSoft resize-none"></motion.textarea>
            )}
            {inputMode === 'link' && (
              <motion.input key="link" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://example.com/article" className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-peachSoft" />
            )}
            {inputMode === 'file' && (
              <motion.div key="file" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                <label htmlFor="file-upload" className="w-full flex flex-col items-center justify-center bg-white/5 rounded-lg p-6 border-2 border-dashed border-white/20 cursor-pointer hover:bg-white/10">
                  {file ? <p>{file.name}</p> : <><FiUploadCloud className="text-3xl mb-2" /><p>Click to upload a document</p></>}
                </label>
                <input id="file-upload" ref={fileInputRef} type="file" className="sr-only" onChange={e => setFile(e.target.files[0])} />
              </motion.div>
            )}
          </AnimatePresence>
          <button type="submit" className="primary-button w-full justify-center mt-4">
            <FiCpu className="mr-2" /> Generate Presentation
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const HistorySidebar = ({ history }) => (
  <>
    <h3 className="text-xl font-semibold mb-4 text-gray-200">History</h3>
    <div className="flex-grow overflow-y-auto pr-2 space-y-2">
      {history.map(item => (
        <button key={item.id} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <p className="font-semibold text-white truncate">{item.title}</p>
          <p className="text-xs text-gray-400">{item.date}</p>
        </button>
      ))}
    </div>
  </>
);

/**
 * ====================================================================
 * Outline View Components
 * ====================================================================
 */
const OutlineView = ({ slide, onUpdate, onProceed }) => {
  if (!slide) return <div className="flex h-full items-center justify-center text-gray-400">Select a slide to begin editing.</div>;
  
  return (
    <motion.div key="outline" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-4 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-300">Title</label>
          <input type="text" value={slide.title} onChange={(e) => onUpdate(slide.id, 'title', e.target.value)} className="mt-1 block w-full text-2xl font-bold rounded-lg border border-transparent bg-transparent px-2 py-1 text-white focus:outline-none focus:border-white/20 focus:bg-white/5" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300">Content</label>
          <textarea value={slide.points.join('\n')} onChange={(e) => onUpdate(slide.id, 'points', e.target.value)} rows={8} className="mt-1 block w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-white resize-none focus:outline-none focus:border-white/20 focus:bg-white/5" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300">Speaker Notes</label>
          <textarea value={slide.notes} onChange={(e) => onUpdate(slide.id, 'notes', e.target.value)} rows={4} className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-white resize-none" />
        </div>
      </div>
      <div className="flex-shrink-0 mt-4">
        <Toolbox />
        <motion.button onClick={onProceed} className="primary-button mt-4 w-full justify-center">
          <FiLayout className="mr-2" /> Proceed to Deck
        </motion.button>
      </div>
    </motion.div>
  );
};

const Toolbox = () => (
    <div className="bg-black/20 border border-white/10 rounded-lg p-2 space-y-2">
        <h4 className="text-xs font-semibold text-gray-400 px-2">TOOLS</h4>
        <div className="grid grid-cols-2 gap-2">
            <button className="secondary-button !rounded-lg justify-start text-sm"><FiImage className="mr-2"/> Insert Image</button>
            <button className="secondary-button !rounded-lg justify-start text-sm"><FiVideo className="mr-2"/> Insert Video</button>
            <button className="secondary-button !rounded-lg justify-start text-sm"><FiCpu className="mr-2"/> AI Image</button>
            <button className="secondary-button !rounded-lg justify-start text-sm"><FiGitMerge className="mr-2"/> AI Diagram</button>
            <button className="secondary-button !rounded-lg justify-start text-sm"><FiLayers className="mr-2"/> Change Theme</button>
            <button className="secondary-button !rounded-lg justify-start text-sm"><FiSettings className="mr-2"/> Color Scheme</button>
        </div>
    </div>
);

/**
 * ====================================================================
 * Deck View Components
 * ====================================================================
 */
const DeckView = ({ slide }) => {
  if (!slide) return <div className="flex h-full items-center justify-center text-gray-400">Select a slide to preview.</div>;

  return (
    <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
      <div className="w-full aspect-video bg-black/20 rounded-xl p-8 flex flex-col justify-center items-center border border-white/10 shadow-lg">
        <AnimatePresence mode="wait">
          <motion.div 
            key={slide.id} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="w-full h-full flex flex-col justify-center items-center text-center"
          >
            <h2 className="text-4xl font-bold text-white mb-4">{slide.title}</h2>
            <ul className="space-y-2 text-xl text-gray-300">
              {slide.points.map((point, i) => <li key={i}>{point}</li>)}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};


/**
 * ====================================================================
 * Shared Sidebar & Modal Components
 * ====================================================================
 */
const LeftSidebar = ({ slides, activeSlideId, onSlideChange }) => (
  <>
    <h3 className="text-xl font-semibold mb-4 text-gray-200 flex-shrink-0">Outline</h3>
    <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-2">
      {slides.map((slide, index) => (
        <button 
          key={slide.id} 
          onClick={() => onSlideChange(slide.id)} 
          className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-start gap-3 ${activeSlideId === slide.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
        >
          <span className="font-semibold text-sm mt-1">{index + 1}</span>
          <div className="flex-grow">
            <p className="font-semibold text-white text-sm truncate">{slide.title}</p>
            <p className="text-xs text-gray-400 line-clamp-2">{slide.points.join(' ')}</p>
          </div>
        </button>
      ))}
    </div>
    <div className="flex-shrink-0 pt-2 border-t border-white/10">
        <button className="secondary-button w-full justify-center text-sm"><FiPlus className="mr-2" /> Add Slide</button>
    </div>
  </>
);

const AIChatSidebar = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!input.trim()) return;
        setMessages(prev => [...prev, {role: 'user', content: input}]);
        setInput('');
        // Mock AI response
        setTimeout(() => setMessages(prev => [...prev, {role: 'ai', content: "Okay, I've updated that for you."}]), 1000);
    }

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-gray-200 flex-shrink-0">AI Assistant</h3>
            <div className="flex-grow bg-white/5 rounded-lg p-2 overflow-y-auto space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`text-sm p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500/20 ml-auto' : 'bg-gray-600/30'}`}>{msg.content}</div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="mt-2 flex-shrink-0">
                <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="e.g., Make the title bolder" 
                    className="w-full bg-black/30 p-2 rounded-lg border-t border-white/10 focus:outline-none" 
                />
            </form>
        </div>
    );
}

const PresentationView = ({ isVisible, slides, onClose }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50 flex flex-col">
        <div className="w-full h-full p-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {/* This part needs a state for the current slide index */}
            <motion.div key={slides[0]?.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full h-full flex flex-col justify-center items-center text-center p-8">
              <h1 className="text-6xl font-bold text-white mb-8">{slides[0]?.title}</h1>
              <ul className="space-y-4 text-3xl text-gray-300">
                {slides[0]?.points.map((point, i) => <motion.li key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.2 }}>{point}</motion.li>)}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FiX size={32} /></button>
        {/* Add navigation buttons here */}
      </motion.div>
    )}
  </AnimatePresence>
);

const ShareModal = ({ isOpen, onClose }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-[#1a1a2e] rounded-xl p-6 border border-white/20 w-full max-w-md">
          <h3 className="text-xl font-bold mb-4">Share Presentation</h3>
          <div className="flex items-center gap-2">
            <FiLink className="text-gray-400" />
            <input type="text" readOnly value={`${window.location.origin}/share/some-id`} className="w-full bg-white/5 p-2 rounded text-gray-300" />
            <motion.button className="secondary-button p-2"><FiClipboard size={20} /></motion.button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const AnimatedCharacters = ({ text, className }) => {
  const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const child = { visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 12, stiffness: 100 } }, hidden: { opacity: 0, y: 20 } };
  return <motion.div variants={container} initial="hidden" animate="visible" className={className} style={{ display: 'flex' }}>{text.split('').map((char, index) => <motion.span variants={child} key={index}>{char === ' ' ? '\u00A0' : char}</motion.span>)}</motion.div>;
};
