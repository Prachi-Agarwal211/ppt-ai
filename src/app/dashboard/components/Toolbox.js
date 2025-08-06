import { FiImage, FiVideo, FiCpu, FiGitMerge, FiLayers, FiSettings, FiLoader } from 'react-icons/fi';
import { usePresentationStore } from '../../../utils/store';

export const Toolbox = () => {
    const { 
        activeSlideId, 
        presentationId,
        isDiagramGenerating, 
        isImageGenerating,
        isThemeGenerating,
        generateDiagramForSlide, 
        generateImageForSlide,
        generateThemeForPresentation
    } = usePresentationStore(state => ({
        activeSlideId: state.activeSlideId,
        presentationId: state.presentationId,
        isDiagramGenerating: state.isDiagramGenerating,
        isImageGenerating: state.isImageGenerating,
        isThemeGenerating: state.isThemeGenerating,
        generateDiagramForSlide: state.generateDiagramForSlide,
        generateImageForSlide: state.generateImageForSlide,
        generateThemeForPresentation: state.generateThemeForPresentation
    }));

    const activeSlide = usePresentationStore(state => state.slides.find(s => s.id === state.activeSlideId));

    const handleGenerateDiagram = () => {
        if (activeSlideId) {
            generateDiagramForSlide(activeSlideId);
        }
    };
    
    const handleGenerateImage = () => {
        if (activeSlideId) {
            generateImageForSlide(activeSlideId);
        }
    };

    const handleGenerateTheme = () => {
        generateThemeForPresentation();
    };

    const isImageButtonDisabled = isImageGenerating || !activeSlideId || !activeSlide?.image_suggestion;

    return (
        <div className="bg-black/20 border border-white/10 rounded-lg p-2 space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 px-2">AI TOOLS</h4>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handleGenerateImage} 
                    disabled={isImageButtonDisabled} 
                    className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50"
                    title={!activeSlide?.image_suggestion ? "This slide has no image suggestion from the AI." : "Generate an AI image"}
                >
                    {isImageGenerating ? <FiLoader className="mr-2 animate-spin"/> : <FiCpu className="mr-2"/>}
                    {isImageGenerating ? 'Generating...' : 'AI Image'}
                </button>

                <button 
                    onClick={handleGenerateDiagram} 
                    disabled={isDiagramGenerating || !activeSlideId} 
                    className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50"
                >
                    {isDiagramGenerating ? <FiLoader className="mr-2 animate-spin"/> : <FiGitMerge className="mr-2"/>}
                    {isDiagramGenerating ? 'Generating...' : '✨ AI Diagram'}
                </button>
            </div>
            <h4 className="text-xs font-semibold text-gray-400 px-2 pt-2">STYLE</h4>
            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={handleGenerateTheme}
                    disabled={isThemeGenerating || !presentationId}
                    className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50"
                >
                    {isThemeGenerating ? <FiLoader className="mr-2 animate-spin"/> : <FiLayers className="mr-2"/>}
                    {isThemeGenerating ? 'Generating...' : '✨ AI Theme'}
                </button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiImage className="mr-2"/> Insert Image</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiVideo className="mr-2"/> Insert Video</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiSettings className="mr-2"/> Color Scheme</button>
            </div>
        </div>
    );
};