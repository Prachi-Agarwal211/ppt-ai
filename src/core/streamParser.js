import { validateIncremental } from './schema';

let buffer = '';
const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

export const resetStreamBuffer = () => {
  buffer = '';
};

export const createSlideStream = () => {
  return new TransformStream({
    transform(chunk, controller) {
      const text = decoder ? decoder.decode(chunk, { stream: true }) : String(chunk);
      buffer += text;
      const parts = buffer.split('}{');
      for (let i = 0; i < parts.length - 1; i++) {
        const candidate = (i === 0 ? parts[i] + '}' : '{' + parts[i])
          .replace(/^```json\s*/i, '')
          .replace(/```$/i, '');
        const validated = validateIncremental(candidate);
        if (validated) controller.enqueue(validated);
      }
      buffer = '{' + parts[parts.length - 1];
    },
  });
};

