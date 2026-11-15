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
        focus: 'var(--color-focus)',
        'accent-soft': 'var(--color-accent-weak)',
        // Solid action surface: stays dark in light mode and paper-bright in
        // dark mode, so `bg-solid text-solid-ink` is legible in both themes
        // without a `dark:` override at every call site.
        solid: 'var(--color-solid)',
        'solid-hover': 'var(--color-solid-hover)',
        'solid-ink': 'var(--color-solid-ink)',
        inverse: 'var(--color-inverse)',
        'inverse-ink': 'var(--color-inverse-ink)',
        'inverse-muted': 'var(--color-inverse-muted)',
        'inverse-safe': 'var(--color-inverse-safe)',
        'inverse-caution': 'var(--color-inverse-caution)',
        'inverse-danger': 'var(--color-inverse-danger)',
        overlay: 'var(--color-overlay)',
        slate: {
          50: 'var(--color-paper)', 100: 'var(--color-paper-2)',
          200: 'var(--color-rule)', 300: 'var(--color-rule-strong)',
          400: 'var(--color-muted-2)', 500: 'var(--color-muted)',
          600: 'var(--color-ink-2)', 700: 'var(--color-ink-2)',
          800: 'var(--color-ink)', 900: 'var(--color-surface)',
          950: 'var(--color-paper)',
        },
        // Legacy green aliases. They now resolve to the neutral ramp so a
        // missed `teal-*` / `emerald-*` class can never paint the old green.
        teal: {
          50: 'var(--color-accent-weak)', 100: 'var(--color-accent-weak)',
          200: 'var(--color-accent-weak)', 300: 'var(--color-accent)',
          400: 'var(--color-accent)', 500: 'var(--color-accent)',
          600: 'var(--color-accent)', 700: 'var(--color-accent)',
          800: 'var(--color-accent-strong)', 900: 'var(--color-accent-strong)',
        },
        emerald: {
          50: 'var(--color-safe-soft)', 100: 'var(--color-safe-soft)',
          200: 'var(--color-safe-soft)', 300: 'var(--color-safe)',
          400: 'var(--color-safe)', 500: 'var(--color-safe)',
          600: 'var(--color-safe)', 700: 'var(--color-safe)',
          800: 'var(--color-safe)', 900: 'var(--color-safe)',
          950: 'var(--color-safe-soft)',
        },
        brand: {
          50: 'var(--color-accent-weak)', 100: 'var(--color-accent-weak)',
          600: 'var(--color-accent)', 700: 'var(--color-accent)',
          800: 'var(--color-accent-strong)', 900: 'var(--color-accent-strong)',
        },
        safe: 'var(--color-safe)', caution: 'var(--color-caution)', danger: 'var(--color-danger)',
        'safe-soft': 'var(--color-safe-soft)', 'caution-soft': 'var(--color-caution-soft)',
        'danger-soft': 'var(--color-danger-soft)',
        'map-ground': 'var(--color-map-ground)', 'map-road': 'var(--color-map-road)',
      },
      boxShadow: { pop: 'var(--shadow-overlay)' },
      borderRadius: { xl: 'var(--radius-control)', '2xl': 'var(--radius-surface)', '3xl': 'var(--radius-overlay)' },
    },
  },
  plugins: [],
}
