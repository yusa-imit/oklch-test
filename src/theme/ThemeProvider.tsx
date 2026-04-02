import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Global, css } from '@emotion/react';
import { cssVarDeclarations, DEFAULT_HUE, BASE_L, BASE_C } from './tokens';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  hue: number;
  chroma: number;
  lightness: number;
  setHue: (h: number) => void;
  setChroma: (c: number) => void;
  setLightness: (l: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Global styles
// ---------------------------------------------------------------------------

const globalStyles = css`
  :root {
  ${cssVarDeclarations}
  }

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

  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty('--theme-h', String(hue));
    s.setProperty('--theme-c', String(chroma));
    s.setProperty('--theme-l', String(lightness));
  }, [hue, chroma, lightness]);

  const contextValue = useMemo(
    () => ({ hue, chroma, lightness, setHue, setChroma, setLightness }),
    [hue, chroma, lightness],
  );

  return (
    <ThemeContext value={contextValue}>
      <Global styles={globalStyles} />
      {children}
    </ThemeContext>
  );
}
