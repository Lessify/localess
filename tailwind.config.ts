import type { Config } from 'tailwindcss';
import { PluginAPI } from 'tailwindcss/types/config';

export default {
  content: ['./src/**/*.{html,scss,ts}'],
  theme: {
    extend: {
    },
  },
  plugins: [],
} satisfies Config;
