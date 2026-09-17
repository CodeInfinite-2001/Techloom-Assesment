import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#030706',
          900: '#060d0a',
          850: '#0a1410',
          800: '#0e1d17',
          700: '#152d24',
          neon: '#00ff88',
          emerald: '#10b981',
          dim: '#059669',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glass-neon': '0 0 25px rgba(0, 255, 136, 0.18)',
        'glass-neon-lg': '0 0 45px rgba(0, 255, 136, 0.28)',
        'glass-card': '0 8px 32px 0 rgba(0, 0, 0, 0.6)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
};
