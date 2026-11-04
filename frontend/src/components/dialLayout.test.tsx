/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import { render, within } from '@testing-library/react';
import MustangDashboard from './MustangDashboard';
import { ObdData } from '../types';

const VIEWBOX_WIDTH = 1920;

const drawCluster = (data: ObdData = { RPM: '3500', Speed: '84', Gear: 'N' }) =>
  render(<MustangDashboard data={data} speedUnit="km/h" />).container;

const part = (container: HTMLElement, name: string) =>
  container.querySelector(`[id$="-${name}"]`) as SVGElement;

// Where a circle really is: its own cx/cy plus every translate(x y) wrapped around it.
const circleOf = (group: Element) => {
  const circle = group.querySelector('circle') as SVGCircleElement;
  let x = Number(circle.getAttribute('cx'));
  let y = Number(circle.getAttribute('cy'));
  for (let el: Element | null = circle; el && el.tagName !== 'svg'; el = el.parentElement) {
    const shift = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(el.getAttribute('transform') ?? '');
    if (shift) {
      x += Number(shift[1]);
      y += Number(shift[2]);
    }
  }
  return { x, y, r: Number(circle.getAttribute('r')) };
};

const degreesOf = (line: Element, cx: number, cy: number) => {
  const dx = Number(line.getAttribute('x2')) - cx;
  const dy = Number(line.getAttribute('y2')) - cy;
  return ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
};

describe('RPM dial', () => {
  test('is a round dial on the left, a mirror image of the km/h dial', () => {
    const container = drawCluster();
    const rpm = circleOf(part(container, 'tachometer'));
    const speed = circleOf(part(container, 'speedometer'));

    expect(rpm.r).toBe(224);
    expect(rpm.r).toBe(speed.r);
    expect(rpm.y).toBe(speed.y);
    expect(rpm.x + speed.x).toBe(VIEWBOX_WIDTH);
  });

  test('no longer draws the horizontal tachometer strip', () => {
    const container = drawCluster();

    ['tachBase', 'tachFill', 'tachRim'].forEach((name) => expect(part(container, name)).toBeNull());
  });

  test.each([
    ['rest', '0', 135],
    ['the middle of the scale', '4500', 270],
    ['the end of the scale', '9000', 45],
    ['beyond the scale', '12000', 45],
    ['an unreadable value', 'garbage', 135],
  ])('points the needle at %s', (_label, rpm, expectedDegrees) => {
    const container = drawCluster({ RPM: rpm });
    const needle = part(container, 'tachMarker');

    expect(degreesOf(needle, 440, 360)).toBeCloseTo(expectedDegrees, 3);
  });

  test.each([
    ['rest', '0', 'M 295.04 504.96 A 205 205 0 0 1 295.04 504.96'],
    ['the middle of the scale', '4500', 'M 295.04 504.96 A 205 205 0 0 1 440.00 155.00'],
    ['the end of the scale', '9000', 'M 295.04 504.96 A 205 205 0 1 1 584.96 504.96'],
  ])('fills the ring up to %s', (_label, rpm, path) => {
    const container = drawCluster({ RPM: rpm });

    expect(part(container, 'tachArc')).toHaveAttribute('d', path);
  });

  test('shows the gear in the middle of the dial, where the km/h dial shows speed', () => {
    const container = drawCluster({ RPM: '3500', Gear: 'N' });
    const tach = within(part(container, 'tachometer') as unknown as HTMLElement);

    expect(tach.getByLabelText('Selected gear N')).toHaveTextContent('N');
    expect(tach.getByLabelText('Sport Plus')).toBeInTheDocument();
    expect(tach.getByText('RPM x 1000')).toBeInTheDocument();
    expect(part(container, 'gearValue')).toHaveAttribute('x', '440');
  });

  test('keeps the accessible name and the numbers around the ring', () => {
    const container = drawCluster({ RPM: '3500' });
    const tach = part(container, 'tachometer');

    expect(tach).toHaveAttribute('aria-label', 'Tachometer 3500 RPM');
    expect(Array.from(tach.querySelectorAll('[id$="-tachTicks"] text')).map((t) => t.textContent))
      .toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });
});

describe('small gauges', () => {
  const gauges = ['transGauge', 'oilGauge', 'engineGauge'];

  test('sit between the two dials without touching either', () => {
    const container = drawCluster();
    const rpm = circleOf(part(container, 'tachometer'));
    const speed = circleOf(part(container, 'speedometer'));

    gauges.forEach((name) => {
      const gauge = circleOf(part(container, name));
      [rpm, speed].forEach((dial) => {
        const clearance = Math.hypot(gauge.x - dial.x, gauge.y - dial.y) - gauge.r - dial.r;
        expect(clearance).toBeGreaterThanOrEqual(30);
      });
    });
  });

  test('are evenly spaced and centred between the dials', () => {
    const container = drawCluster();
    const [trans, oil, engine] = gauges.map((name) => circleOf(part(container, name)));

    expect(oil.x - trans.x).toBe(engine.x - oil.x);
    expect(oil.x).toBe(VIEWBOX_WIDTH / 2);
    expect(oil.x - trans.x).toBeGreaterThanOrEqual(2 * trans.r + 20);
  });

  test('keep their labels', () => {
    const container = drawCluster();

    ['TRANS TEMP', 'OIL PRESS', 'ENG TEMP'].forEach((label) =>
      expect(within(container).getByText(label)).toBeInTheDocument());
  });
});
