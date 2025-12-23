module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        retro: {
          surface: '#e9e4d8',
          panel: '#faf4df',
          panelBorder: '#c5bca5',
          panelHeader: '#d9cfb6',
          panelHeaderBorder: '#b9af96',
          text: '#2e2720',
          muted: '#6b5840',
          brand: '#154b5f',
          brandDark: '#123d4c',
          brandBorder: '#0e2f3c',
        },
      },
      boxShadow: {
        retroPanel: '4px 4px 0 #c5bca5',
        retroButton: '3px 3px 0 #0e2f3c',
      },
      borderRadius: {
        sm: '3px',
      },
      spacing: {
        1.5: '0.375rem',
        2.5: '0.625rem',
        3.5: '0.875rem',
        4.5: '1.125rem',
        5.5: '1.375rem',
      },
      fontFamily: {
        yekan: ['Yekan', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      letterSpacing: {
        wider2: '0.2em',
        widest35: '0.35em',
        widest5: '0.5em',
        widest4: '0.4em',
        widest3: '0.3em',
      },
    },
  },
  plugins: [],
}
