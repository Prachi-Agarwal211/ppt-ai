'use client'; // --- FIX: This component uses hooks, so it must be a Client Component.

import { FiCpu, FiGitMerge, FiLayers, FiSettings, FiImage, FiVideo, FiLoader } from 'react-icons/fi';
import { usePresentationStore, getElement } from '@/utils/store';

const AiButton = ({ command, title, icon: Icon, disabled, tooltip }) => {
    const { sendCommand, isAssistantProcessing } = usePresentationStore();
    const isDisabled = disabled || isAssistantProcessing;

    return (
        <button 
            onClick={() => sendCommand({ task: command })} 
            disabled={isDisabled} 
            className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50"
            title={tooltip || title}
        >
            {isAssistantProcessing ? <FiLoader className="mr-2 animate-spin"/> : <Icon className="mr-2"/>}
            {isAssistantProcessing ? 'Processing...' : title}
        </button>
    );
};

export const Toolbox = () => {
    const { presentationId, activeSlideId, slides } = usePresentationStore();
    const activeSlide = slides.find(s => s.id === activeSlideId);
    const hasImageSuggestion = !!(activeSlide && getElement(activeSlide, 'image_suggestion'));

    return (
        <div className="bg-black/20 border border-white/10 rounded-lg p-2 space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 px-2">AI TOOLS</h4>
            <div className="grid grid-cols-2 gap-2">
                <AiButton 
                    command="generate_image" 
                    title="AI Image" 
                    icon={FiCpu} 
                    disabled={!activeSlideId || !hasImageSuggestion} 
                    tooltip={!hasImageSuggestion ? "This slide has no image suggestion from the AI." : "Generate an AI image"}
                />
                <AiButton 
                    command="generate_diagram" 
                    title="✨ AI Diagram" 
                    icon={FiGitMerge} 
                    disabled={!activeSlideId} 
                />
            </div>
            <h4 className="text-xs font-semibold text-gray-400 px-2 pt-2">STYLE</h4>
            <div className="grid grid-cols-2 gap-2">
                <AiButton 
                    command="generate_theme" 
                    title="✨ AI Theme" 
                    icon={FiLayers} 
                    disabled={!presentationId} 
                />
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiImage className="mr-2"/> Insert Image</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiVideo className="mr-2"/> Insert Video</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiSettings className="mr-2"/> Color Scheme</button>
            </div>
        </div>
    );
};