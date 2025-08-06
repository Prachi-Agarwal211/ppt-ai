import { MermaidDiagram } from './MermaidDiagram';

/**
 * A "smart" component that renders different diagram types.
 * If the syntax is 'mermaid', it uses the fast client-side renderer.
 * For everything else (PlantUML, D2, etc.), it expects raw SVG content from the Kroki API.
 * @param {object} props - The component props.
 * @param {string} props.content - The diagram code or SVG content.
 * @param {string} props.syntax - The syntax of the diagram (e.g., 'mermaid', 'plantuml').
 */
export const Diagram = ({ content, syntax }) => {
    if (!content) return null;

    // For mermaid, we pass the raw code to the specialized client-side component.
    if (syntax === 'mermaid') {
        return (
             <div className="w-full h-full bg-white rounded-md p-2 overflow-auto">
                <MermaidDiagram chart={content} />
            </div>
        );
    }

    // For everything else, we expect the content to be a complete SVG string from the Kroki API.
    return (
        <div className="w-full h-full bg-white rounded-md p-2 overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
    );
};