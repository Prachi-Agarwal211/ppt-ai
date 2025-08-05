'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCpu, FiEdit, FiLayout, FiPlay, FiArrowLeft, FiArrowRight, FiX,
  FiImage, FiVideo, FiGitMerge, FiShare2, FiDownload, FiBriefcase, FiLink, FiClipboard, FiLogOut,
  FiUploadCloud, FiType, FiSend, FiPlus, FiTrash2, FiLayers, FiChevronsLeft, FiChevronsRight, FiLoader
} from 'react-icons/fi';
import { createClient } from '../../utils/supabase/client';
import mammoth from 'mammoth';
import mermaid from 'mermaid';
import { usePresentationStore } from '../../utils/store';

// --- MERMAID CONFIG ---
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    background: '#1a1a2e',
    primaryColor: '#3a3a5e',
    primaryTextColor: '#f8f8ff',
    lineColor: '#f8f8ff',
    textColor: '#f8f8ff',
  }
});

/**
 * ====================================================================
 * Main Dashboard Component
 * ====================================================================
 */
export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const {
    slides, activeSlideId, isGenerating, generationError, presentationsHistory,
    currentSlideIndex, nextSlide, prevSlide, historyLoading,
    startPresentation, setActiveSlideId, updateSlide, addSlide, deleteSlide,
    fetchHistory, loadPresentation
  } = usePresentationStore();

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('idea');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
      } else {
        setLoading(false);
        fetchHistory();
      }
    };
    checkUser();
  }, [router, fetchHistory]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleStartPresentation = async (config) => {
    const success = await startPresentation(config);
    if (success) {
      setView('outline'); // Switch view immediately
    }
  };
  
  const handleLoadHistoryItem = async (id) => {
    const success = await loadPresentation(id);
    if (success) {
      setView('outline');
    }
  };

  const activeSlide = slides.find(s => s.id === activeSlideId);

  if (loading) return <main className="min-h-screen w-full bg-black flex items-center justify-center"><FiLoader className="text-4xl animate-spin text-white" /></main>;

  return (
    <main className="h-screen w-full text-white flex flex-col font-sans relative overflow-hidden">
      <div className="relative z-10 flex flex-col flex-grow h-full">
        <Header 
          view={view} 
          setView={setView} 
          onShare={() => setIsShareModalOpen(true)} 
          onPresent={() => setView('presentation')} 
          onLogout={handleLogout}
          slidesExist={slides.length > 0}
        />
        <div className="flex-grow flex overflow-hidden">
          <AnimatePresence>
            {/* Show sidebar if generating OR if slides exist */}
            {(isGenerating || (slides.length > 0)) && (view === 'outline' || view === 'deck') && (
              <motion.aside 
                initial={{ width: 0, opacity: 0, padding: 0 }}
                animate={{ width: 288, opacity: 1, padding: '1rem' }}
                exit={{ width: 0, opacity: 0, padding: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-black/20 border-r border-white/10 flex flex-col overflow-hidden"
              >
                <LeftSidebar 
                  slides={slides} 
                  activeSlideId={activeSlideId} 
                  onSlideChange={setActiveSlideId}
                  onAddSlide={addSlide}
                  onDeleteSlide={deleteSlide}
                  isGenerating={isGenerating}
                />
              </motion.aside>
            )}
          </AnimatePresence>

          <main className="flex-grow p-6 flex flex-col overflow-y-auto">
            <AnimatePresence mode="wait">
              {view === 'idea' && (
                <IdeaView 
                  key="idea" 
                  onStart={handleStartPresentation} 
                  isGenerating={isGenerating}
                  error={generationError}
                />
              )}
              {view === 'outline' && <OutlineView key="outline" slide={activeSlide} onUpdate={updateSlide} onProceed={() => setView('deck')} />}
              {view === 'deck' && <DeckView key="deck" slide={activeSlide} />}
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {isRightSidebarOpen && (
              <motion.aside 
                initial={{ width: 0, opacity: 0, padding: 0 }}
                animate={{ width: 352, opacity: 1, padding: '1rem' }}
                exit={{ width: 0, opacity: 0, padding: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="w-88 bg-black/20 border-l border-white/10 flex flex-col overflow-hidden"
              >
                {view === 'idea' && <HistorySidebar history={presentationsHistory} onLoad={handleLoadHistoryItem} isLoading={historyLoading} />}
                {(view === 'outline' || view === 'deck') && <AIChatSidebar />}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
      <PresentationView 
        isVisible={view === 'presentation'} 
        slides={slides} 
        onClose={() => setView('deck')} 
        currentSlideIndex={currentSlideIndex}
        nextSlide={nextSlide}
        prevSlide={prevSlide}
      />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </main>
  );
}

const LeftSidebar = ({ slides, activeSlideId, onSlideChange, onAddSlide, onDeleteSlide, isGenerating }) => (
    <>
      <h3 className="text-xl font-semibold mb-4 text-gray-200 flex-shrink-0">Outline</h3>
      <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-2">
        {slides.map((slide, index) => (
          <div key={slide.id || index} className="group relative">
            <button 
              onClick={() => onSlideChange(slide.id)} 
              className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-start gap-3 ${activeSlideId === slide.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
            >
              <span className="font-semibold text-sm mt-1">{index + 1}</span>
              <div className="flex-grow min-w-0">
                <p className="font-semibold text-white text-sm truncate">{slide.title}</p>
                <p className="text-xs text-gray-400 line-clamp-2">{Array.isArray(slide.points) ? slide.points.join(' ') : ''}</p>
              </div>
            </button>
            <button onClick={() => onDeleteSlide(slide.id)} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-500 rounded-full hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiTrash2 size={14}/>
            </button>
          </div>
        ))}
        {isGenerating && (
            <div className="flex items-center gap-3 p-3 text-sm text-gray-400">
                <FiLoader className="animate-spin" />
                <span>Generating slides...</span>
            </div>
        )}
      </div>
      <div className="flex-shrink-0 pt-2 border-t border-white/10">
          <button onClick={onAddSlide} disabled={isGenerating} className="secondary-button w-full justify-center text-sm disabled:opacity-50">
            <FiPlus className="mr-2" /> Add Slide
          </button>
      </div>
    </>
);

// --- All other components remain unchanged from the previous step. They are included here for completeness. ---

const Header = ({ view, setView, onShare, onPresent, onLogout, slidesExist }) => (
    <header className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight bg-clip-text text-transparent">Nether AI</div>
      </div>
      <nav className="flex items-center gap-2 p-1 rounded-full bg-black/30 border border-white/10">
        {[{name:'Idea',icon:FiCpu,key:'idea'},{name:'Outline',icon:FiEdit,key:'outline'},{name:'Deck',icon:FiLayout,key:'deck'}].map(item=>(
          <motion.button 
            key={item.key} 
            onClick={()=>setView(item.key)} 
            className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-300 ${view===item.key?'text-white':'text-gray-400 hover:text-white'} ${!slidesExist && item.key !== 'idea' ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={!slidesExist && item.key !== 'idea'}
          >
            {view===item.key&&<motion.div layoutId="nav-underline" className="absolute inset-0 bg-white/10 rounded-full" transition={{type:'spring',stiffness:300,damping:30}}/>} 
            <span className="relative z-10 flex items-center gap-2"><item.icon/> {item.name}</span>
          </motion.button>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <motion.button title="My Projects" className="secondary-button p-2"><FiBriefcase size={20}/></motion.button>
        <motion.button title="Share" onClick={onShare} disabled={!slidesExist} className="secondary-button p-2 disabled:opacity-50 disabled:cursor-not-allowed"><FiShare2 size={20}/></motion.button>
        <motion.button title="Download" disabled={!slidesExist} className="secondary-button p-2 disabled:opacity-50 disabled:cursor-not-allowed"><FiDownload size={20}/></motion.button>
        <motion.button title="Present" onClick={onPresent} disabled={!slidesExist} className="primary-button text-sm py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"><FiPlay className="mr-2"/> Present</motion.button>
        <motion.button title="Logout" onClick={onLogout} className="secondary-button p-2"><FiLogOut size={20}/></motion.button>
      </div>
    </header>
  );
  
const IdeaView = ({ onStart, isGenerating, error }) => {
    const [inputMode, setInputMode] = useState('text');
    const [text, setText] = useState('');
    const [link, setLink] = useState('');
    const [file, setFile] = useState(null);
    const [slideCount, setSlideCount] = useState(7);
    const fileInputRef = useRef(null);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (isGenerating) return;
  
      let config = {};
      if (inputMode === 'text' && text.trim()) {
        config = { type: 'text', content: text };
      } else if (inputMode === 'link' && link.trim()) {
        config = { type: 'link', content: link };
      } else if (inputMode === 'file' && file) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          config = { type: 'text', content: result.value };
        } catch (err) {
          console.error('Error reading docx file:', err);
          alert('Could not read the content of the selected file. Please try another one.');
          return;
        }
      }
      
      if (Object.keys(config).length > 0) {
        onStart({ ...config, slideCount });
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
                    {file ? <p>{file.name}</p> : <><FiUploadCloud className="text-3xl mb-2" /><p>Click to upload a document (.docx)</p></>}
                  </label>
                  <input id="file-upload" ref={fileInputRef} type="file" className="sr-only" accept=".docx" onChange={e => setFile(e.target.files[0])} />
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="mt-4">
                <label htmlFor="slide-count" className="block text-sm font-medium text-gray-300 mb-2">Number of Slides</label>
                <input
                  type="number"
                  id="slide-count"
                  name="slide-count"
                  value={slideCount}
                  onChange={(e) => setSlideCount(parseInt(e.target.value, 10))}
                  min="3"
                  max="15"
                  className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-peachSoft"
                />
            </div>
  
            <button type="submit" disabled={isGenerating} className="primary-button w-full justify-center mt-4">
              {isGenerating ? <><FiLoader className="mr-2 animate-spin" /> Generating...</> : <><FiCpu className="mr-2" /> Generate Presentation</>}
            </button>
            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
          </form>
        </div>
      </motion.div>
    );
};
  
const HistoryItemSkeleton = () => (
    <div className="w-full p-3 rounded-lg bg-white/5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
    </div>
);

const HistorySidebar = ({ history, onLoad, isLoading }) => (
    <>
      <h3 className="text-xl font-semibold mb-4 text-gray-200">History</h3>
      <div className="flex-grow overflow-y-auto pr-2 space-y-2">
        {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <HistoryItemSkeleton key={i} />)
        ) : history.length > 0 ? (
            history.map(item => (
                <button key={item.id} onClick={() => onLoad(item.id)} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <p className="font-semibold text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</p>
                </button>
            ))
        ) : (
            <p className="text-center text-sm text-gray-500 mt-4">No presentations found.</p>
        )}
      </div>
    </>
);
  
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
            <textarea value={Array.isArray(slide.points) ? slide.points.join('\n') : ''} onChange={(e) => onUpdate(slide.id, 'points', e.target.value.split('\n'))} rows={8} className="mt-1 block w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-white resize-none focus:outline-none focus:border-white/20 focus:bg-white/5" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Speaker Notes</label>
            <textarea value={slide.notes || ''} onChange={(e) => onUpdate(slide.id, 'notes', e.target.value)} rows={4} className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-white resize-none" />
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

const MermaidDiagram = ({ chart }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current && chart) {
      ref.current.innerHTML = '';
      try {
        mermaid.render(`mermaid-${Date.now()}`, chart, (svgCode) => {
          if (ref.current) {
             ref.current.innerHTML = svgCode;
          }
        });
      } catch (e) {
        console.error("Mermaid render error:", e);
        ref.current.innerHTML = "Error rendering diagram.";
      }
    }
  }, [chart]);

  return <div ref={ref} className="w-full h-full flex items-center justify-center mermaid-diagram-container" />;
};

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
            <div className="space-y-2 text-xl text-gray-300 w-full h-full">
              {slide.points.map((point, i) => {
                const isMermaid = point.trim().startsWith('graph') || point.trim().startsWith('sequenceDiagram') || point.trim().startsWith('gantt');
                if (isMermaid) {
                  return <MermaidDiagram key={i} chart={point} />;
                }
                return <p key={i}>{point}</p>;
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
  
const AIChatSidebar = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!input.trim()) return;
        setMessages(prev => [...prev, {role: 'user', content: input}]);
        setInput('');
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

const PresentationView = ({ isVisible, onClose, slides, currentSlideIndex, nextSlide, prevSlide }) => {
    const activeSlide = slides[currentSlideIndex];
  
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (!isVisible) return;
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, nextSlide, prevSlide, onClose]);
  
    return (
      <AnimatePresence>
        {isVisible && activeSlide && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="w-full h-full p-16 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeSlide.id} 
                  initial={{ opacity: 0, x: 50 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -50 }} 
                  transition={{ duration: 0.3 }}
                  className="w-full h-full flex flex-col justify-center items-center text-center p-8"
                >
                  <h1 className="text-6xl font-bold text-white mb-8">{activeSlide.title}</h1>
                  <ul className="space-y-4 text-3xl text-gray-300">
                    {activeSlide.points.map((point, i) => <motion.li key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>{point}</motion.li>)}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
            
            <button onClick={prevSlide} className="absolute top-1/2 left-6 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30" disabled={currentSlideIndex === 0}><FiArrowLeft size={32} /></button>
            <button onClick={nextSlide} className="absolute top-1/2 right-6 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30" disabled={currentSlideIndex === slides.length - 1}><FiArrowRight size={32} /></button>
            <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FiX size={32} /></button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-sm">{currentSlideIndex + 1} / {slides.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    );
};

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