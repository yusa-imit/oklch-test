/**
 * OKLCH color tokens with hue-aware regression model (v2).
 *
 * Chromatic colors use a per-step formula:
 *   L = mL * theme_l + oL
 *   C = theme_c * (rC + sC * sin(h) + cC * cos(h))
 *   H = var(--theme-h)
 *
 * The factored chroma form ensures C collapses to 0 when theme_c = 0,
 * yielding ~60% less error than the previous hueSinCos (v1) model
 * across all five color presets (Blue, Green, Orange, Red, Purple).
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
// Chromatic scale table – stable regression coefficients
//
// Per step: [step, mL, oL, rC, sC, cC]
//   L = mL * theme_l + oL                        (affine, mL≥0)
//   C = theme_c * (rC + sC * sin(h) + cC * cos(h))  (factored: C=0 → chroma=0)
// ---------------------------------------------------------------------------

export const CHROMATIC_TABLE: [
  step: number,
  mL: number, oL: number,
  rC: number, sC: number, cC: number,
][] = [
  [50,  0.000000,  0.975201,  0.057199,  0.014745, -0.006811],
  [75,  0.033281,  0.937745,  0.095773,  0.024976, -0.009495],
  [100, 0.019470,  0.929847,  0.140841,  0.025999, -0.009162],
  [150, 0.015002,  0.878809,  0.274481,  0.042822, -0.001605],
  [200, 0.176497,  0.709421,  0.444281,  0.049398, -0.033012],
  [250, 0.336534,  0.544068,  0.605182,  0.038527, -0.031900],
  [300, 0.465260,  0.408233,  0.761843,  0.021207, -0.032872],
  [400, 0.815441,  0.107643,  0.916191, -0.001963, -0.021327],
  [500, 0.743597,  0.080834,  0.844177,  0.045986,  0.015428],
  [600, 0.701402,  0.036126,  0.715541,  0.056332,  0.023747],
  [700, 0.622275,  0.016765,  0.598817,  0.050241,  0.030604],
  [800, 0.448839,  0.064611,  0.490186,  0.036522,  0.030882],
  [900, 0.325833,  0.077765,  0.346217, -0.005862,  0.106182],
];

// ---------------------------------------------------------------------------
// Step constants (exported for UI rendering)
// ---------------------------------------------------------------------------

export const SCALE_STEPS = [50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900] as const;
export const BG_STEPS = [50, 75, 100, 150, 200, 250, 400] as const;
export const ALPHA_KEYS = ['a0', 'a25', 'a50', 'a75', 'a100', 'a200', 'a300'] as const;
export const GRAY_STEPS = [25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000] as const;

// ---------------------------------------------------------------------------
// BG table – stable regression (same structure as chromatic)
//
// Per step: [step, mL, oL, rC, sC, cC]
// BG hue is also regressed: H = h + sH*sin(h) + cH*cos(h) + oH
// ---------------------------------------------------------------------------

export const BG_TABLE: [
  step: number,
  mL: number, oL: number,
  rC: number, sC: number, cC: number,
][] = [
  [50,  0.004167,  0.975014,  0.017916, -0.002539,  0.000268],
  [75,  0.016712,  0.958440,  0.025407, -0.004043, -0.002962],
  [100, 0.076187,  0.905692,  0.035019, -0.011617, -0.000763],
  [150, 0.090284,  0.863976,  0.057831, -0.018028,  0.001884],
  [200, 0.102183,  0.807985,  0.081911, -0.039640,  0.012068],
  [250, 0.132518,  0.733030,  0.100907, -0.056135,  0.014698],
  [400, 0.077457,  0.709999,  0.120209, -0.064427,  0.020106],
];

/** BG hue offset regression: H = h + sH*sin(h) + cH*cos(h) + oH (circular-safe) */
export const BG_HUE_OFF_COEFS: [sH: number, cH: number, oH: number] =
  [7.604452, 3.826262, -1.925563];

