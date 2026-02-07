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
  				'secondary-accent': '#25D366',
  			},
  			surface: {
  				light: '#F9F9F9',
  				modal: '#F2F2F2',
  			},
  			footer: {
  				dark: '#3E3735',
  				darker: '#2C2826',
  			},
  			'text-heading': '#1A1A1A',
  			'text-body': '#666666',
  			'text-muted': '#999999',
  			'inverse-heading': '#FFFFFF',
  			'inverse-body': '#CCCCCC',
  			'border-light': '#E5E5E5',
  			'border-input': '#E0E0E0',
  			'sold-out': '#666666',
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			'public-button': '6px',
  			'public-card': '8px',
  			'public-input': '4px',
  			'hero-banner': '20px',
  			'pill': '50px',
  		},
  		boxShadow: {
  			'card-hover':
  				'0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  			'modal':
  				'0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  		},
  		maxWidth: {
  			'public-container': '1280px',
  		},
  		fontSize: {
  			'hero-title': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
  			'section-title': ['28px', { lineHeight: '1.2', fontWeight: '600' }],
  			'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
  			'body-main': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
  			'label-small': ['12px', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.5px' }],
  			'price-tag': ['16px', { lineHeight: '1.4', fontWeight: '700' }],
  		},
  		fontFamily: {
  			arabic: ['"Cairo"', 'system-ui', 'sans-serif'],
  			english: ['"Inter"', 'system-ui', 'sans-serif'],
  			mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    require("tailwindcss-rtl"),
  ],
  darkMode: ['class', 'class'],
}
export default config
