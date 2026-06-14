/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      'var(--bg)',
        bg2:     'var(--bg2)',
        card:    'var(--card)',
        card2:   'var(--card2)',
        border:  'var(--border)',
        border2: 'var(--border2)',
        text:    'var(--text)',
        text2:   'var(--text2)',
        text3:   'var(--text3)',
        blue:    'var(--blue)',
        blue2:   'var(--blue2)',
        cyan:    'var(--cyan)',
        gold:    'var(--gold)',
        gold2:   'var(--gold2)',
        green:   'var(--green)',
        red:     'var(--red)',
        yellow:  'var(--yellow)',
        purple:  'var(--purple)',
        orange:  'var(--orange)',
      },
    },
  },
  plugins: [],
}
