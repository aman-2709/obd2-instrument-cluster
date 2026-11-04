/* eslint-disable testing-library/no-container */
/* eslint-disable testing-library/no-node-access */
import { render } from '@testing-library/react';
import MustangDashboard from './MustangDashboard';
import {
  activeTheme,
  blueTheme,
  ClusterTheme,
  DEFAULT_THEME,
  greenTheme,
  resolveTheme,
} from './clusterTheme';

const colorsOf = (theme: ClusterTheme): string[] => [
  ...theme.band.map(([, color]) => color),
  theme.speedMarker,
  theme.tachMarker,
  theme.tick,
  theme.glow,
  theme.tint,
];

const channels = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

// HSL hue in degrees (0 = red, 120 = green, 240 = blue).
const hueOf = (hex: string): number => {
  const [r, g, b] = channels(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (hue * 60 + 360) % 360;
};

// WCAG relative luminance.
const luminanceOf = (hex: string): number => {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const bandStops = (container: HTMLElement): Array<[string | null, string | null]> =>
  Array.from(container.querySelectorAll('[id$="-blueBand"] stop')).map((stop) => [
    stop.getAttribute('offset'),
    stop.getAttribute('stop-color'),
  ]);

const data = { RPM: '3500', Speed: '100', Gear: '4', FuelLevel: '65', CoolantTemp: '195' };

describe('cluster themes', () => {
  afterEach(() => {
    delete process.env.REACT_APP_CLUSTER_THEME;
  });

  describe('blue (version 1)', () => {
    test('keeps the exact colours the cluster shipped with', () => {
      expect(blueTheme.name).toBe('blue');
      expect(blueTheme.band).toEqual([
        ['0', '#00142d'],
        ['.38', '#003f92'],
        ['.72', '#008dff'],
        ['.90', '#0fb8ff'],
        ['1', '#e8fbff'],
      ]);
      expect(blueTheme.speedMarker).toBe('#e8fbff');
      expect(blueTheme.tachMarker).toBe('#ecfaff');
      expect(blueTheme.tick).toBe('#64b7ff');
      expect(blueTheme.glow).toBe('#0078ff');
      expect(blueTheme.tint).toBe('#07131d');
    });

    test.each(colorsOf(blueTheme))('%s has a blue hue', (color) => {
      expect(hueOf(color)).toBeGreaterThanOrEqual(180);
      expect(hueOf(color)).toBeLessThanOrEqual(260);
    });
  });

  describe('green (version 2)', () => {
    test('has a name', () => {
      expect(greenTheme.name).toBe('green');
    });

    test('is the default theme', () => {
      expect(DEFAULT_THEME).toBe('green');
      expect(resolveTheme(undefined)).toBe(greenTheme);
    });

    test.each(colorsOf(greenTheme))('%s has a green hue', (color) => {
      expect(hueOf(color)).toBeGreaterThanOrEqual(90);
      expect(hueOf(color)).toBeLessThanOrEqual(170);
    });

    test('keeps the same gradient shape as blue', () => {
      expect(greenTheme.band.map(([offset]) => offset)).toEqual(blueTheme.band.map(([offset]) => offset));
      const luminances = greenTheme.band.map(([, color]) => luminanceOf(color));
      expect([...luminances].sort((a, b) => a - b)).toEqual(luminances);
    });

    test('shares no colour with blue', () => {
      const blue = colorsOf(blueTheme).map((c) => c.toLowerCase());
      colorsOf(greenTheme).forEach((color) => expect(blue).not.toContain(color.toLowerCase()));
    });

    test('is not brighter than blue at the gradient midpoint by more than a small margin', () => {
      const [, blueMid] = blueTheme.band[2];
      const [, greenMid] = greenTheme.band[2];
      expect(luminanceOf(greenMid)).toBeLessThan(luminanceOf(blueMid) + 0.08);
    });
  });

  describe('resolveTheme', () => {
    test.each([
      ['green', greenTheme],
      ['blue', blueTheme],
      ['GREEN', greenTheme],
      ['  green  ', greenTheme],
    ])('%j resolves to the matching theme', (name, expected) => {
      expect(resolveTheme(name)).toBe(expected);
    });

    test.each([undefined, '', '   ', 'purple', 'gre en', 'constructor', '__proto__', 'toString'])('%j falls back to the default theme', (name) => {
      expect(resolveTheme(name)).toBe(resolveTheme(DEFAULT_THEME));
    });
  });

  describe('activeTheme', () => {
    test('is the default theme when REACT_APP_CLUSTER_THEME is not set', () => {
      expect(activeTheme()).toBe(resolveTheme(DEFAULT_THEME));
    });

    test.each([
      ['blue', blueTheme],
      ['green', greenTheme],
    ])('follows REACT_APP_CLUSTER_THEME=%s', (name, expected) => {
      process.env.REACT_APP_CLUSTER_THEME = name;
      expect(activeTheme()).toBe(expected);
    });

    test('treats an empty REACT_APP_CLUSTER_THEME (what Docker Compose passes when unset) as the default', () => {
      process.env.REACT_APP_CLUSTER_THEME = '';
      expect(activeTheme()).toBe(resolveTheme(DEFAULT_THEME));
    });

    test('ignores an unknown REACT_APP_CLUSTER_THEME', () => {
      process.env.REACT_APP_CLUSTER_THEME = 'orange';
      expect(activeTheme()).toBe(resolveTheme(DEFAULT_THEME));
    });
  });

  describe('MustangDashboard rendering', () => {
    test('renders the default theme (green) when nothing is chosen', () => {
      const { container } = render(<MustangDashboard data={data} speedUnit="km/h" />);

      expect(bandStops(container)).toEqual(greenTheme.band.map(([offset, color]) => [offset, color]));
      expect(container.querySelector('[id$="-speedMarker"]')).toHaveAttribute('stroke', greenTheme.speedMarker);
    });

    test('renders the original blue look when blue is chosen', () => {
      const { container } = render(<MustangDashboard data={data} speedUnit="km/h" theme={blueTheme} />);

      expect(bandStops(container)).toEqual(blueTheme.band.map(([offset, color]) => [offset, color]));
      expect(container.querySelector('[id$="-speedMarker"]')).toHaveAttribute('stroke', blueTheme.speedMarker);
      expect(container.querySelectorAll(`g[stroke="${blueTheme.tick}"]`)).toHaveLength(2);
      expect(container.querySelector(`ellipse[fill="${blueTheme.glow}"]`)).toBeInTheDocument();
      expect(container.querySelector(`ellipse[fill="${blueTheme.tint}"]`)).toBeInTheDocument();
    });

    test('renders every themed element in green when asked', () => {
      const { container } = render(<MustangDashboard data={data} speedUnit="km/h" theme={greenTheme} />);

      expect(bandStops(container)).toEqual(greenTheme.band.map(([offset, color]) => [offset, color]));
      expect(container.querySelector('[id$="-speedMarker"]')).toHaveAttribute('stroke', greenTheme.speedMarker);
      expect(container.querySelectorAll(`g[stroke="${greenTheme.tick}"]`)).toHaveLength(2);
      expect(container.querySelector(`ellipse[fill="${greenTheme.glow}"]`)).toBeInTheDocument();
      expect(container.querySelector(`ellipse[fill="${greenTheme.tint}"]`)).toBeInTheDocument();
    });

    test('leaves no blue behind in the green theme', () => {
      const { container } = render(<MustangDashboard data={data} speedUnit="km/h" theme={greenTheme} />);
      const markup = container.innerHTML.toLowerCase();

      colorsOf(blueTheme).forEach((color) => expect(markup).not.toContain(color.toLowerCase()));
    });

    test('leaves no green behind in the blue theme', () => {
      const { container } = render(<MustangDashboard data={data} speedUnit="km/h" theme={blueTheme} />);
      const markup = container.innerHTML.toLowerCase();

      colorsOf(greenTheme).forEach((color) => expect(markup).not.toContain(color.toLowerCase()));
    });

    test.each([
      ['tachometer fill', '-tachFill'],
      ['speed arc', '-speedArc'],
      ['coolant arc', '-coolantArc'],
      ['fuel arc', '-fuelArc'],
    ])('%s still paints with the shared band gradient in both themes', (_label, suffix) => {
      [blueTheme, greenTheme].forEach((theme) => {
        const { container, unmount } = render(<MustangDashboard data={data} speedUnit="km/h" theme={theme} />);
        expect(container.querySelector(`[id$="${suffix}"]`)?.getAttribute('stroke')).toMatch(/^url\(#.*-blueBand\)$/);
        unmount();
      });
    });

    test('follows REACT_APP_CLUSTER_THEME when no theme is passed', () => {
      process.env.REACT_APP_CLUSTER_THEME = 'blue';
      const { container } = render(<MustangDashboard data={data} speedUnit="km/h" />);

      expect(bandStops(container)).toEqual(blueTheme.band.map(([offset, color]) => [offset, color]));
    });

    test('an explicit theme wins over REACT_APP_CLUSTER_THEME', () => {
      process.env.REACT_APP_CLUSTER_THEME = 'blue';
      const { container } = render(<MustangDashboard data={data} speedUnit="km/h" theme={greenTheme} />);

      expect(bandStops(container)).toEqual(greenTheme.band.map(([offset, color]) => [offset, color]));
    });

    test('two clusters with different themes do not share a gradient', () => {
      const { container } = render(
        <>
          <MustangDashboard data={data} speedUnit="km/h" theme={blueTheme} />
          <MustangDashboard data={data} speedUnit="km/h" theme={greenTheme} />
        </>
      );
      const gradients = container.querySelectorAll('[id$="-blueBand"]');

      expect(gradients).toHaveLength(2);
      expect(gradients[0].id).not.toBe(gradients[1].id);
    });
  });
});
