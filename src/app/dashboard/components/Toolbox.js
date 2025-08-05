import { FiImage, FiVideo, FiCpu, FiGitMerge, FiLayers, FiSettings } from 'react-icons/fi';
import { usePresentationStore } from '../../../utils/store';

export const Toolbox = () => {
    const { activeSlideId, updateSlide, slides } = usePresentationStore(state => ({
        activeSlideId: state.activeSlideId,
        updateSlide: state.updateSlide,
        slides: state.slides
    }));

    const handleInsertDiagram = () => {
        if (!activeSlideId) return;
        const activeSlide = slides.find(s => s.id === activeSlideId);
        if (!activeSlide) return;

        const boilerplateDiagram = 'graph TD;\n  A[Start] --> B(Process);\n  B --> C{Decision};\n  C --> D[End];';
        const newPoints = [...(activeSlide.points || []), boilerplateDiagram];
        updateSlide(activeSlide.id, 'points', newPoints);
    };

    return (
        <div className="bg-black/20 border border-white/10 rounded-lg p-2 space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 px-2">TOOLS</h4>
            <div className="grid grid-cols-2 gap-2">
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiImage className="mr-2"/> Insert Image</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiVideo className="mr-2"/> Insert Video</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiCpu className="mr-2"/> AI Image</button>
                <button onClick={handleInsertDiagram} className="secondary-button !rounded-lg justify-start text-sm"><FiGitMerge className="mr-2"/> Insert Diagram</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiLayers className="mr-2"/> Change Theme</button>
                <button disabled className="secondary-button !rounded-lg justify-start text-sm disabled:opacity-50 cursor-not-allowed"><FiSettings className="mr-2"/> Color Scheme</button>
            </div>
        </div>
    );
};