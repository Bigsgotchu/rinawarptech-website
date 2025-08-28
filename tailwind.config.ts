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
        primary: '#FF2D9B',    // Hot Pink
        secondary: '#0F9B8E',  // Teal
        accent: '#FF7A59',     // Coral
        lightBlue1: '#B7D9F7', // Light Ocean Blue
        lightBlue2: '#8FCCF1', // Ocean Blue
        'primary-dark': '#E01483', // Deep Pink
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
