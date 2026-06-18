/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Liquid Glass System
        glass: {
          light: 'rgba(255,255,255,0.72)',
          dark: 'rgba(15,20,30,0.75)',
          border: 'rgba(255,255,255,0.18)',
          'border-dark': 'rgba(255,255,255,0.08)',
        },
        // Premium Earth Palette
        earth: {
          50:  '#fdf8f3',
          100: '#f5e9d8',
          200: '#e8cead',
          300: '#d4a876',
          400: '#c08a4e',
          500: '#a67040',
          600: '#8a5a34',
          700: '#6e4528',
          800: '#523218',
          900: '#3a2010',
        },
        // Ocean Blues
        ocean: {
          50:  '#f0f7ff',
          100: '#daeeff',
          200: '#add7ff',
          300: '#6abbff',
          400: '#3d9fe0',
          500: '#1e7fc4',
          600: '#1462a0',
          700: '#114d80',
          800: '#0e3b61',
          900: '#092643',
        },
        // Forest Greens
        forest: {
          50:  '#f0faf4',
          100: '#d6f3e0',
          200: '#a8e4be',
          300: '#6bcf94',
          400: '#38b66c',
          500: '#1a9951',
          600: '#127a3f',
          700: '#0f5e31',
          800: '#0c4625',
          900: '#08301a',
        },
        // Sunset/Warm
        sunset: {
          50:  '#fff8f0',
          100: '#ffecd6',
          200: '#ffd4a8',
          300: '#ffb270',
          400: '#ff8a3d',
          500: '#f5681a',
          600: '#d44d0f',
          700: '#a83a0c',
          800: '#7d2c0b',
          900: '#561e09',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '10xl': ['10rem', { lineHeight: '1', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '3rem',
      },
      backdropBlur: {
        xs: '2px',
        '4xl': '72px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': `
          radial-gradient(at 40% 20%, hsla(28,100%,74%,0.15) 0px, transparent 50%),
          radial-gradient(at 80% 0%, hsla(189,100%,56%,0.1) 0px, transparent 50%),
          radial-gradient(at 0% 50%, hsla(355,100%,93%,0.1) 0px, transparent 50%),
          radial-gradient(at 80% 50%, hsla(340,100%,76%,0.1) 0px, transparent 50%),
          radial-gradient(at 0% 100%, hsla(22,100%,77%,0.1) 0px, transparent 50%),
          radial-gradient(at 80% 100%, hsla(242,100%,70%,0.1) 0px, transparent 50%),
          radial-gradient(at 0% 0%, hsla(343,100%,76%,0.05) 0px, transparent 50%)
        `,
        // Nature backgrounds for dark mode
        'nature-mountains': "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80&auto=format')",
        'nature-forest': "url('https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80&auto=format')",
        'nature-ocean': "url('https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80&auto=format')",
        'nature-landscape': "url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80&auto=format')",
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(32px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        blob: {
          '0%': { transform: 'translate(0px,0px) scale(1)' },
          '33%': { transform: 'translate(30px,-50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.9)' },
          '100%': { transform: 'translate(0px,0px) scale(1)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2s infinite linear',
        'fade-in': 'fade-in 0.6s ease-out',
        'slide-in-right': 'slide-in-right 0.5s ease-out',
        float: 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        blob: 'blob 7s infinite',
        'spin-slow': 'spin-slow 12s linear infinite',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.2)',
        'glass-dark': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glass-hover': '0 16px 48px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25)',
        premium: '0 24px 80px rgba(0,0,0,0.15)',
        'premium-dark': '0 24px 80px rgba(0,0,0,0.5)',
        card: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.1)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '128': '32rem',
        '144': '36rem',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
