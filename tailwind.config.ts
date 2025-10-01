import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'text-primary': '#F9FAFB',
        'text-secondary': '#E5E7EB',
        'text-muted': '#9CA3AF',
        'accent-purple': '#7C3AED',
      },
      backgroundColor: {
        'white/8': 'rgba(255, 255, 255, 0.08)',
        'white/5': 'rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}

export default config
