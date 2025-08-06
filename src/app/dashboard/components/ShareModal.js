import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLink, FiClipboard, FiCheck, FiLoader } from 'react-icons/fi';
import { usePresentationStore } from '@/utils/store';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

export const ShareModal = ({ isOpen, onClose }) => {
    const supabase = createClient();
    const presentationId = usePresentationStore(state => state.presentationId);
    const [presentationData, setPresentationData] = useState(null);
    const [isPublic, setIsPublic] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchPresentationStatus = async () => {
            if (isOpen && presentationId) {
                setIsLoading(true);
                const { data, error } = await supabase
                    .from('presentations')
                    .select('is_public, share_id')
                    .eq('id', presentationId)
                    .single();

                if (!error && data) {
                    setPresentationData(data);
                    setIsPublic(data.is_public);
                } else if (error) {
                    toast.error("Error fetching presentation status.");
                    console.error("Error fetching presentation status:", error);
                }
                setIsLoading(false);
            }
        };
        fetchPresentationStatus();
    }, [isOpen, presentationId, supabase]);

    const handleTogglePublic = async () => {
        setIsLoading(true);
        const newPublicStatus = !isPublic;
        const { data, error } = await supabase
            .from('presentations')
            .update({ is_public: newPublicStatus })
            .eq('id', presentationId)
            .select('share_id')
            .single();
        
        if (!error) {
            toast.success(`Presentation is now ${newPublicStatus ? 'public' : 'private'}.`);
            setIsPublic(newPublicStatus);
            setPresentationData(prev => ({ ...prev, share_id: data.share_id }));
        } else {
            toast.error("Failed to update public status.");
            console.error("Failed to update public status", error);
        }
        setIsLoading(false);
    };

    const handleCopyLink = () => {
        if (presentationData?.share_id) {
            const url = `${window.location.origin}/share/${presentationData.share_id}`;
            navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    const shareUrl = presentationData?.share_id ? `${window.location.origin}/share/${presentationData.share_id}` : '';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="bg-[#1a1a2e] rounded-xl p-6 border border-white/20 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Share Presentation</h3>
                        <div className="flex items-center justify-between mb-4">
                            <label htmlFor="public-toggle" className="text-gray-300">Make Publicly Accessible</label>
                            <button onClick={handleTogglePublic} disabled={isLoading} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPublic ? 'bg-green-500' : 'bg-gray-600'}`}>
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        
                        <AnimatePresence>
                        {isPublic && (
                             <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2">
                                <FiLink className="text-gray-400 flex-shrink-0" />
                                <input type="text" readOnly value={shareUrl} className="w-full bg-white/5 p-2 rounded text-gray-300 text-sm" />
                                <motion.button onClick={handleCopyLink} className="secondary-button p-2 flex-shrink-0">
                                    {copied ? <FiCheck size={20} className="text-green-400" /> : <FiClipboard size={20} />}
                                </motion.button>
                            </motion.div>
                        )}
                        </AnimatePresence>
                        
                        {!isPublic && !isLoading && (
                            <p className="text-sm text-gray-400 text-center p-4 bg-white/5 rounded-lg">Enable public access to get a shareable link.</p>
                        )}

                        {isLoading && (
                             <div className="w-full h-10 flex items-center justify-center">
                                <FiLoader className="animate-spin text-white"/>
                             </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};