/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAF8',
        card: '#FFFFFF',
        primary: '#1A2E26',
        muted: '#64748B',
        accent: '#2D6A4F',
        teal: '#4ECDC4',
        coral: '#FF6B6B',
        sage: {
          50: '#F0F5F2',
          100: '#E8F0EA',
          200: '#D1E3D8',
          300: '#A8CBB0',
          400: '#78AD88',
          500: '#2D6A4F',
          600: '#255A42',
          700: '#1D4935',
          800: '#153928',
          900: '#0D281B',
        },
      },
      fontFamily: {
        lora: ['Lora', 'serif'],
        nunito: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        'neumorphic': '0 10px 30px rgba(45, 106, 79, 0.03), 0 1px 8px rgba(0,0,0,0.02)',
        'neumorphic-lg': '0 15px 40px rgba(45, 106, 79, 0.06), 0 3px 12px rgba(0,0,0,0.03)',
        'neumorphic-inset': 'inset 0 2px 8px rgba(45, 106, 79, 0.04), inset 0 1px 3px rgba(0,0,0,0.02)',
        'glow': '0 0 20px rgba(45, 106, 79, 0.2)',
        'crisis': '0 0 30px rgba(255, 107, 107, 0.4)',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'ripple': 'ripple 1.5s ease-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
