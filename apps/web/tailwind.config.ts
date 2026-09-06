import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--mf-ink, 28 25 23) / <alpha-value>)',
        cream: 'rgb(var(--mf-cream, 245 240 232) / <alpha-value>)',
        clay: '#b08968',
        moss: '#3f4a3c',
        primary: 'rgb(var(--mf-primary) / <alpha-value>)',
        secondary: 'rgb(var(--mf-secondary) / <alpha-value>)',
        accent: 'rgb(var(--mf-accent) / <alpha-value>)',
        surface: 'rgb(var(--mf-surface) / <alpha-value>)',
        sidebar: 'rgb(var(--mf-sidebar) / <alpha-value>)',
        'sidebar-fg': 'rgb(var(--mf-sidebar-fg) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
