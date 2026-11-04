export type ClusterThemeName = 'blue' | 'green';

// Every accent colour of the instrument cluster. Neutral chrome (bezel, dials, text) is not
// themed. The gradient and CSS role names in MustangDashboard still say "blue"; the colours
// come from here.
export interface ClusterTheme {
  name: ClusterThemeName;
  // [offset, colour] stops of the one gradient that fills the RPM arc, speed ring, the three
  // small gauges and the coolant and fuel bars.
  band: ReadonlyArray<readonly [string, string]>;
  speedMarker: string;
  tachMarker: string;
  // Tick marks under the coolant and fuel bars.
  tick: string;
  // Faint haze under the cluster.
  glow: string;
  // Dark tint behind the dials.
  tint: string;
}

// Version 1, the original look. These are the colours the cluster shipped with; do not change
// them. Select it with REACT_APP_CLUSTER_THEME=blue.
export const blueTheme: ClusterTheme = {
  name: 'blue',
  band: [
    ['0', '#00142d'],
    ['.38', '#003f92'],
    ['.72', '#008dff'],
    ['.90', '#0fb8ff'],
    ['1', '#e8fbff'],
  ],
  speedMarker: '#e8fbff',
  tachMarker: '#ecfaff',
  tick: '#64b7ff',
  glow: '#0078ff',
  tint: '#07131d',
};

// Versions 2 and 3, the default. Each colour is the blue above with its hue moved to green (OKLCH hue
// 150, 160 for the near-whites) at the same lightness and chroma, so the glow and contrast match.
export const greenTheme: ClusterTheme = {
  name: 'green',
  band: [
    ['0', '#001a07'],
    ['.38', '#015423'],
    ['.72', '#03a94e'],
    ['.90', '#5bc570'],
    ['1', '#ecfbf2'],
  ],
  speedMarker: '#ecfbf2',
  tachMarker: '#eefbf3',
  tick: '#6dc782',
  glow: '#039a46',
  tint: '#09150b',
};

const THEMES: Record<ClusterThemeName, ClusterTheme> = { blue: blueTheme, green: greenTheme };

// The theme used when none is chosen. This is the one place a release decides its colour:
// version 1 was blue, versions 2 and 3 are green.
export const DEFAULT_THEME: ClusterThemeName = 'green';

const isThemeName = (value: string): value is ClusterThemeName =>
  Object.prototype.hasOwnProperty.call(THEMES, value);

// Unknown, empty or missing names fall back to the default, so a typo (or the empty value
// Docker Compose passes for an unset variable) never breaks the cluster.
export const resolveTheme = (name?: string): ClusterTheme => {
  const key = (name ?? '').trim().toLowerCase();
  return THEMES[isThemeName(key) ? key : DEFAULT_THEME];
};

// Read at call time. In a Create React App build the variable is fixed when the app is built or
// the dev server starts.
export const activeTheme = (): ClusterTheme => resolveTheme(process.env.REACT_APP_CLUSTER_THEME);
