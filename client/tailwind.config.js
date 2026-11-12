/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Bengali"', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Noto Sans Bengali"', 'sans-serif'],
        mono: ['ui-monospace', '"SFMono-Regular"', 'Menlo', 'monospace'],
      },
      colors: {
        ink: 'var(--color-ink)',
        'ink-2': 'var(--color-ink-2)',
        paper: 'var(--color-paper)',
        'paper-2': 'var(--color-paper-2)',
        surface: 'var(--color-surface)',
        rule: 'var(--color-rule)',
        'rule-strong': 'var(--color-rule-strong)',
        muted: 'var(--color-muted)',
        'muted-2': 'var(--color-muted-2)',
        accent: 'var(--color-accent)',
        'accent-strong': 'var(--color-accent-strong)',
        'accent-weak': 'var(--color-accent-weak)',
        'accent-ink': 'var(--color-accent-ink)',
        slate: {
          50: 'var(--color-paper)', 100: 'var(--color-paper-2)',
          200: 'var(--color-rule)', 300: 'var(--color-rule-strong)',
          400: 'var(--color-muted-2)', 500: 'var(--color-muted)',
          600: 'var(--color-ink-2)', 700: 'var(--color-ink-2)',
          800: 'var(--color-ink)', 900: 'var(--color-surface)',
          950: 'var(--color-paper)',
        },
        teal: {
          50: 'var(--color-accent-weak)', 100: 'var(--color-accent-weak)',
          200: 'var(--color-accent-weak)', 300: 'var(--color-accent)',
          400: 'var(--color-accent)', 500: 'var(--color-accent)',
          600: 'var(--color-accent)', 700: 'var(--color-accent)',
          800: 'var(--color-accent-strong)', 900: 'var(--color-accent-strong)',
        },
        brand: {
          50: 'var(--color-accent-weak)', 100: 'var(--color-accent-weak)',
          600: 'var(--color-accent)', 700: 'var(--color-accent)',
          800: 'var(--color-accent-strong)', 900: 'var(--color-accent-strong)',
        },
        safe: 'var(--color-safe)', caution: 'var(--color-caution)', danger: 'var(--color-danger)',
        'map-ground': 'var(--color-map-ground)', 'map-road': 'var(--color-map-road)',
      },
      boxShadow: { pop: 'var(--shadow-overlay)' },
      borderRadius: { xl: 'var(--radius-control)', '2xl': 'var(--radius-surface)', '3xl': 'var(--radius-overlay)' },
    },
  },
  plugins: [],
}
