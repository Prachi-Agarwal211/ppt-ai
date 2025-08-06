import { motion } from 'framer-motion';
import { FiCpu, FiEdit, FiLayout, FiPlay, FiShare2, FiDownload, FiLogOut } from 'react-icons/fi';
// Import the new downloader utility
import { generatePptx } from '../../../utils/downloader';

export const Header = ({ view, setView, onShare, onPresent, onLogout, slidesExist }) => {
    
    const handleDownload = () => {
        if (slidesExist) {
            generatePptx();
        }
    };
    
    return (
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
            <motion.button title="Share" onClick={onShare} disabled={!slidesExist} className="secondary-button p-2 disabled:opacity-50 disabled:cursor-not-allowed"><FiShare2 size={20}/></motion.button>
            
            {/* Download button is now enabled and connected */}
            <motion.button 
                title="Download Presentation" 
                onClick={handleDownload} 
                disabled={!slidesExist} 
                className="secondary-button p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <FiDownload size={20}/>
            </motion.button>

            <motion.button title="Present" onClick={onPresent} disabled={!slidesExist} className="primary-button text-sm py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"><FiPlay className="mr-2"/> Present</motion.button>
            <motion.button title="Logout" onClick={onLogout} className="secondary-button p-2"><FiLogOut size={20}/></motion.button>
          </div>
        </header>
    );
};