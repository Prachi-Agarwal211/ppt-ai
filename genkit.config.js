// genkit.config.js
// Phase 3.3: Genkit configuration for local development

import { configureGenkit } from 'genkit';

export default configureGenkit({
  plugins: [],
  enableTracingAndMetrics: true,
  logLevel: 'info',
});
