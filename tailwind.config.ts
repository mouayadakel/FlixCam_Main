import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: '#1F87E8',
  				50: '#EBF5FF',
  				100: '#D6EBFF',
  				200: '#B3DAFF',
  				300: '#80C4FF',
  				400: '#4DA8FF',
  				500: '#1F87E8',
  				600: '#1A6FC0',
  				700: '#155798',
  				800: '#0F3F70',
  				900: '#0A2748',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			error: {
  				50: '#FEF2F2',
  				100: '#FEE2E2',
  				200: '#FECACA',
  				300: '#FCA5A5',
  				400: '#F87171',
  				500: '#EF4444',
  				600: '#DC2626',
  				700: '#B91C1C',
  				800: '#991B1B',
  				900: '#7F1D1D',
  			},
  			success: {
  				50: '#F0FDF4',
  				100: '#DCFCE7',
  				200: '#BBF7D0',
  				300: '#86EFAC',
  				400: '#4ADE80',
  				500: '#10B981',
  				600: '#059669',
  				700: '#047857',
  				800: '#065F46',
  				900: '#064E3B',
  			},
  			warning: {
  				50: '#FFFBEB',
  				100: '#FEF3C7',
  				200: '#FDE68A',
  				300: '#FCD34D',
  				400: '#FBBF24',
  				500: '#F59E0B',
  				600: '#D97706',
  				700: '#B45309',
  				800: '#92400E',
  				900: '#78350F',
  			},
  			neutral: {
  				50: '#F9FAFB',
  				100: '#F3F4F6',
  				200: '#E5E7EB',
  				300: '#D1D5DB',
  				400: '#9CA3AF',
  				500: '#6B7280',
  				600: '#4B5563',
  				700: '#374151',
  				800: '#1F2937',
  				900: '#111827',
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// Public site design tokens (landing-page-design.json)
  			brand: {
  				primary: '#C92C37',
  				'primary-hover': '#A8242D',
  				'primary-light': '#FEF2F2',
  				'secondary-accent': '#25D366',
  			},
  			surface: {
  				light: '#F9F9F9',
  				modal: '#F2F2F2',
  				warm: '#FAFAF8',
  			},
  			footer: {
  				dark: '#1A1A2E',
  				darker: '#12121F',
  			},
  			'text-heading': '#111827',
  			'text-body': '#4B5563',
  			'text-muted': '#9CA3AF',
  			'inverse-heading': '#FFFFFF',
  			'inverse-body': '#D1D5DB',
  			'border-light': '#E5E7EB',
  			'border-input': '#D1D5DB',
  			'sold-out': '#6B7280',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'public-button': '8px',
  			'public-card': '12px',
  			'public-input': '8px',
  			'hero-banner': '24px',
  			'pill': '50px',
  		},
  		boxShadow: {
  			'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
  			'card-hover':
  				'0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  			'card-elevated':
  				'0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
  			'modal':
  				'0 25px 50px -12px rgba(0, 0, 0, 0.15)',
  			'header':
  				'0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
  			'header-scrolled':
  				'0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
  			'glow': '0 0 20px rgba(201, 44, 55, 0.15)',
  			'inner-glow': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
  		},
  		maxWidth: {
  			'public-container': '1320px',
  		},
  		fontSize: {
  			'hero-title': ['42px', { lineHeight: '1.15', fontWeight: '800', letterSpacing: '-0.02em' }],
  			'section-title': ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.01em' }],
  			'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
  			'body-main': ['15px', { lineHeight: '1.65', fontWeight: '400' }],
  			'label-small': ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.5px' }],
  			'price-tag': ['18px', { lineHeight: '1.4', fontWeight: '700' }],
  		},
  		fontFamily: {
  			arabic: ['"Cairo"', 'system-ui', 'sans-serif'],
  			english: ['"Inter"', 'system-ui', 'sans-serif'],
  			mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
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
  			'fade-in': {
  				from: { opacity: '0', transform: 'translateY(8px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'fade-in-up': {
  				from: { opacity: '0', transform: 'translateY(20px)' },
  				to: { opacity: '1', transform: 'translateY(0)' },
  			},
  			'slide-in-right': {
  				from: { opacity: '0', transform: 'translateX(20px)' },
  				to: { opacity: '1', transform: 'translateX(0)' },
  			},
  			'scale-in': {
  				from: { opacity: '0', transform: 'scale(0.95)' },
  				to: { opacity: '1', transform: 'scale(1)' },
  			},
  			'badge-bounce': {
  				'0%, 100%': { transform: 'scale(1)' },
  				'50%': { transform: 'scale(1.2)' },
  			},
  			'shimmer': {
  				from: { backgroundPosition: '-200% 0' },
  				to: { backgroundPosition: '200% 0' },
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0)' },
  				'50%': { transform: 'translateY(-6px)' },
  			},
  			'pulse-subtle': {
  				'0%, 100%': { opacity: '1' },
  				'50%': { opacity: '0.85' },
  			},
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.5s ease-out forwards',
  			'fade-in-up': 'fade-in-up 0.6s ease-out forwards',
  			'slide-in-right': 'slide-in-right 0.5s ease-out forwards',
  			'scale-in': 'scale-in 0.3s ease-out forwards',
  			'badge-bounce': 'badge-bounce 0.3s ease-in-out',
  			'shimmer': 'shimmer 2s linear infinite',
  			'float': 'float 3s ease-in-out infinite',
  			'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
  		},
  		transitionDuration: {
  			'250': '250ms',
  			'350': '350ms',
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'hero-gradient': 'linear-gradient(135deg, #C92C37 0%, #8B1A23 50%, #5C1118 100%)',
  			'hero-gradient-overlay': 'linear-gradient(to right, rgba(201,44,55,0.95) 0%, rgba(139,26,35,0.85) 100%)',
  			'cta-gradient': 'linear-gradient(135deg, #C92C37 0%, #A8242D 100%)',
  			'footer-gradient': 'linear-gradient(180deg, #1A1A2E 0%, #12121F 100%)',
  			'card-shine': 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%)',
  		},
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwindcss-rtl"),
  ],
  darkMode: ['class', 'class'],
}
export default config