export const ALPHA_STEPS: [name: string, alpha: number][] = [
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

/** Build an oklch() CSS value: stable affine L + factored C. */
function themedHue(
  mL: number, oL: number,
  rC: number, sC: number, cC: number,
): string {
  const lExpr = fmtCalc([[mL, 'var(--theme-l)'], [oL, '']]);
  // C = theme_c * (rC + sC*sin(h) + cC*cos(h))  → zero when theme_c=0
  const inner = fmtCalc([[rC, ''], [sC, H_SIN], [cC, H_COS]]);
  const cExpr = `calc(var(--theme-c) * ${inner})`;
  return `oklch(${lExpr} ${cExpr} var(--theme-h))`;
}

/** Build BG hue CSS expression: h + offset(sin, cos) — circular-safe */
const BG_H_EXPR = fmtCalc([
  [1, 'var(--theme-h)'],
  [BG_HUE_OFF_COEFS[0], H_SIN],
  [BG_HUE_OFF_COEFS[1], H_COS],
  [BG_HUE_OFF_COEFS[2], ''],
]);

/** Build an oklch() CSS value for BG: stable affine L + factored C. */
function themedBg(
  mL: number, oL: number,
  rC: number, sC: number, cC: number,
): string {
  const lExpr = fmtCalc([[mL, 'var(--theme-l)'], [oL, '']]);
  const inner = fmtCalc([[rC, ''], [sC, H_SIN], [cC, H_COS]]);
  const cExpr = `calc(var(--theme-c) * ${inner})`;
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
// V1 data (hueSinCos model — the version deployed on main)
//
// Per step: [step, mL, sL, cL, oL, mC, sC, cC, oC]
//   L = mL * theme_l + sL * sin(h) + cL * cos(h) + oL
//   C = mC * theme_c + sC * sin(h) + cC * cos(h) + oC
// ---------------------------------------------------------------------------

export const V1_CHROMATIC_TABLE: [
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

export const V1_BG_TABLE: [
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

export const V1_BG_HUE_COEFS: [number, number, number, number] =
  [1.509081, 69.794829, 32.079289, -81.363338];

/** V1: L/C both use sin/cos hue regression */
function themedV1(
  mL: number, sL: number, cL: number, oL: number,
  mC: number, sC: number, cC: number, oC: number,
): string {
  const lExpr = fmtCalc([[mL, 'var(--theme-l)'], [sL, H_SIN], [cL, H_COS], [oL, '']]);
  const cExpr = fmtCalc([[mC, 'var(--theme-c)'], [sC, H_SIN], [cC, H_COS], [oC, '']]);
  return `oklch(${lExpr} ${cExpr} var(--theme-h))`;
}

/** V1 BG hue expression */
const V1_BG_H_EXPR = fmtCalc([
  [V1_BG_HUE_COEFS[0], 'var(--theme-h)'],
  [V1_BG_HUE_COEFS[1], H_SIN],
  [V1_BG_HUE_COEFS[2], H_COS],
  [V1_BG_HUE_COEFS[3], ''],
]);

// ---------------------------------------------------------------------------
// V2 chromatic scale (dynamic – stable regression)
// ---------------------------------------------------------------------------

const v2ChromaticVars = CHROMATIC_TABLE
  .map(([step, mL, oL, rC, sC, cC]) =>
    `  --color-theme-${step}: ${themedHue(mL, oL, rC, sC, cC)};`)
  .join('\n');

// ---------------------------------------------------------------------------
// V1 chromatic scale (hueSinCos)
// ---------------------------------------------------------------------------

const v1ChromaticVars = V1_CHROMATIC_TABLE
  .map(([step, mL, sL, cL, oL, mC, sC, cC, oC]) =>
    `  --color-theme-${step}: ${themedV1(mL, sL, cL, oL, mC, sC, cC, oC)};`)
  .join('\n');

// ---------------------------------------------------------------------------
// Shared: alpha + base (same for both versions)
// ---------------------------------------------------------------------------

const alphaVars = ALPHA_STEPS
  .map(([name, alpha]) =>
    `  --color-theme-${name}: oklch(var(--theme-l) var(--theme-c) var(--theme-h) / ${alpha});`)
  .join('\n');

const baseVar = '  --color-theme: oklch(var(--theme-l) var(--theme-c) var(--theme-h));';

// ---------------------------------------------------------------------------
// V2 BG (stable regression + hue regression)
// ---------------------------------------------------------------------------

const v2BgVars = BG_TABLE
  .map(([step, mL, oL, rC, sC, cC]) =>
    `  --color-theme-bg-${step}: ${themedBg(mL, oL, rC, sC, cC)};`)
  .join('\n');

// ---------------------------------------------------------------------------
// V1 BG (hueSinCos + hue regression)
// ---------------------------------------------------------------------------

const v1BgVars = V1_BG_TABLE
  .map(([step, mL, sL, cL, oL, mC, sC, cC, oC]) => {
    const lExpr = fmtCalc([[mL, 'var(--theme-l)'], [sL, H_SIN], [cL, H_COS], [oL, '']]);
    const cExpr = fmtCalc([[mC, 'var(--theme-c)'], [sC, H_SIN], [cC, H_COS], [oC, '']]);
    return `  --color-theme-bg-${step}: oklch(${lExpr} ${cExpr} ${V1_BG_H_EXPR});`;
  })
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

export type FormulaVersion = 'v1' | 'v2';

function buildCssVars(chromatic: string, bg: string): string {
  return [
    `  --theme-h: ${DEFAULT_HUE};`,
    `  --theme-c: ${BASE_C};`,
    `  --theme-l: ${BASE_L};`,
    '', grayVars, '',
    chromatic, alphaVars, baseVar, '',
    bg, '',
    '  --color-black: oklch(0 0 0);',
    '  --color-white: oklch(1 0 0);',
    '', roundVars,
  ].join('\n');
}

export const cssVarsByFormula: Record<FormulaVersion, string> = {
  v1: buildCssVars(v1ChromaticVars, v1BgVars),
  v2: buildCssVars(v2ChromaticVars, v2BgVars),
};
