/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Colors - matching existing design system
      colors: {
        // Surfaces
        canvas: {
          DEFAULT: '#f7f6f2',
          dark: '#0e1310',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#fbfbf9',
          raised: '#ffffff',
          dark: '#151b17',
          'subtle-dark': '#1a211d',
          'raised-dark': '#1c2420',
        },
        
        // Text colors
        ink: {
          DEFAULT: '#1d2b23',
          dark: '#e9edea',
        },
        text: {
          DEFAULT: '#46534b',
          muted: '#6d7a72',
          faint: '#99a39c',
          dark: '#c0c8c2',
          'muted-dark': '#93a098',
          'faint-dark': '#6d7973',
        },
        
        // Border colors
        border: {
          DEFAULT: '#e5e7e2',
          strong: '#cfd4cd',
          dark: '#27302a',
          'strong-dark': '#39453e',
        },
        
        // Brand - deep civic green
        primary: {
          DEFAULT: '#166534',
          hover: '#135430',
          active: '#10462a',
          on: '#ffffff',
          subtle: '#edf5ef',
          'subtle-border': '#d4e7da',
          text: '#14532d',
          dark: '#21835b',
          'hover-dark': '#1c7451',
          'active-dark': '#186344',
          'on-dark': '#f2fbf5',
          'subtle-dark': '#132a1e',
          'subtle-border-dark': '#1f4a34',
          'text-dark': '#8fd8b0',
        },
        
        // Saffron - national accent
        saffron: {
          DEFAULT: '#d97722',
          subtle: '#fdf3e7',
          dark: '#e9a355',
          'subtle-dark': '#2b2115',
        },
        
        // Status colors
        status: {
          pending: {
            text: '#92400e',
            bg: '#fdf6e9',
            border: '#f3ddb0',
            dot: '#f59e0b',
            'text-dark': '#f5c26b',
            'bg-dark': '#2a2113',
            'border-dark': '#4d3c17',
          },
          progress: {
            text: '#1e40af',
            bg: '#eef4fe',
            border: '#c7dbfb',
            dot: '#3b82f6',
            'text-dark': '#96bdfb',
            'bg-dark': '#14213a',
            'border-dark': '#24406d',
          },
          resolved: {
            text: '#166534',
            bg: '#eef8f1',
            border: '#c4e8d1',
            dot: '#22c55e',
            'text-dark': '#7fdca4',
            'bg-dark': '#122819',
            'border-dark': '#1e4d31',
          },
          rejected: {
            text: '#b91c1c',
            bg: '#fdf0f0',
            border: '#f5caca',
            dot: '#ef4444',
            'text-dark': '#f3a2a2',
            'bg-dark': '#2c1516',
            'border-dark': '#54222a',
          },
        },
        
        // Feedback colors
        danger: {
          DEFAULT: '#b3261e',
          subtle: '#fdf0ef',
          dark: '#f3a2a2',
          'subtle-dark': '#2c1516',
        },
        warning: {
          DEFAULT: '#92400e',
          subtle: '#fdf6e9',
          dark: '#f5c26b',
          'subtle-dark': '#2a2113',
        },
        info: {
          DEFAULT: '#1e40af',
          subtle: '#eef4fe',
          dark: '#96bdfb',
          'subtle-dark': '#14213a',
        },
        success: {
          DEFAULT: '#166534',
          subtle: '#eef8f1',
          dark: '#7fdca4',
          'subtle-dark': '#122819',
        },
      },
      
      // Shadows - matching existing design system
      boxShadow: {
        xs: '0 1px 2px rgba(29, 43, 35, 0.05)',
        sm: '0 1px 3px rgba(29, 43, 35, 0.07), 0 1px 2px rgba(29, 43, 35, 0.05)',
        md: '0 4px 14px -3px rgba(29, 43, 35, 0.10), 0 2px 4px rgba(29, 43, 35, 0.04)',
        lg: '0 16px 40px -12px rgba(29, 43, 35, 0.22)',
        dark: {
          xs: '0 1px 2px rgba(0, 0, 0, 0.30)',
          sm: '0 1px 3px rgba(0, 0, 0, 0.35)',
          md: '0 4px 14px -3px rgba(0, 0, 0, 0.45)',
          lg: '0 16px 40px -12px rgba(0, 0, 0, 0.60)',
        },
      },
      
      // Border radius
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
        pill: '999px',
      },
      
      // Spacing - layout constants
      spacing: {
        'topbar': '60px',
        'sidebar': '252px',
        'sidebar-collapsed': '68px',
        'content-max': '1200px',
      },
      
      // Typography
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        'display': ['clamp(2.1rem, 4.6vw, 3.25rem)', {
          lineHeight: '1.08',
          fontWeight: '700',
          letterSpacing: '-0.028em',
        }],
      },
      
      // Animation and transitions
      transitionDuration: {
        fast: '130ms',
        DEFAULT: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      
      // Custom animation
      animation: {
        'spin': 'spin 0.7s linear infinite',
      },
      keyframes: {
        spin: {
          'to': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}