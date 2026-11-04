import React from 'react';
import { arcPath, clamp, DIAL, DIAL_START, dialAngle, DialScale, DialTicks, polar } from './clusterGeometry';

interface Props {
  // Element ids are `${name}Arc`, `${name}Ticks` and `${name}Marker`.
  name: 'speed' | 'tach';
  id: (name: string) => string;
  cx: number;
  cy: number;
  scale: DialScale;
  // Reading in the scale's own units. Readings outside the scale stay on the dial.
  value: number;
  // url(#...) references for the fill gradient, the glass behind the centre and the glow filter.
  band: string;
  glass: string;
  glow: string;
  markerColor: string;
  // Drawn in the middle of the dial.
  children?: React.ReactNode;
}

// One round dial: face, filled ring, ticks and numbers, needle and the hub. The km/h and RPM
// dials are both drawn with it, so they are the same size and shape.
export default function Dial({
  name, id, cx, cy, scale, value, band, glass, glow, markerColor, children,
}: Props) {
  const angle = dialAngle(clamp(value / scale.max));
  const markerInner = polar(cx, cy, DIAL.markerInner, angle);
  const markerOuter = polar(cx, cy, DIAL.markerOuter, angle);
  return (
    <>
      <circle cx={cx} cy={cy} r={DIAL.face} fill="#020405" stroke="#93a7b5" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={DIAL.ring} fill="none" stroke="#1a242c" strokeWidth={DIAL.ringWidth} />
      <path id={id(`${name}Arc`)} d={arcPath(cx, cy, DIAL.ring, DIAL_START, angle)} fill="none" stroke={band}
        strokeWidth={DIAL.ringWidth} className="blue-glow" />
      <g id={id(`${name}Ticks`)}><DialTicks cx={cx} cy={cy} scale={scale} /></g>
      <line id={id(`${name}Marker`)} x1={markerInner.x} y1={markerInner.y} x2={markerOuter.x} y2={markerOuter.y}
        stroke={markerColor} strokeWidth="5" strokeLinecap="square" filter={glow} />
      <circle cx={cx} cy={cy} r={DIAL.hub} fill="#020405" stroke="#7c8790" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r={DIAL.hubGlass} fill={glass} stroke="#252c31" strokeWidth="1" />
      {children}
    </>
  );
}
