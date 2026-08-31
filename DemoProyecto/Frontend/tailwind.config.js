/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /*
          ==========================================================================
          LEGUMEX · Control Operativo — Material 3 theme (LIGHT ONLY)
          --------------------------------------------------------------------------
          Paleta "ink" corporativa monocromática, alineada 1:1 (mismos nombres de
          token M3) con el sistema de referencia. Solo cambian los valores hex:
          minimalista, seria y cohesiva — no verde agroindustrial, no pastel.
          El rojo queda reservado exclusivamente para eliminar / errores.
          ==========================================================================
        */
        'inverse-primary': '#d4d5d9',
        'surface-container-low': '#fafbfc',
        'header-fill': '#fafbfc',
        'tertiary-fixed': '#e4e5eb',
        'surface-container-highest': '#e4e5eb',
        error: '#b3453b',
        'on-tertiary-fixed-variant': '#4b4e57',
        'on-tertiary-container': '#6b6e7b',
        'on-error': '#ffffff',
        'tertiary-container': '#1a1a1a',
        'secondary-container': '#e7e8ed',
        'outline-variant': '#e2e4ea',
        'on-secondary-fixed': '#33353c',
        secondary: '#5c5f68',
        primary: '#1a1a1a',
        'surface-container-high': '#eaebf0',
        'on-primary-container': '#1a1a1a',
        'tertiary-fixed-dim': '#c7c9ce',
        'on-tertiary': '#ffffff',
        'secondary-fixed-dim': '#c1c3ca',
        'surface-dim': '#e9eaef',
        'error-container': '#f1dcd9',
        'on-secondary': '#ffffff',
        'inverse-on-surface': '#f3f4f7',
        'surface-blue': '#f1f2f5',
        'on-primary-fixed': '#1a1a1a',
        tertiary: '#1a1a1a',
        'surface-container-lowest': '#ffffff',
        'primary-fixed-dim': '#c9cacd',
        'surface-variant': '#e2e4ea',
        'on-primary-fixed-variant': '#3a3c43',
        'on-surface-subtle': '#6b6e7b',
        'on-tertiary-fixed': '#1a1a1a',
        'surface-tint': '#1a1a1a',
        'on-secondary-fixed-variant': '#33353c',
        'on-surface-variant': '#6b6e7b',
        outline: '#a9adb9',
        'surface-container': '#f1f2f5',
        background: '#f3f4f7',
        'on-secondary-container': '#33353c',
        'border-muted': '#e2e4ea',
        'surface-bright': '#ffffff',
        surface: '#ffffff',
        'inverse-surface': '#2a2c34',
        'primary-fixed': '#e7e7e9',
        'on-surface': '#2a2c34',
        'primary-container': '#e7e7e9',
        'secondary-fixed': '#e7e8ed',
        'on-background': '#2a2c34',
        'on-primary': '#ffffff',
        'on-error-container': '#7a2f27',
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        lg: '0.875rem',
        xl: '1rem',
        full: '9999px',
      },
      spacing: {
        'stack-xs': '4px',
        'container-padding': '16px',
        'stack-md': '16px',
        'column-gap': '20px',
        'stack-lg': '24px',
        'drawer-width': '288px',
        'stack-sm': '8px',
      },
      fontFamily: {
        'body-lg': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'headline-md': ['Manrope', 'Inter', 'sans-serif'],
        'body-md': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'headline-lg': ['Manrope', 'Inter', 'sans-serif'],
        'label-sm': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'label-bold': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'headline-md': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'label-sm': ['11px', { lineHeight: '14px', fontWeight: '500' }],
        'label-bold': ['12px', { lineHeight: '16px', fontWeight: '700' }],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')],
}
