import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Garantiert immer im Bundle – verhindert Purging bei dynamisch
    // genutzten Klassen in Shared Components (z.B. BerichtePage, ZAPanel)
    'text-green-600',
    'text-green-700',
    'text-green-800',
    'bg-green-50',
    'bg-green-100',
    'bg-green-200',
    'border-green-400',
    'border-green-600',
    'text-blue-600',
    'text-blue-700',
    'text-blue-800',
    'bg-blue-50',
    'bg-blue-100',
    'bg-blue-200',
    'border-blue-400',
    'border-blue-600',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
