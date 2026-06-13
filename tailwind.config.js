/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}','./components/**/*.{js,jsx}','./lib/**/*.{js,jsx}'],
  theme: { extend: { fontFamily: { sans: ['DM Sans','system-ui','sans-serif'] }, letterSpacing: { tighter:'-0.025em' } } },
  plugins: [],
};
