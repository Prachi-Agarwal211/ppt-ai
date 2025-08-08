// src/app/dashboard/components/MermaidDiagram.js

import { useRef, useEffect } from 'react';
import mermaid from 'mermaid';

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

export const MermaidDiagram = ({ chart }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current && chart) {
      ref.current.innerHTML = ''; // Clear previous diagram
      try {
        mermaid.render(`mermaid-${Date.now()}`, chart, (svgCode) => {
          if (ref.current) ref.current.innerHTML = svgCode;
        });
      } catch (e) {
        console.error("Mermaid render error:", e);
        if (ref.current) ref.current.innerHTML = "Error rendering diagram.";
      }
    }
  }, [chart]);

  return <div ref={ref} className="w-full h-full flex items-center justify-center" />;
};