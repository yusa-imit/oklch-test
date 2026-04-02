/**
 * OKLCH color tokens with hue-aware regression model.
 *
 * Chromatic colors use a per-step formula:
 *   L = mL * var(--theme-l) + sL * sin(h) + cL * cos(h) + oL
 *   C = mC * var(--theme-c) + sC * sin(h) + cC * cos(h) + oC
 *   H = var(--theme-h)
 *
 * where sin/cos capture gamut-boundary and chroma-curve variation
 * across hues, yielding ~60% less error than the previous delta/ratio
 * model across all five color presets (Blue, Green, Orange, Red, Purple).
 *
 * Three CSS root parameters drive the entire palette:
 *   --theme-h   Hue angle (0–360)
 *   --theme-c   Base chroma (e.g. 0.205)
 *   --theme-l   Base lightness (e.g. 0.6258)
 */

// ---------------------------------------------------------------------------
// Base constants
// ---------------------------------------------------------------------------

export const BASE_L = 0.6258;
export const BASE_C = 0.205;
export const DEFAULT_HUE = 255;

// ---------------------------------------------------------------------------
// Color presets (OKLCH values from design token base hexes)
// ---------------------------------------------------------------------------

export interface ColorPreset {
  name: string;
  l: number;
  c: number;
  h: number;
}

export const COLOR_PRESETS: ColorPreset[] = [
  { name: 'Blue',   l: 0.6258, c: 0.2050, h: 255 },
  { name: 'Green',  l: 0.6830, c: 0.1954, h: 148 },
  { name: 'Orange', l: 0.6960, c: 0.1935, h: 43  },
  { name: 'Red',    l: 0.6527, c: 0.2207, h: 27  },
  { name: 'Purple', l: 0.5737, c: 0.2357, h: 289 },
];

// ---------------------------------------------------------------------------
// Chromatic scale table – hue-aware regression coefficients
//
// Per step: [step, mL, sL, cL, oL, mC, sC, cC, oC]
//   L = mL * theme_l + sL * sin(h) + cL * cos(h) + oL
//   C = mC * theme_c + sC * sin(h) + cC * cos(h) + oC
// ---------------------------------------------------------------------------

export const CHROMATIC_TABLE: [
  step: number,
  mL: number, sL: number, cL: number, oL: number,
  mC: number, sC: number, cC: number, oC: number,
][] = [
  [50,   0.238711, -0.016411,  0.002575,  0.819648,  0.220186,  0.005365, -0.003276, -0.033839],
  [75,   0.418807, -0.025348,  0.003178,  0.686746,  0.260216,  0.007553, -0.003850, -0.034216],
  [100,  0.419127, -0.026395,  0.000823,  0.670057,  0.311432,  0.007727, -0.003882, -0.035497],
  [150,  0.617810, -0.040047, -0.003691,  0.487779,  0.424530,  0.010999, -0.002120, -0.031320],
  [200,  0.560674, -0.025431, -0.000432,  0.459896,  0.521691,  0.011437, -0.007695, -0.016475],
  [250,  0.381189, -0.003035, -0.001702,  0.515337,  0.374417,  0.004956, -0.003904,  0.047349],
  [300,  0.494941, -0.002005, -0.000881,  0.389095,  0.208569, -0.002978, -0.000345,  0.114173],
  [400,  0.984045, -0.010898,  0.005326, -0.002778,  0.839368, -0.001657, -0.003511,  0.015802],
  [500,  0.403021,  0.022079, -0.009380,  0.303655,  0.852268,  0.009555,  0.002950, -0.001904],
  [600, -0.298745,  0.065954, -0.004155,  0.686601,  1.211615,  0.018580, -0.000939, -0.102871],
  [700, -0.241571,  0.057276,  0.002923,  0.577516,  1.188283,  0.018947, -0.000524, -0.122109],
  [800,  0.039495,  0.027543,  0.009814,  0.328935,  1.078226,  0.016472, -0.000339, -0.121711],
  [900,  0.069605,  0.017403,  0.009547,  0.242656,  0.749484,  0.005210,  0.017252, -0.082875],
];

// ---------------------------------------------------------------------------
// Step constants (exported for UI rendering)
// ---------------------------------------------------------------------------

export const SCALE_STEPS = [50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900] as const;
export const BG_STEPS = [50, 75, 100, 150, 200, 250, 400] as const;
export const ALPHA_KEYS = ['a0', 'a25', 'a50', 'a75', 'a100', 'a200', 'a300'] as const;
export const GRAY_STEPS = [25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000] as const;

