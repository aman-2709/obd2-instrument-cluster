/* eslint-disable testing-library/no-container, testing-library/no-node-access */
import { render } from '@testing-library/react';
import { clamp, DialTicks, dialAngle, polar, RPM_SCALE, SPEED_SCALE } from './clusterGeometry';

const renderTicks = (cx: number, cy: number, scale: typeof RPM_SCALE) => {
  const { container } = render(<svg><DialTicks cx={cx} cy={cy} scale={scale} /></svg>);
  return {
    ticks: Array.from(container.querySelectorAll('line')),
    labels: Array.from(container.querySelectorAll('text')),
  };
};

const point = (line: Element, end: '1' | '2') => ({
  x: Number(line.getAttribute(`x${end}`)),
  y: Number(line.getAttribute(`y${end}`)),
});

describe('dialAngle', () => {
  test.each([
    [0, 135],
    [0.5, 270],
    [1, 405],
  ])('ratio %s sits at %s degrees on the 270 degree sweep', (ratio, degrees) => {
    expect(dialAngle(ratio)).toBeCloseTo(degrees, 10);
  });

  test.each([
    ['below the scale', -1, 135],
    ['above the scale', 2, 405],
    ['not a number', NaN, 135],
    ['infinite', Infinity, 135],
  ])('keeps a reading that is %s on the dial', (_label, ratio, degrees) => {
    expect(dialAngle(ratio)).toBe(degrees);
  });

  test('agrees with clamp, which the dials use for every reading', () => {
    expect(dialAngle(5)).toBe(dialAngle(clamp(5)));
    expect(dialAngle(-5)).toBe(dialAngle(clamp(-5)));
  });
});

describe('DialTicks on the RPM scale', () => {
  const { ticks, labels } = renderTicks(440, 360, RPM_SCALE);

  test('draws a tick every 100 rpm from 0 to 9000', () => {
    expect(ticks).toHaveLength(91);
  });

  test('makes every 1000 rpm a major tick and labels it 0 to 9', () => {
    expect(ticks.filter((tick) => !tick.classList.contains('minor'))).toHaveLength(10);
    expect(labels.map((label) => label.textContent)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  test('turns the ticks red from 7500 rpm and the 8 and 9 labels with them', () => {
    const red = ticks.map((tick, index) => [index, tick.classList.contains('red')] as const);

    expect(red.filter(([, isRed]) => isRed)).toHaveLength(16);
    expect(red[74][1]).toBe(false);
    expect(red[75][1]).toBe(true);
    expect(red[90][1]).toBe(true);
    expect(labels.map((label) => (label as SVGElement).style.fill !== '')).toEqual(
      [false, false, false, false, false, false, false, false, true, true]
    );
  });

  test('runs clockwise from 135 degrees to 405 degrees around the centre', () => {
    const first = point(ticks[0], '2');
    const last = point(ticks[90], '2');
    const start = polar(440, 360, 214, 135);
    const end = polar(440, 360, 214, 405);

    expect(first.x).toBeCloseTo(start.x, 6);
    expect(first.y).toBeCloseTo(start.y, 6);
    expect(last.x).toBeCloseTo(end.x, 6);
    expect(last.y).toBeCloseTo(end.y, 6);
  });

  test('puts the middle of the scale, 4500 rpm, straight up from the centre', () => {
    const middle = point(ticks[45], '2');

    expect(middle.x).toBeCloseTo(440, 6);
    expect(middle.y).toBeCloseTo(360 - 214, 6);
  });

  test('keeps every tick on one ring around the centre', () => {
    ticks.forEach((tick) => {
      const outer = point(tick, '2');
      expect(Math.hypot(outer.x - 440, outer.y - 360)).toBeCloseTo(214, 6);
    });
  });
});

describe('DialTicks on the speed scale', () => {
  const { ticks, labels } = renderTicks(1480, 360, SPEED_SCALE);

  test('draws a tick every 2 up to 160 and labels every 20', () => {
    expect(ticks).toHaveLength(81);
    expect(labels.map((label) => label.textContent)).toEqual(
      ['0', '20', '40', '60', '80', '100', '120', '140', '160']
    );
  });

  test('has no red zone', () => {
    expect(ticks.some((tick) => tick.classList.contains('red'))).toBe(false);
    labels.forEach((label) => expect((label as SVGElement).style.fill).toBe(''));
  });
});
