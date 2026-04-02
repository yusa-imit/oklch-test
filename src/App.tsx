import { useState } from 'react';
import { css } from '@emotion/react';
import {
  useTheme,
  SCALE_STEPS, BG_STEPS, ALPHA_KEYS, GRAY_STEPS,
  COLOR_PRESETS, CHROMATIC_TABLE, V1_CHROMATIC_TABLE,
  BG_TABLE, BG_HUE_OFF_COEFS, V1_BG_TABLE, V1_BG_HUE_COEFS, ALPHA_STEPS,
  type ColorPreset, type FormulaVersion,
} from './theme';
import tokensJson from './theme/tokens.json';

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type Tab = 'chat' | 'palette' | 'compare';

const TABS: { key: Tab; label: string }[] = [
  { key: 'chat', label: '채팅창' },
  { key: 'palette', label: '팔레트' },
  { key: 'compare', label: 'Preset 비교' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PRESET_TOKEN_KEY: Record<string, string> = {
  Blue: 'color/blue',
  Green: 'color/green',
  Orange: 'color/orange',
  Red: 'color/red',
  Purple: 'color/violet',
};

const globalTokens = tokensJson.global as Record<string, Record<string, { value: string }>>;

function originalHex(presetName: string, step: number): string {
  const family = globalTokens[PRESET_TOKEN_KEY[presetName]];
  return family?.[String(step)]?.value ?? 'transparent';
}

function presetStepColor(preset: ColorPreset, step: number, formula: FormulaVersion): string {
  if (formula === 'v1') {
    const entry = V1_CHROMATIC_TABLE.find(([s]) => s === step);
    if (!entry) return 'transparent';
    const [, mL, sL, cL, oL, mC, sC, cC, oC] = entry;
    const hRad = preset.h * Math.PI / 180;
    const L = Math.max(0, Math.min(1, mL * preset.l + sL * Math.sin(hRad) + cL * Math.cos(hRad) + oL));
    const C = Math.max(0, mC * preset.c + sC * Math.sin(hRad) + cC * Math.cos(hRad) + oC);
    return `oklch(${L} ${C} ${preset.h})`;
  }
  const entry = CHROMATIC_TABLE.find(([s]) => s === step);
  if (!entry) return 'transparent';
  const [, mL, oL, rC, sC, cC] = entry;
  const hRad = preset.h * Math.PI / 180;
  const L = Math.max(0, Math.min(1, mL * preset.l + oL));
  const ratio = rC + sC * Math.sin(hRad) + cC * Math.cos(hRad);
  const C = Math.max(0, preset.c * ratio);
  return `oklch(${L} ${C} ${preset.h})`;
}

// BG / Alpha comparison helpers (data imported from ./theme)

const PRESET_BG_TOKEN_KEY: Record<string, string> = {
  Blue: 'color/blue bg', Green: 'color/green bg', Orange: 'color/orange bg',
  Red: 'color/red bg', Purple: 'color/violet bg',
};

function originalBgHex(name: string, step: number): string {
  return globalTokens[PRESET_BG_TOKEN_KEY[name]]?.[String(step)]?.value ?? 'transparent';
}

function originalAlphaHex(name: string, key: string): string {
  return globalTokens[PRESET_TOKEN_KEY[name]]?.[key]?.value ?? 'transparent';
}

function presetBgColor(preset: ColorPreset, step: number, formula: FormulaVersion): string {
  if (formula === 'v1') {
    const entry = V1_BG_TABLE.find(([s]) => s === step);
    if (!entry) return 'transparent';
    const [, mL, sL, cL, oL, mC, sC, cC, oC] = entry;
    const hRad = preset.h * Math.PI / 180;
    const sinH = Math.sin(hRad), cosH = Math.cos(hRad);
    const L = Math.max(0, Math.min(1, mL * preset.l + sL * sinH + cL * cosH + oL));
    const C = Math.max(0, mC * preset.c + sC * sinH + cC * cosH + oC);
    const H = V1_BG_HUE_COEFS[0] * preset.h + V1_BG_HUE_COEFS[1] * sinH + V1_BG_HUE_COEFS[2] * cosH + V1_BG_HUE_COEFS[3];
    return `oklch(${L} ${C} ${H})`;
  }
  const entry = BG_TABLE.find(([s]) => s === step);
  if (!entry) return 'transparent';
  const [, mL, oL, rC, sC, cC] = entry;
  const hRad = preset.h * Math.PI / 180;
  const sinH = Math.sin(hRad), cosH = Math.cos(hRad);
  const L = Math.max(0, Math.min(1, mL * preset.l + oL));
  const ratio = rC + sC * sinH + cC * cosH;
  const C = Math.max(0, preset.c * ratio);
  const H = preset.h + BG_HUE_OFF_COEFS[0] * sinH + BG_HUE_OFF_COEFS[1] * cosH + BG_HUE_OFF_COEFS[2];
  return `oklch(${L} ${C} ${H})`;
}

function presetAlphaColor(preset: ColorPreset, alphaKey: string): string {
  const av = ALPHA_STEPS.find(([k]) => k === alphaKey);
  if (!av) return 'transparent';
  return `oklch(${preset.l} ${preset.c} ${preset.h} / ${av[1]})`;
}

// ---------------------------------------------------------------------------
// CoeffTable – shared coefficient table renderer
// ---------------------------------------------------------------------------

function CoeffTable({ headers, data }: { headers: string[]; data: readonly (readonly number[])[] }) {
  return (
    <div css={formulaTableWrap}>
      <table css={formulaTable}>
        <thead>
          <tr>
            <th>Step</th>
            {headers.map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map(([step, ...coeffs]) => (
            <tr key={step}>
              <td css={formulaTdStep}>{step}</td>
              {coeffs.map((v, i) => (
                <td key={i} css={v < 0 ? formulaTdNeg : undefined}>
                  {v >= 0 ? '+' : ''}{v.toFixed(4)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const { hue, chroma, lightness, formula, setHue, setChroma, setLightness, setFormula } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [formulaOpen, setFormulaOpen] = useState(false);

  return (
    <div css={container}>
      <h1 css={heading}>OKLCH Theme</h1>

      {/* LCH Controls */}
      <section css={controls}>
        <label css={row}>
          <span css={labelCss}>H</span>
          <input
            css={[slider, hueTrack]}
            type="range" min={0} max={360} step={1}
            value={hue}
            onChange={(e) => setHue(+e.target.value)}
          />
          <span css={valueCss}>{hue}</span>
        </label>

        <label css={row}>
          <span css={labelCss}>C</span>
          <input
            css={[slider, chromaTrack]}
            type="range" min={0} max={0.35} step={0.001}
            value={chroma}
            onChange={(e) => setChroma(+e.target.value)}
          />
          <span css={valueCss}>{chroma.toFixed(3)}</span>
        </label>

        <label css={row}>
          <span css={labelCss}>L</span>
          <input
            css={[slider, lightnessTrack]}
            type="range" min={0.2} max={0.8} step={0.001}
            value={lightness}
            onChange={(e) => setLightness(+e.target.value)}
          />
          <span css={valueCss}>{lightness.toFixed(4)}</span>
        </label>

        <div css={presetRow}>
          {COLOR_PRESETS.map((p) => {
            const active = hue === p.h && chroma === p.c && lightness === p.l;
            return (
              <button
                key={p.name}
                css={[presetBtn, active && presetBtnActive]}
                onClick={() => { setHue(p.h); setChroma(p.c); setLightness(p.l); }}
              >
                <div
                  css={presetSwatch}
                  style={{ backgroundColor: `oklch(${p.l} ${p.c} ${p.h})` }}
                />
                <span css={presetLabelCss}>{p.name}</span>
              </button>
            );
          })}
          <div css={formulaSelectWrap}>
            <select
              css={formulaSelect}
              value={formula}
              onChange={(e) => setFormula(e.target.value as FormulaVersion)}
            >
              <option value="v1">v1 — delta + ratio</option>
              <option value="v2">v2 — stable regression</option>
            </select>
          </div>
        </div>
      </section>

      {/* Formula collapse */}
      <div css={formulaWrapper}>
        <button css={formulaToggle} onClick={() => setFormulaOpen(!formulaOpen)}>
          <span>Color 계산 공식</span>
          <span css={formulaArrow} style={{ transform: formulaOpen ? 'rotate(180deg)' : undefined }}>
            ▾
          </span>
        </button>
        {formulaOpen && formula === 'v2' && (
          <div css={formulaContent}>
            <p css={formulaDesc}>
              기존 디자인 토큰과의 정합성을 유지하면서, 프리셋 범위 밖의 L/C/H 값에서도
              안정적인 팔레트를 생성하도록 정규화된 계산식입니다.
              L은 단조성이 보장되고(mL≥0), C는 theme-c에 비례하여 C=0이면 무채색이 됩니다.
            </p>
            <dl css={formulaLegend}>
              <div css={formulaLegendRow}><dt>mL</dt><dd>Lightness multiplier — theme-l에 곱하는 계수 (≥0, 단조성 보장)</dd></div>
              <div css={formulaLegendRow}><dt>oL</dt><dd>Lightness offset — 밝기 상수 오프셋</dd></div>
              <div css={formulaLegendRow}><dt>rC</dt><dd>Chroma ratio — 기본 채도 배율 (theme-c에 곱해짐)</dd></div>
              <div css={formulaLegendRow}><dt>sC</dt><dd>Chroma sin — sin(hue) gamut 보정 (theme-c에 곱해짐)</dd></div>
              <div css={formulaLegendRow}><dt>cC</dt><dd>Chroma cos — cos(hue) gamut 보정 (theme-c에 곱해짐)</dd></div>
            </dl>

            <section>
              <h4 css={formulaSectionTitle}>Chromatic Scale</h4>
              <pre css={formulaCode}>{
`oklch(L C H)
  L = mL × var(--theme-l) + oL
  C = var(--theme-c) × (rC + sC × sin(h) + cC × cos(h))
  H = var(--theme-h)`
              }</pre>
              <CoeffTable headers={['mL', 'oL', 'rC', 'sC', 'cC']} data={CHROMATIC_TABLE} />
            </section>

            <section>
              <h4 css={formulaSectionTitle}>Background</h4>
              <pre css={formulaCode}>{
`oklch(L C H)
  L = mL × var(--theme-l) + oL
  C = var(--theme-c) × (rC + sC × sin(h) + cC × cos(h))
  H = h + ${BG_HUE_OFF_COEFS[0].toFixed(3)} × sin(h) + ${BG_HUE_OFF_COEFS[1].toFixed(3)} × cos(h) + ${BG_HUE_OFF_COEFS[2].toFixed(3)}`
              }</pre>
              <CoeffTable headers={['mL', 'oL', 'rC', 'sC', 'cC']} data={BG_TABLE} />
            </section>

            <section>
              <h4 css={formulaSectionTitle}>Alpha</h4>
              <pre css={formulaCode}>{
`oklch(var(--theme-l) var(--theme-c) var(--theme-h) / alpha)
  alpha: a0=0, a25=0.078, a50=0.161, a75=0.329, a100=0.478, a200=0.651, a300=0.812`
              }</pre>
            </section>
          </div>
        )}
        {formulaOpen && formula === 'v1' && (
          <div css={formulaContent}>
            <p css={formulaDesc}>
              5개 프리셋(Blue, Green, Orange, Red, Purple)의 기존 디자인 토큰 값에
              최대한 가깝게 맞춘 계산식입니다. sin/cos 보정으로 색상별 gamut 차이를 반영하여
              프리셋 기준 평균 RGB 에러 ~7을 달성합니다.
            </p>
            <dl css={formulaLegend}>
              <div css={formulaLegendRow}><dt>mL</dt><dd>Lightness multiplier — theme-l에 곱하는 계수</dd></div>
              <div css={formulaLegendRow}><dt>sL</dt><dd>Lightness sin — sin(hue)에 곱하는 보정 계수</dd></div>
              <div css={formulaLegendRow}><dt>cL</dt><dd>Lightness cos — cos(hue)에 곱하는 보정 계수</dd></div>
              <div css={formulaLegendRow}><dt>oL</dt><dd>Lightness offset — 밝기 상수 오프셋</dd></div>
              <div css={formulaLegendRow}><dt>mC</dt><dd>Chroma multiplier — theme-c에 곱하는 계수</dd></div>
              <div css={formulaLegendRow}><dt>sC</dt><dd>Chroma sin — sin(hue)에 곱하는 보정 계수</dd></div>
              <div css={formulaLegendRow}><dt>cC</dt><dd>Chroma cos — cos(hue)에 곱하는 보정 계수</dd></div>
              <div css={formulaLegendRow}><dt>oC</dt><dd>Chroma offset — 채도 상수 오프셋</dd></div>
            </dl>

            <section>
              <h4 css={formulaSectionTitle}>Chromatic Scale</h4>
              <pre css={formulaCode}>{
`oklch(L C H)
  L = mL × var(--theme-l) + sL × sin(h) + cL × cos(h) + oL
  C = mC × var(--theme-c) + sC × sin(h) + cC × cos(h) + oC
  H = var(--theme-h)`
              }</pre>
              <CoeffTable headers={['mL', 'sL', 'cL', 'oL', 'mC', 'sC', 'cC', 'oC']} data={V1_CHROMATIC_TABLE} />
            </section>

            <section>
              <h4 css={formulaSectionTitle}>Background</h4>
              <pre css={formulaCode}>{
`oklch(L C H)
  L = mL × var(--theme-l) + sL × sin(h) + cL × cos(h) + oL
  C = mC × var(--theme-c) + sC × sin(h) + cC × cos(h) + oC
  H = ${V1_BG_HUE_COEFS[0].toFixed(3)} × h + ${V1_BG_HUE_COEFS[1].toFixed(3)} × sin(h) + ${V1_BG_HUE_COEFS[2].toFixed(3)} × cos(h) ${V1_BG_HUE_COEFS[3].toFixed(3)}`
              }</pre>
              <CoeffTable headers={['mL', 'sL', 'cL', 'oL', 'mC', 'sC', 'cC', 'oC']} data={V1_BG_TABLE} />
            </section>

            <section>
              <h4 css={formulaSectionTitle}>Alpha</h4>
              <pre css={formulaCode}>{
`oklch(var(--theme-l) var(--theme-c) var(--theme-h) / alpha)
  alpha: a0=0, a25=0.078, a50=0.161, a75=0.329, a100=0.478, a200=0.651, a300=0.812`
              }</pre>
            </section>
          </div>
        )}
      </div>

      {/* Tabs */}
      <nav css={tabBar}>
        {TABS.map((t) => (
          <button
            key={t.key}
            css={[tabBtn, activeTab === t.key && tabBtnActive]}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <div css={tabContent}>
        {activeTab === 'chat' && <ChatTab />}
        {activeTab === 'palette' && <PaletteTab />}
        {activeTab === 'compare' && <CompareTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

function ChatTab() {
  return (
    <div css={chatRoot}>
      <div css={chatActionItem}>
        {/* Header: title + steps */}
        <div css={chatHeader}>
          <div css={chatTitleGroup}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'block', transform: 'rotate(180deg)' }}>
              <path d="M10.036 4.78601C10.2923 4.52973 10.7077 4.52973 10.964 4.78601C11.2203 5.04229 11.2203 5.45771 10.964 5.71399L7.46399 9.21399C7.20771 9.47027 6.79229 9.47027 6.53601 9.21399L3.03601 5.71399C2.77973 5.45771 2.77973 5.04229 3.03601 4.78601C3.29229 4.52973 3.70771 4.52973 3.96399 4.78601L7 7.82202L10.036 4.78601Z" fill="var(--color-gray-1000)" />
            </svg>
            <span css={chatTitleText}>대표 SMS 발신번호 설정</span>
          </div>
          <div css={chatSteps}>
            <div css={chatStepItem}>
              <span css={chatTagGray}>현재</span>
              <span css={chatStepTextDimmed}>설정 화면 이동</span>
            </div>
            <svg width="11" height="11" viewBox="0 0 10.7332 10.7331" fill="none" style={{ display: 'block', flexShrink: 0 }}>
              <path d="M4.87188 0.204993C5.14525 -0.0683091 5.58837 -0.0683526 5.86172 0.204993L10.5281 4.87179C10.8015 5.14516 10.8015 5.58827 10.5281 5.86163L5.86172 10.528C5.58835 10.8014 5.14524 10.8014 4.87188 10.528C4.59851 10.2547 4.59851 9.81156 4.87188 9.5382L8.34336 6.06671H0.7C0.313444 6.06671 7.04978e-05 5.75325 0 5.36671C0 4.98011 0.313401 4.66671 0.7 4.66671H8.34336L4.87188 1.19484C4.59851 0.921469 4.59851 0.47836 4.87188 0.204993Z" fill="var(--color-gray-1000)" />
            </svg>
            <div css={chatStepItem}>
              <span css={chatTagBlue}>다음</span>
              <span css={chatStepText}>대표번호 등록</span>
            </div>
          </div>
        </div>

        {/* Prompt section */}
        <div css={chatPromptBox}>
          <div css={chatPromptInput}>
            추천 질문을 클릭하거나 채팅을 입력해주세요.
          </div>
          <div css={chatToolbar}>
            <div css={chatToolbarLeft}>
              <div css={chatCurating}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ display: 'block' }}>
                  <path d="M9 1.07812C9 5.45326 12.5467 9 16.9219 9C12.5467 9 9 12.5467 9 16.9219C9 12.5467 5.45326 9 1.07812 9C5.45326 9 9 5.45326 9 1.07812Z" fill="currentColor" />
                </svg>
                <span>큐레이팅</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" css={chatIconSvg}>
                <g clipPath="url(#chatMsgClip)">
                  <path d="M8 5.33333V8M8 10.6667H8.00667M1.99467 10.8947C2.09269 11.1419 2.11452 11.4129 2.05733 11.6727L1.34733 13.866C1.32446 13.9772 1.33037 14.0925 1.36452 14.2008C1.39866 14.3091 1.45991 14.4069 1.54244 14.4848C1.62498 14.5628 1.72607 14.6185 1.83613 14.6464C1.94619 14.6744 2.06157 14.6738 2.17133 14.6447L4.44667 13.9793C4.69181 13.9307 4.94569 13.952 5.17933 14.0407C6.60292 14.7055 8.21558 14.8461 9.73277 14.4378C11.25 14.0295 12.5742 13.0984 13.4718 11.8089C14.3694 10.5194 14.7827 8.95427 14.6389 7.3897C14.495 5.82513 13.8031 4.36164 12.6854 3.25746C11.5676 2.15328 10.0958 1.47936 8.52959 1.3546C6.96337 1.22984 5.40342 1.66225 4.12496 2.57556C2.8465 3.48886 1.93169 4.82436 1.54193 6.34642C1.15217 7.86849 1.31251 9.4793 1.99467 10.8947Z" stroke="var(--color-gray-1000)" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <defs><clipPath id="chatMsgClip"><rect width="16" height="16" fill="white" /></clipPath></defs>
              </svg>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" css={chatIconSvg}>
                <g clipPath="url(#chatCompassClip)">
                  <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="var(--color-gray-1000)" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.8267 5.17333L9.624 8.78067C9.55854 8.97706 9.44826 9.15551 9.30188 9.30188C9.15551 9.44826 8.97706 9.55854 8.78067 9.624L5.17333 10.8267L6.376 7.21933C6.44146 7.02294 6.55174 6.84449 6.69812 6.69812C6.84449 6.55174 7.02294 6.44146 7.21933 6.376L10.8267 5.17333Z" stroke="var(--color-gray-1000)" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <defs><clipPath id="chatCompassClip"><rect width="16" height="16" fill="white" /></clipPath></defs>
              </svg>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" css={chatIconSvg}>
                <path d="M10.6667 1.33333V2.66667M4.66667 14.6667V13.3333C4.66667 12.9797 4.80714 12.6406 5.05719 12.3905C5.30724 12.1405 5.64638 12 6 12H10C10.3536 12 10.6928 12.1405 10.9428 12.3905C11.1929 12.6406 11.3333 12.9797 11.3333 13.3333V14.6667M5.33333 1.33333V2.66667M10 7.33333C10 8.4379 9.10457 9.33333 8 9.33333C6.89543 9.33333 6 8.4379 6 7.33333C6 6.22876 6.89543 5.33333 8 5.33333C9.10457 5.33333 10 6.22876 10 7.33333ZM3.33333 2.66667H12.6667C13.403 2.66667 14 3.26362 14 4V13.3333C14 14.0697 13.403 14.6667 12.6667 14.6667H3.33333C2.59695 14.6667 2 14.0697 2 13.3333V4C2 3.26362 2.59695 2.66667 3.33333 2.66667Z" stroke="var(--color-gray-1000)" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" css={chatIconSvg}>
                <path d="M5.33333 1.33333V4M10.6667 1.33333V4M2 6.66667H14M5.33333 9.33333H5.34M8 9.33333H8.00667M10.6667 9.33333H10.6733M5.33333 12H5.34M8 12H8.00667M10.6667 12H10.6733M3.33333 2.66667H12.6667C13.403 2.66667 14 3.26362 14 4V13.3333C14 14.0697 13.403 14.6667 12.6667 14.6667H3.33333C2.59695 14.6667 2 14.0697 2 13.3333V4C2 3.26362 2.59695 2.66667 3.33333 2.66667Z" stroke="var(--color-gray-1000)" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div css={chatSelector}>
              <span>추천 질문</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: 'block', transform: 'rotate(180deg)' }}>
                <path d="M10.036 4.78601C10.2923 4.52973 10.7077 4.52973 10.964 4.78601C11.2203 5.04229 11.2203 5.45771 10.964 5.71399L7.46399 9.21399C7.20771 9.47027 6.79229 9.47027 6.53601 9.21399L3.03601 5.71399C2.77973 5.45771 2.77973 5.04229 3.03601 4.78601C3.29229 4.52973 3.70771 4.52973 3.96399 4.78601L7 7.82202L10.036 4.78601Z" fill="var(--color-gray-1000)" />
              </svg>
            </div>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ display: 'block', flexShrink: 0, transform: 'rotate(-90deg)' }}>
              <rect width="28" height="28" rx="14" fill="var(--color-theme)" />
              <path d="M16.0711 14.8991H9.8599C9.62107 14.8991 9.41805 14.8117 9.25083 14.6369C9.08361 14.4621 9 14.2498 9 14C9 13.7502 9.08361 13.5379 9.25083 13.3631C9.41805 13.1883 9.62107 13.1009 9.8599 13.1009H16.0711L14.5608 11.5216C14.3943 11.3476 14.3123 11.1381 14.3147 10.8932C14.3169 10.6484 14.399 10.4389 14.5608 10.2649C14.7273 10.0907 14.9288 10.0024 15.1653 10.0001C15.4019 9.99757 15.6034 10.0834 15.7699 10.2574L18.7482 13.362C18.8314 13.449 18.8942 13.5481 18.9366 13.6592C18.9789 13.7704 19 13.884 19 14C19 14.116 18.9789 14.2296 18.9366 14.3408C18.8942 14.4519 18.8314 14.551 18.7482 14.638L15.7699 17.7426C15.6034 17.9167 15.4019 18.0024 15.1653 17.9999C14.9288 17.9976 14.7273 17.9093 14.5608 17.7351C14.399 17.5611 14.3169 17.3516 14.3147 17.1068C14.3123 16.8619 14.3943 16.6524 14.5608 16.4784L16.0711 14.8991Z" fill="var(--color-white)" />
            </svg>
          </div>
        </div>
      </div>

      <p css={chatDisclaimer}>
        AI Agent의 자동 분석 결과는 실제 데이터와 일부 차이가 발생할 수 있어요.
      </p>
    </div>
  );
}

function PaletteTab() {
  return (
    <>
      <PaletteSection title="Scale" prefix="color-theme" steps={SCALE_STEPS} />
      <PaletteSection title="Background" prefix="color-theme-bg" steps={BG_STEPS} />
      <PaletteSection title="Alpha" prefix="color-theme" steps={ALPHA_KEYS} alpha />
      <PaletteSection title="Gray" prefix="color-gray" steps={GRAY_STEPS} />
    </>
  );
}

function CompareTab() {
  const { formula } = useTheme();
  return (
    <div css={compareGrid}>
      <CompareSection
        title="Scale"
        steps={SCALE_STEPS}
        getOriginal={(name, step) => originalHex(name, step as number)}
        getComputed={(preset, step) => presetStepColor(preset, step as number, formula)}
      />
      <CompareSection
        title="Background"
        steps={BG_STEPS}
        getOriginal={(name, step) => originalBgHex(name, step as number)}
        getComputed={(preset, step) => presetBgColor(preset, step as number, formula)}
      />
      <CompareSection
        title="Alpha"
        steps={ALPHA_KEYS}
        getOriginal={(name, step) => originalAlphaHex(name, step as string)}
        getComputed={(preset, step) => presetAlphaColor(preset, step as string)}
        alpha
      />
      <div css={compareLegend}>
        <span css={compareLegendItem}>
          <span css={[compareLegendDot, compareLegendDotTop]} />
          원본 (tokens.json)
        </span>
        <span css={compareLegendItem}>
          <span css={[compareLegendDot, compareLegendDotBottom]} />
          계산 (regression)
        </span>
      </div>
    </div>
  );
}

function CompareSection({
  title, steps, getOriginal, getComputed, alpha,
}: {
  title: string;
  steps: readonly (string | number)[];
  getOriginal: (presetName: string, step: string | number) => string;
  getComputed: (preset: ColorPreset, step: string | number) => string;
  alpha?: boolean;
}) {
  return (
    <div css={compareSection}>
      <h3 css={sectionTitle}>{title}</h3>
      {COLOR_PRESETS.map((preset) => (
        <div key={preset.name} css={compareRow}>
          <div css={compareLabel}>
            <div
              css={compareDot}
              style={{ backgroundColor: `oklch(${preset.l} ${preset.c} ${preset.h})` }}
            />
            <span>{preset.name}</span>
          </div>
          <div css={compareSwatches}>
            {steps.map((step) => {
              const orig = getOriginal(preset.name, step);
              const calc = getComputed(preset, step);
              return (
                <div key={step} css={[compareSwatchPair, alpha && checkerboard]}>
                  <div css={compareSwatchHalf} style={{ backgroundColor: orig }} title={`원본: ${orig}`} />
                  <div css={compareSwatchHalf} style={{ backgroundColor: calc }} title={`계산: ${calc}`} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div css={compareStepLabels}>
        <div css={compareLabel} />
        <div css={compareSwatches}>
          {steps.map((step) => (
            <span key={step} css={compareStepLabel}>{step}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function PaletteSection({
  title, prefix, steps, alpha,
}: {
  title: string;
  prefix: string;
  steps: readonly (string | number)[];
  alpha?: boolean;
}) {
  return (
    <section css={section}>
      <h3 css={sectionTitle}>{title}</h3>
      <div css={palette}>
        {steps.map((step) => (
          <div key={step} css={swatchWrapper}>
            <div css={[swatchBox, alpha && checkerboard]}>
              <div
                css={swatchColor}
                style={{ backgroundColor: `var(--${prefix}-${step})` }}
              />
            </div>
            <span css={swatchLabelCss}>{step}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Styles – Layout
// ---------------------------------------------------------------------------

const container = css`
  max-width: 860px;
  margin: 0 auto;
  padding: 40px 24px 80px;
`;

const heading = css`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 32px;
`;

// ---------------------------------------------------------------------------
// Styles – Controls
// ---------------------------------------------------------------------------

const controls = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 0;
  padding: 24px;
  border-radius: var(--round-12) var(--round-12) 0 0;
  background: var(--color-gray-25);
  border: 1px solid var(--color-gray-100);
  border-bottom: none;
`;

const row = css`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const labelCss = css`
  font-weight: 600;
  font-size: 14px;
  width: 14px;
  text-align: center;
`;

const valueCss = css`
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', SFMono-Regular, Menlo, monospace;
  width: 56px;
  text-align: right;
  color: var(--color-gray-400);
`;

const presetRow = css`
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-gray-100);
`;

const presetBtn = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: 2px solid transparent;
  border-radius: var(--round-8);
  background: none;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover { border-color: var(--color-gray-150); }
`;

const presetBtnActive = css`
  border-color: var(--color-gray-400);
`;

const presetSwatch = css`
  width: 28px;
  height: 28px;
  border-radius: 50%;
`;

const presetLabelCss = css`
  font-size: 11px;
  color: var(--color-gray-400);
`;

const formulaSelectWrap = css`
  margin-left: auto;
  display: flex;
  align-items: center;
`;

const formulaSelect = css`
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--color-gray-150);
  border-radius: var(--round-6);
  background: var(--color-white);
  color: var(--color-gray-600);
  cursor: pointer;
  outline: none;
  &:focus { border-color: var(--color-gray-300); }
`;

// ---------------------------------------------------------------------------
// Styles – Formula panel
// ---------------------------------------------------------------------------

const formulaWrapper = css`
  border: 1px solid var(--color-gray-100);
  border-top: none;
  background: var(--color-gray-25);
`;

const formulaToggle = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 24px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-gray-400);
  cursor: pointer;
  letter-spacing: 0.03em;
  &:hover { color: var(--color-gray-600); }
`;

const formulaArrow = css`
  transition: transform 0.2s;
  font-size: 14px;
`;

const formulaContent = css`
  padding: 0 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const formulaDesc = css`
  font-size: 12px;
  line-height: 1.7;
  color: var(--color-gray-500);
  margin: 0 0 12px;
  padding: 10px 14px;
  background: var(--color-gray-25);
  border-left: 3px solid var(--color-gray-150);
  border-radius: 0 var(--round-4) var(--round-4) 0;
`;

const formulaLegend = css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 24px;
  margin: 0 0 12px;
  padding: 10px 14px;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-100);
  border-radius: var(--round-6);
`;

const formulaLegendRow = css`
  display: flex;
  gap: 8px;
  align-items: baseline;
  dt {
    font-family: 'SF Mono', SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    font-weight: 600;
    color: var(--color-gray-600);
    min-width: 20px;
  }
  dd {
    font-size: 11px;
    color: var(--color-gray-400);
    margin: 0;
  }
`;

const formulaSectionTitle = css`
  font-size: 11px;
  font-weight: 600;
  color: var(--color-gray-300);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
`;

const formulaCode = css`
  font-family: 'SF Mono', SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  line-height: 1.7;
  color: var(--color-gray-600);
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-100);
  border-radius: var(--round-6);
  padding: 8px 12px;
  margin: 0 0 8px;
  overflow-x: auto;
  white-space: pre;
`;

const formulaTableWrap = css`
  overflow-x: auto;
  border: 1px solid var(--color-gray-100);
  border-radius: var(--round-6);
`;

const formulaTable = css`
  width: 100%;
  border-collapse: collapse;
  font-family: 'SF Mono', SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  th, td {
    padding: 4px 6px;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid var(--color-gray-50);
  }
  th {
    font-weight: 600;
    color: var(--color-gray-400);
    background: var(--color-gray-50);
    position: sticky;
    top: 0;
  }
  td { color: var(--color-gray-500); }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: var(--color-gray-25); }
`;

const formulaTdStep = css`
  font-weight: 600;
  color: var(--color-gray-600) !important;
  text-align: left !important;
`;

const formulaTdNeg = css`
  color: var(--color-gray-300) !important;
`;

// ---------------------------------------------------------------------------
// Styles – Slider tracks
// ---------------------------------------------------------------------------

const thumbCss = `
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 2px solid var(--color-gray-200);
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.15);
  cursor: pointer;
`;

const slider = css`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  -webkit-appearance: none;
  appearance: none;
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb { -webkit-appearance: none; ${thumbCss} }
  &::-moz-range-thumb { ${thumbCss} }
`;

const hueTrack = css`
  background: linear-gradient(to right,
    oklch(0.7 0.15 0), oklch(0.7 0.15 60), oklch(0.7 0.15 120),
    oklch(0.7 0.15 180), oklch(0.7 0.15 240), oklch(0.7 0.15 300), oklch(0.7 0.15 360));
`;

const chromaTrack = css`
  background: linear-gradient(to right,
    oklch(0.6 0 var(--theme-h)), oklch(0.6 0.3 var(--theme-h)));
`;

const lightnessTrack = css`
  background: linear-gradient(to right, oklch(0.15 0 0), oklch(0.5 0 0), oklch(0.85 0 0));
`;

// ---------------------------------------------------------------------------
// Styles – Tabs
// ---------------------------------------------------------------------------

const tabBar = css`
  display: flex;
  background: var(--color-gray-25);
  border-left: 1px solid var(--color-gray-100);
  border-right: 1px solid var(--color-gray-100);
  border-bottom: 1px solid var(--color-gray-100);
  gap: 0;
`;

const tabBtn = css`
  flex: 1;
  padding: 10px 0;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-gray-300);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  &:hover { color: var(--color-gray-600); }
`;

const tabBtnActive = css`
  color: var(--color-gray-900);
  border-bottom-color: var(--color-gray-900);
`;

const tabContent = css`
  padding: 24px;
  border: 1px solid var(--color-gray-100);
  border-top: none;
  border-radius: 0 0 var(--round-12) var(--round-12);
  min-height: 240px;
`;

// ---------------------------------------------------------------------------
// Styles – Palette tab
// ---------------------------------------------------------------------------

const section = css`
  margin-bottom: 28px;
  &:last-child { margin-bottom: 0; }
`;

const sectionTitle = css`
  font-size: 12px;
  font-weight: 600;
  color: var(--color-gray-300);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
`;

const palette = css`
  display: flex;
  gap: 4px;
`;

const swatchWrapper = css`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

const swatchBox = css`
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--round-6);
  overflow: hidden;
  position: relative;
`;

const swatchColor = css`
  position: absolute;
  inset: 0;
  border-radius: inherit;
`;

const checkerboard = css`
  background-color: white;
  background-image:
    linear-gradient(45deg, #ddd 25%, transparent 25%),
    linear-gradient(-45deg, #ddd 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #ddd 75%),
    linear-gradient(-45deg, transparent 75%, #ddd 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0;
`;

const swatchLabelCss = css`
  font-size: 10px;
  color: var(--color-gray-300);
  font-variant-numeric: tabular-nums;
`;

// ---------------------------------------------------------------------------
// Styles – Compare tab
// ---------------------------------------------------------------------------

const compareGrid = css`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const compareSection = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const compareRow = css`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const compareLabel = css`
  width: 72px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-gray-500);
`;

const compareDot = css`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const compareSwatches = css`
  flex: 1;
  display: flex;
  gap: 2px;
`;

const compareSwatchPair = css`
  flex: 1;
  height: 32px;
  border-radius: var(--round-4);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: inset 0 0 0 1px var(--color-gray-100);
`;

const compareSwatchHalf = css`
  flex: 1;
`;

const compareStepLabels = css`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const compareStepLabel = css`
  flex: 1;
  font-size: 9px;
  color: var(--color-gray-250);
  text-align: center;
  font-variant-numeric: tabular-nums;
`;

const compareLegend = css`
  display: flex;
  gap: 16px;
  margin-top: 4px;
  padding-left: 84px;
  font-size: 10px;
  color: var(--color-gray-400);
`;

const compareLegendItem = css`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const compareLegendDot = css`
  width: 10px;
  height: 6px;
  border-radius: 1px;
`;

const compareLegendDotTop = css`
  background: var(--color-gray-600);
`;

const compareLegendDotBottom = css`
  background: var(--color-gray-300);
  border: 1px dashed var(--color-gray-400);
`;

// ---------------------------------------------------------------------------
// Styles – Chat tab
// ---------------------------------------------------------------------------

const chatRoot = css`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

const chatActionItem = css`
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 9px;
  background: var(--color-theme-bg-75);
  border-radius: 26px;
  width: 100%;
`;

const chatHeader = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 12px;
  width: 100%;
`;

const chatTitleGroup = css`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`;

const chatTitleText = css`
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.28px;
  color: var(--color-gray-1000);
  white-space: nowrap;
`;

const chatSteps = css`
  display: flex;
  flex: 1;
  gap: 20px;
  align-items: center;
  justify-content: flex-end;
`;

const chatStepItem = css`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const chatTag = css`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 22px;
  width: 38px;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.5;
  letter-spacing: -0.24px;
  color: var(--color-white);
  white-space: nowrap;
`;

const chatTagGray = css`
  ${chatTag}
  background: var(--color-gray-200);
`;

const chatTagBlue = css`
  ${chatTag}
  background: var(--color-theme);
`;

const chatStepText = css`
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.28px;
  color: var(--color-gray-1000);
  white-space: nowrap;
`;

const chatStepTextDimmed = css`
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.28px;
  color: var(--color-gray-600);
  opacity: 0.5;
  white-space: nowrap;
`;

const chatPromptBox = css`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  background: var(--color-white);
  border: 1px solid var(--color-theme-bg-200);
  border-radius: var(--round-20);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
`;

const chatPromptInput = css`
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 16px;
  line-height: 28px;
  letter-spacing: -0.32px;
  color: var(--color-gray-300);
`;

const chatToolbar = css`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 8px;
`;

const chatToolbarLeft = css`
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
`;

const chatCurating = css`
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 2px 5px 2px 2px;
  background: var(--color-theme-75);
  border-radius: var(--round-8);
  color: var(--color-theme-400);
  font-size: 12px;
  line-height: 20px;
  letter-spacing: -0.24px;
  white-space: nowrap;
`;

const chatIconSvg = css`
  display: block;
  flex-shrink: 0;
`;

const chatSelector = css`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.28px;
  color: var(--color-gray-1000);
  white-space: nowrap;
`;

const chatDisclaimer = css`
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  letter-spacing: -0.24px;
  color: var(--color-gray-150);
  text-align: center;
  width: 100%;
`;
