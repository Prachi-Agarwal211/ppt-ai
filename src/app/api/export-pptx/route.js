// src/app/api/export-pptx/route.js
// Phase 4.2: Server-side PPTX export endpoint

import { NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

export async function POST(req) {
  try {
    const { presentation, recipes } = await req.json();
    
    if (!presentation || !recipes || !Array.isArray(recipes)) {
      return NextResponse.json({ error: 'Invalid presentation data' }, { status: 400 });
    }

    // Create new presentation
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.author = 'Nether AI';
    pptx.company = 'Nether AI';
    pptx.title = presentation.topic || 'Presentation';
    
    // Generate slides from recipes
    recipes.forEach((recipe, index) => {
      const slide = pptx.addSlide();
      
      // Set background if specified
      if (recipe.background?.color) {
        slide.background = { fill: recipe.background.color };
      }
      
      // Add elements based on recipe
      (recipe.elements || []).forEach((element, elIndex) => {
        const baseOptions = {
          x: 0.5,
          y: 0.5 + (elIndex * 1.5),
          w: 9,
          h: 1,
          color: 'ffffff',
          fontSize: 18,
          fontFace: 'Arial'
        };
        
        switch (element.type) {
          case 'Title':
            slide.addText(String(element.content || 'Title'), {
              ...baseOptions,
              y: 0.5,
              h: 1.5,
              fontSize: 36,
              bold: true,
              align: 'center'
            });
            break;
            
          case 'BulletedList':
            if (Array.isArray(element.content)) {
              const bulletText = element.content.map(item => `• ${item}`).join('\n');
              slide.addText(bulletText, {
                ...baseOptions,
                y: 2,
                h: 4,
                fontSize: 24,
                valign: 'top'
              });
            }
            break;
            
          case 'Paragraph':
            slide.addText(String(element.content || ''), {
              ...baseOptions,
              fontSize: 20,
              valign: 'top'
            });
            break;
            
          case 'Quote':
            slide.addText(`"${element.content}"`, {
              ...baseOptions,
              fontSize: 24,
              italic: true,
              align: 'center',
              valign: 'middle'
            });
            break;
            
          case 'Stat':
            const statValue = typeof element.content === 'object' ? element.content.value : element.content;
            const statDesc = typeof element.content === 'object' ? element.content.description : '';
            slide.addText(String(statValue), {
              ...baseOptions,
              fontSize: 48,
              bold: true,
              color: 'ffe1c6',
              align: 'center'
            });
            if (statDesc) {
              slide.addText(String(statDesc), {
                ...baseOptions,
                y: baseOptions.y + 1,
                fontSize: 18,
                align: 'center'
              });
            }
            break;
        }
      });
      
      // Add slide number
      slide.addText(`${index + 1}`, {
        x: 9.5,
        y: 7,
        w: 0.5,
        h: 0.3,
        fontSize: 12,
        color: 'cccccc',
        align: 'center'
      });
    });
    
    // Generate the PPTX file
    const pptxData = await pptx.write({ outputType: 'arraybuffer' });
    
    // Return the file as response
    const filename = `${(presentation.topic || 'presentation').replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
    
    return new NextResponse(pptxData, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pptxData.byteLength.toString()
      }
    });
    
  } catch (error) {
    console.error('PPTX Export Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate PPTX file',
      details: error.message 
    }, { status: 500 });
  }
}
