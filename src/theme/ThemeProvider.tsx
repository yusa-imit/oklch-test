import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Global, css } from '@emotion/react';
import { cssVarsByFormula, DEFAULT_HUE, BASE_L, BASE_C } from './tokens';
import type { FormulaVersion } from './tokens';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  hue: number;
  chroma: number;
  lightness: number;
  formula: FormulaVersion;
  setHue: (h: number) => void;
  setChroma: (c: number) => void;
  setLightness: (l: number) => void;
  setFormula: (f: FormulaVersion) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Global styles (static parts)
// ---------------------------------------------------------------------------

const resetStyles = css`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  body {
    background-color: var(--color-white);
    color: var(--color-gray-1000);
  }
`;

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [hue, setHue] = useState(DEFAULT_HUE);
  const [chroma, setChroma] = useState(BASE_C);
  const [lightness, setLightness] = useState(BASE_L);
  const [formula, setFormula] = useState<FormulaVersion>('v2');

  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty('--theme-h', String(hue));
    s.setProperty('--theme-c', String(chroma));
    s.setProperty('--theme-l', String(lightness));
  }, [hue, chroma, lightness]);

  const themeVarStyles = useMemo(
    () => css`:root {\n${cssVarsByFormula[formula]}\n}`,
    [formula],
  );

  const contextValue = useMemo(
    () => ({ hue, chroma, lightness, formula, setHue, setChroma, setLightness, setFormula }),
    [hue, chroma, lightness, formula],
  );

  return (
    <ThemeContext value={contextValue}>
      <Global styles={resetStyles} />
      <Global styles={themeVarStyles} />
      {children}
    </ThemeContext>
  );
}
