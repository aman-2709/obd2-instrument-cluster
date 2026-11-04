import React from 'react';

export const clamp = (value: number, min = 0, max = 1): number =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;

export const polar = (cx: number, cy: number, radius: number, degrees: number) => {
  const radians = degrees * Math.PI / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
};

export const arcPath = (cx: number, cy: number, radius: number, start: number, end: number): string => {
  const a = polar(cx, cy, radius, start);
  const b = polar(cx, cy, radius, end);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 ${end - start > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};

// The km/h and RPM dials sweep the same way: they start at 135 degrees (lower left) and run
// clockwise over the top for 270 degrees, ending at 45 degrees (lower right).
export const DIAL_START = 135;
const DIAL_SWEEP = 270;

// Angle of a reading, as a fraction of the full scale. Readings outside the scale stay on the dial.
export const dialAngle = (ratio: number): number => DIAL_START + DIAL_SWEEP * clamp(ratio);

// Radii of one dial, measured from its centre. Both dials are drawn with these.
export const DIAL = {
  face: 224,
  ring: 205,
  ringWidth: 47,
  tickOuter: 214,
  tickMajor: 190,
  tickMedium: 196,
  tickMinor: 201,
  label: 169,
  markerInner: 181,
  markerOuter: 229,
  hub: 132,
  hubGlass: 122,
} as const;

export interface DialScale {
  // Reading at the end of the sweep.
  max: number;
  // Distance between ticks. The scale starts at 0.
  step: number;
  // A long, labelled tick every `major`, and a medium one every `medium`.
  major: number;
  medium: number;
  // Ticks and labels from this reading on are red.
  redFrom?: number;
  label: (value: number) => string;
}

export const SPEED_SCALE: DialScale = {
  max: 160, step: 2, major: 20, medium: 10, label: String,
};

// RPM is read in thousands: ticks every 100 rpm, numbers 0 to 9, red from 7500.
export const RPM_SCALE: DialScale = {
  max: 9000, step: 100, major: 1000, medium: 500, redFrom: 7500, label: (rpm) => String(rpm / 1000),
};

const REDLINE_LABEL = '#df1710';

interface DialTicksProps {
  cx: number;
  cy: number;
  scale: DialScale;
}

export const DialTicks = React.memo(function DialTicks({ cx, cy, scale }: DialTicksProps) {
  return <>{Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, index) => {
    const value = index * scale.step;
    const angle = dialAngle(value / scale.max);
    const major = value % scale.major === 0;
    const medium = value % scale.medium === 0;
    const red = scale.redFrom !== undefined && value >= scale.redFrom;
    const outer = polar(cx, cy, DIAL.tickOuter, angle);
    const inner = polar(cx, cy, major ? DIAL.tickMajor : medium ? DIAL.tickMedium : DIAL.tickMinor, angle);
    const label = polar(cx, cy, DIAL.label, angle);
    return (
      <g key={value}>
        <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
          className={`tick ${major ? '' : 'minor'}${red ? ' red' : ''}`} strokeWidth={major ? 3 : medium ? 2 : 1.4} />
        {major && (
          <text x={label.x} y={label.y + 10} textAnchor="middle" fontSize="34" fill="#cbd0d4"
            style={red ? { fill: REDLINE_LABEL } : undefined}>
            {scale.label(value)}
          </text>
        )}
      </g>
    );
  })}</>;
});

interface SmallGaugeScaleProps {
  cx: number;
  value: number;
  min: number;
  max: number;
  blueBand: string;
}

export function SmallGaugeScale({ cx, value, min, max, blueBand }: SmallGaugeScaleProps) {
  const fraction = clamp((value - min) / (max - min));
  return (
    <>
      <path d={arcPath(cx, 397, 65, 135, 405)} fill="none" stroke="#1c2730" strokeWidth="18" />
      <path d={arcPath(cx, 397, 65, 135, 135 + 270 * fraction)} fill="none" stroke={blueBand} strokeWidth="18" />
      <path d={arcPath(cx, 397, 76, 372, 405)} fill="none" stroke="#ed1b14" strokeWidth="4" />
      {Array.from({ length: 19 }, (_, i) => {
        const angle = 135 + i * 15;
        const p1 = polar(cx, 397, i % 3 === 0 ? 54 : 57, angle);
        const p2 = polar(cx, 397, 65, angle);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={i >= 16 ? '#ec1a11' : '#c4cad0'}
          strokeOpacity={i % 3 === 0 ? '.95' : '.68'} strokeWidth={i % 3 === 0 ? '2' : '1.2'} />;
      })}
    </>
  );
}
