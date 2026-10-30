import { playfair, inter } from './fonts';

// SaCarta web brand tokens (dark mode), from src/index.css + tailwind.
export const C = {
  ink: '#181310', // background hsl(20 20% 8%)
  ink2: '#201a16', // elevated chrome
  card: '#241D19', // card hsl(20 18% 12%)
  line: '#413B30', // border hsl(20 15% 22%)
  cream: '#F5F3EE', // foreground hsl(30 15% 95%)
  muted: '#A3998F', // muted-foreground hsl(30 10% 60%)
  terracotta: '#E26436', // primary hsl(16 75% 55%)
  terracotta2: '#F97316', // orange-500 (hero gradient via)
  amber: '#ECB613', // accent hsl(45 85% 50%)
  white: '#FFFFFF',
};

export const F = {
  serif: "'Playfair Display', Georgia, serif",
  display: "'Playfair Display', Georgia, serif",
  sans: "'Inter', 'Segoe UI', system-ui, sans-serif",
};

export const FONT_FACE = `
@font-face { font-family: 'Playfair Display'; src: url(${playfair}) format('woff2'); font-weight: 400 700; font-style: normal; font-display: swap; }
@font-face { font-family: 'Inter'; src: url(${inter}) format('woff2'); font-weight: 300 700; font-style: normal; font-display: swap; }
`;
