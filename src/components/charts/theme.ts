/**
 * Chart design tokens.
 *
 * The categorical slots and the ordinal ageing ramp were validated against the
 * white panel surface (lightness band, chroma floor, CVD separation,
 * normal-vision floor, contrast). Aqua sits below 3:1 on white, so every chart
 * that uses it ships direct labels or an accompanying table.
 */
export const SERIES = {
  primary: '#2a78d6',
  secondary: '#eb6834',
  tertiary: '#1baf7a',
} as const;

/** Ordinal ramp for ageing buckets: current through 90+ days, light to dark. */
export const AGING_RAMP = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'] as const;

/** Diverging polarity for profit and loss bars. */
export const POLARITY = {
  positive: '#2a78d6',
  negative: '#d03b3b',
  neutral: '#c3c2b7',
} as const;

export const CHART_INK = {
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  secondary: '#52514e',
  primary: '#0b0b0b',
  surface: '#ffffff',
} as const;

export const AXIS_PROPS = {
  stroke: CHART_INK.axis,
  tick: { fill: CHART_INK.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: CHART_INK.axis },
} as const;

export const GRID_PROPS = {
  stroke: CHART_INK.grid,
  strokeDasharray: '0',
  vertical: false,
} as const;

export const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
