// src/app/dashboard/components/ElementRenderer.js
'use client';

import { motion } from 'framer-motion';
import DOMPurify from 'isomorphic-dompurify';

/**
 * A shared component to render different types of slide elements.
 * @param {object} props - The component props.
 * @param {object} props.element - The element object to render.
 * @param {object} [props.theme] - Optional theme object for styling.
 */
export const ElementRenderer = ({ element, theme = {} }) => {
    if (!element) return null;

    const titleStyle = theme.primary_color ? { color: theme.primary_color } : {};

    switch (element.type) {
        case 'title':
            return <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold w-full h-full p-2 overflow-hidden flex items-center justify-center text-center" style={titleStyle}>{element.content}</h1>;
            
        case 'content':
            const points = Array.isArray(element.content) ? element.content : [];
            return (
                <ul className="space-y-3 text-lg sm:text-xl md:text-2xl text-gray-300 text-left w-full h-full p-4 overflow-auto">
                    {points.map((point, i) => (
                        <motion.li key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                            • {point}
                        </motion.li>
                    ))}
                </ul>
            );
            
        case 'diagram':
             return <div className="w-full h-full bg-white rounded-md p-2 overflow-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(element.content) }} />;
             
        default:
            return null;
    }
};