// ---------------------------------------------------------------------------
// BG table – hue-aware regression (same model as chromatic scale)
//
// Per step: [step, mL, sL, cL, oL, mC, sC, cC, oC]
// BG hue is also regressed: H = mH*h + sH*sin(h) + cH*cos(h) + oH
// ---------------------------------------------------------------------------

const BG_TABLE: [
  step: number,
  mL: number, sL: number, cL: number, oL: number,
  mC: number, sC: number, cC: number, oC: number,
][] = [
  [50,  0.055582, -0.003360,  0.000673,  0.941510,  0.038941, -0.000293, -0.000194, -0.004333],
  [75,  0.024260, -0.000511, -0.000248,  0.953579,  0.024418, -0.000889, -0.000595,  0.000219],
  [100, 0.044221,  0.001982, -0.002512,  0.926871,  0.043556, -0.002347, -0.000245, -0.001690],
  [150, 0.069333,  0.001260, -0.002403,  0.877983,  0.092005, -0.003332,  0.000012, -0.006938],
  [200, 0.095928,  0.000221, -0.003765,  0.812673,  0.155034, -0.007364,  0.001668, -0.014803],
  [250, 0.097154,  0.002116, -0.004283,  0.756709,  0.239837, -0.009953,  0.001464, -0.028293],
  [400, 0.083211, -0.000591, -0.004165,  0.706953,  0.271999, -0.011501,  0.002437, -0.030872],
];

/** BG hue regression: H = mH*h + sH*sin(h) + cH*cos(h) + oH */
const BG_HUE_COEFS: [mH: number, sH: number, cH: number, oH: number] =
  [1.509081, 69.794829, 32.079289, -81.363338];

const ALPHA_STEPS: [name: string, alpha: number][] = [
  ['a0',   0],
  ['a25',  0.078],
  ['a50',  0.161],
  ['a75',  0.329],
  ['a100', 0.478],
  ['a200', 0.651],
  ['a300', 0.812],
];

// ---------------------------------------------------------------------------
// CSS calc() expression builder
// ---------------------------------------------------------------------------

const H_SIN = 'sin(var(--theme-h) * 1deg)';
const H_COS = 'cos(var(--theme-h) * 1deg)';

/**
 * Build a CSS calc() expression from coefficient–expression pairs.
 * Handles signs correctly for clean output.
 */
function fmtCalc(terms: [coef: number, expr: string][]): string {
  const active = terms.filter(([c]) => Math.abs(c) > 1e-8);
  if (active.length === 0) return '0';

  const parts: string[] = [];
  for (let i = 0; i < active.length; i++) {
    const [coef, expr] = active[i];
    const abs = +Math.abs(coef).toFixed(6);

    // Value without sign
    let val: string;
    if (!expr) val = String(abs);
    else if (abs === 1) val = expr;
    else val = `${abs} * ${expr}`;

    if (i === 0) {
      if (coef < 0) {
        // Leading negative: embed the minus in the number
        val = !expr ? `-${abs}` : `-${abs} * ${expr}`;
      }
      parts.push(val);
    } else {
      parts.push(coef < 0 ? `- ${val}` : `+ ${val}`);
    }
  }

  return `calc(${parts.join(' ')})`;
}

/** Build an oklch() CSS value using the hue-aware regression coefficients. */
function themedHue(
  mL: number, sL: number, cL: number, oL: number,
  mC: number, sC: number, cC: number, oC: number,
): string {
  const lExpr = fmtCalc([[mL, 'var(--theme-l)'], [sL, H_SIN], [cL, H_COS], [oL, '']]);
  const cExpr = fmtCalc([[mC, 'var(--theme-c)'], [sC, H_SIN], [cC, H_COS], [oC, '']]);
  return `oklch(${lExpr} ${cExpr} var(--theme-h))`;
}

/** Build BG hue CSS expression from regression coefficients. */
const BG_H_EXPR = fmtCalc([
  [BG_HUE_COEFS[0], 'var(--theme-h)'],
  [BG_HUE_COEFS[1], H_SIN],
  [BG_HUE_COEFS[2], H_COS],
  [BG_HUE_COEFS[3], ''],
]);

/** Build an oklch() CSS value for BG using the hue-aware regression. */
function themedBg(
  mL: number, sL: number, cL: number, oL: number,
  mC: number, sC: number, cC: number, oC: number,
): string {
  const lExpr = fmtCalc([[mL, 'var(--theme-l)'], [sL, H_SIN], [cL, H_COS], [oL, '']]);
  const cExpr = fmtCalc([[mC, 'var(--theme-c)'], [sC, H_SIN], [cC, H_COS], [oC, '']]);
  return `oklch(${lExpr} ${cExpr} ${BG_H_EXPR})`;
}

// ---------------------------------------------------------------------------
// Gray (static – achromatic, unaffected by theme params)
// ---------------------------------------------------------------------------

const grayVars = [
  '  --color-gray-25: oklch(0.9851 0 0);',
  '  --color-gray-50: oklch(0.9612 0 0);',
  '  --color-gray-100: oklch(0.9158 0 0);',
  '  --color-gray-150: oklch(0.8359 0 0);',
  '  --color-gray-200: oklch(0.7572 0 0);',
  '  --color-gray-250: oklch(0.683 0 0);',
  '  --color-gray-300: oklch(0.6234 0 0);',
  '  --color-gray-400: oklch(0.5243 0 0);',
  '  --color-gray-500: oklch(0.4313 0 0);',
  '  --color-gray-600: oklch(0.3677 0 0);',
  '  --color-gray-700: oklch(0.329 0 0);',
  '  --color-gray-800: oklch(0.2727 0 0);',
  '  --color-gray-900: oklch(0.1591 0 0);',
  '  --color-gray-1000: oklch(0.1543 0 0);',
  '  --color-gray-a0: oklch(0.1543 0 0 / 0);',
  '  --color-gray-a10: oklch(0.1543 0 0 / 0.031);',
  '  --color-gray-a25: oklch(0.1543 0 0 / 0.071);',
  '  --color-gray-a50: oklch(0.1543 0 0 / 0.161);',
  '  --color-gray-a75: oklch(0.1543 0 0 / 0.329);',
  '  --color-gray-a100: oklch(0.1543 0 0 / 0.478);',
  '  --color-gray-a200: oklch(0.1543 0 0 / 0.651);',
  '  --color-gray-a300: oklch(0.1543 0 0 / 0.812);',
  '  --color-gray-wa0: oklch(1 0 0 / 0);',
  '  --color-gray-wa25: oklch(1 0 0 / 0.071);',
  '  --color-gray-wa50: oklch(1 0 0 / 0.161);',
  '  --color-gray-wa75: oklch(1 0 0 / 0.329);',
  '  --color-gray-wa100: oklch(1 0 0 / 0.478);',
  '  --color-gray-wa200: oklch(1 0 0 / 0.651);',
  '  --color-gray-wa300: oklch(1 0 0 / 0.812);',
].join('\n');

// ---------------------------------------------------------------------------
// Chromatic scale (dynamic – hue-aware regression)
// ---------------------------------------------------------------------------

const chromaticVars = CHROMATIC_TABLE
  .map(([step, mL, sL, cL, oL, mC, sC, cC, oC]) =>
    `  --color-theme-${step}: ${themedHue(mL, sL, cL, oL, mC, sC, cC, oC)};`)
  .join('\n');

const alphaVars = ALPHA_STEPS
  .map(([name, alpha]) =>
    `  --color-theme-${name}: oklch(var(--theme-l) var(--theme-c) var(--theme-h) / ${alpha});`)
  .join('\n');

const baseVar = '  --color-theme: oklch(var(--theme-l) var(--theme-c) var(--theme-h));';

// ---------------------------------------------------------------------------
// BG colors (delta/ratio with hue offset)
// ---------------------------------------------------------------------------

const bgVars = BG_TABLE
  .map(([step, mL, sL, cL, oL, mC, sC, cC, oC]) =>
    `  --color-theme-bg-${step}: ${themedBg(mL, sL, cL, oL, mC, sC, cC, oC)};`)
  .join('\n');

// ---------------------------------------------------------------------------
// Dimension tokens
// ---------------------------------------------------------------------------

const roundVars = [
  '  --round-2: 2px;',
  '  --round-3: 3px;',
  '  --round-4: 4px;',
  '  --round-5: 5px;',
  '  --round-6: 6px;',
  '  --round-7: 7px;',
  '  --round-8: 8px;',
  '  --round-9: 9px;',
  '  --round-10: 10px;',
  '  --round-12: 12px;',
  '  --round-16: 16px;',
  '  --round-20: 20px;',
  '  --round-circle: 9999px;',
].join('\n');

// ---------------------------------------------------------------------------
// Combined declarations (injected on :root)
// ---------------------------------------------------------------------------

export const cssVarDeclarations = [
  `  --theme-h: ${DEFAULT_HUE};`,
  `  --theme-c: ${BASE_C};`,
  `  --theme-l: ${BASE_L};`,
  '',
  grayVars,
  '',
  chromaticVars,
  alphaVars,
  baseVar,
  '',
  bgVars,
  '',
  '  --color-black: oklch(0 0 0);',
  '  --color-white: oklch(1 0 0);',
  '',
  roundVars,
].join('\n');
