import React, { useId } from 'react';
import { ObdData, SpeedUnit } from '../types';
import { arcPath, clamp, polar, SmallGaugeScale, SpeedTicks, useTachometer } from './clusterGeometry';
import TemperatureIcon from './TemperatureIcon';
import OilTemperatureIcon from './OilTemperatureIcon';
import { activeTheme, ClusterTheme } from './clusterTheme';
import './MustangDashboard.css';

interface Props {
  data: ObdData;
  speedUnit: SpeedUnit;
  theme?: ClusterTheme;
}

const readNumber = (value: string | undefined, fallback: number): number => {
  const parsed = parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Geometry and styling ported directly from docs/design/MustangDashboard_992026.html.
const MustangDashboard: React.FC<Props> = ({ data, speedUnit, theme = activeTheme() }) => {
  const prefix = useId();
  const id = (name: string) => `${prefix}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const rpm = Math.max(0, readNumber(data.RPM, 0));
  const speed = Math.max(0, readNumber(data.Speed, 0));
  const gear = data.Gear || 'N';
  const gearSelector = data.GearSelector || data.DriveMode || 'D';
  const transTemp = readNumber(data.TransTemp, 160);
  // The reference uses oil pressure, which must not be substituted with oil temperature.
  const oilPressure = readNumber(data.OilPressure, NaN);
  const engineTemp = readNumber(data.EngineTemp, 200);
  const coolantTemp = readNumber(data.CoolantTemp || data['Coolant Temp'], 190);
  const odometer = Math.max(0, readNumber(data.Odometer, 1964.5));
  const fuelLevel = clamp(readNumber(data.FuelLevel, 65), 0, 100);
  const rangeToEmpty = Math.max(0, readNumber(data.RangeToEmpty, 289));
  const coolantPercent = clamp((coolantTemp - 100) / 160) * 100;
  const distanceUnit = speedUnit === 'mph' ? 'mi' : 'km';
  const speedUnitName = speedUnit === 'mph' ? 'miles per hour' : 'kilometers per hour';
  const rpmRatio = clamp(rpm / 9000);
  const tach = useTachometer(rpmRatio);
  const speedAngle = 135 + 270 * clamp(speed / 160);
  const speedInner = polar(1480, 360, 181, speedAngle);
  const speedOuter = polar(1480, 360, 229, speedAngle);
  const summary = `${Math.round(speed)} ${speedUnitName}, ${Math.round(rpm)} RPM, gear ${gear}. Transmission temperature, oil pressure, engine temperature, odometer, range, coolant and fuel.`;
  const styles = {
    '--cluster-text-shadow': url('textShadow'),
    '--cluster-silver-text': url('silverText'),
    '--cluster-blue-glow': url('blueGlow'),
  } as React.CSSProperties;

  return (
    <div className="mustang-dashboard" style={styles}>
    <svg id={id("dashboard")} viewBox="0 0 1920 720" preserveAspectRatio="xMidYMid meet"
         role="img" aria-labelledby={id("dashTitle")} aria-describedby={id("dashDesc")}>
      <title id={id("dashTitle")}>Mustang digital dashboard</title>
      <desc id={id("dashDesc")}>{summary}</desc>

      <defs>
        <linearGradient id={id("outerBezel")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#08090b"/>
          <stop offset=".24" stopColor="#55575a"/>
          <stop offset=".31" stopColor="#141517"/>
          <stop offset=".70" stopColor="#030405"/>
          <stop offset=".82" stopColor="#8c8f92"/>
          <stop offset=".90" stopColor="#222427"/>
          <stop offset="1" stopColor="#010203"/>
        </linearGradient>
        <linearGradient id={id("innerBezel")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b4b6b8"/>
          <stop offset=".08" stopColor="#292b2e"/>
          <stop offset=".45" stopColor="#060708"/>
          <stop offset=".80" stopColor="#5e6164"/>
          <stop offset="1" stopColor="#17191b"/>
        </linearGradient>
        <radialGradient id={id("glass")} cx=".5" cy=".42" r=".68">
          <stop offset="0" stopColor="#0a1016"/>
          <stop offset=".55" stopColor="#030608"/>
          <stop offset="1" stopColor="#000"/>
        </radialGradient>
        <linearGradient id={id("blueBand")} x1="0" y1="1" x2="1" y2="0">
          {theme.band.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color}/>)}
        </linearGradient>
        <linearGradient id={id("silverText")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff"/>
          <stop offset=".42" stopColor="#eef2f5"/>
          <stop offset=".55" stopColor="#aeb4ba"/>
          <stop offset="1" stopColor="#f8fafb"/>
        </linearGradient>
        <linearGradient id={id("sportBadgeSilver")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c5c9cb"/>
          <stop offset=".45" stopColor="#b5babd"/>
          <stop offset=".6" stopColor="#8f969b"/>
          <stop offset="1" stopColor="#b8bec2"/>
        </linearGradient>
        <filter id={id("blueGlow")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id={id("textShadow")} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity=".9"/>
        </filter>
        <filter id={id("bezelShadow")} x="-20%" y="-30%" width="140%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000" floodOpacity=".95"/>
        </filter>
        <filter id={id("softGlow")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="13"/>
        </filter>
        <pattern id={id("microTexture")} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r=".45" fill="#fff" opacity=".08"/>
          <circle cx="4" cy="3" r=".35" fill="#fff" opacity=".04"/>
        </pattern>
        <clipPath id={id("clusterClip")}>
          <path d="M355 73 C425 72 448 111 523 111 H1371 C1447 111 1488 72 1560 73
                   C1761 77 1884 188 1888 353 C1893 535 1788 659 1614 679
                   C1504 691 1465 624 1385 618 H540 C461 623 421 691 309 679
                   C132 661 27 536 32 353 C36 184 158 75 355 73 Z"/>
        </clipPath>
      </defs>

      <g filter={url("bezelShadow")}>
        <path d="M352 42 C430 39 461 85 528 87 H1362 C1430 85 1479 39 1560 42
                 C1789 45 1926 173 1928 353 C1930 563 1809 701 1618 716
                 C1494 726 1446 653 1376 648 H548 C478 653 432 726 302 715
                 C111 699 -11 561 -8 350 C-5 168 133 45 352 42 Z"
              fill="#070809" stroke={url("outerBezel")} strokeWidth="35"/>
        <path d="M355 73 C425 72 448 111 523 111 H1371 C1447 111 1488 72 1560 73
                 C1761 77 1884 188 1888 353 C1893 535 1788 659 1614 679
                 C1504 691 1465 624 1385 618 H540 C461 623 421 691 309 679
                 C132 661 27 536 32 353 C36 184 158 75 355 73 Z"
              fill={url("glass")} stroke={url("innerBezel")} strokeWidth="4"/>
      </g>

      <g clipPath={url("clusterClip")}>
        <ellipse cx="955" cy="330" rx="800" ry="290" fill={theme.tint} opacity=".18"/>
        <ellipse cx="950" cy="680" rx="590" ry="110" fill={theme.glow} opacity=".045" filter={url("softGlow")}/>
        <rect x="25" y="69" width="1870" height="620" fill={url("microTexture")} opacity=".17"/>
        <path d="M105 161 C462 78 1288 100 1794 177" fill="none" stroke="#fff" strokeOpacity=".035" strokeWidth="20"/>
      </g>

      <path d="M404 163 H1353 C1391 163 1424 178 1448 203
               C1320 229 1238 343 1238 469 C1238 520 1252 568 1279 607
               H283 C247 574 226 526 218 477 C194 329 249 205 365 171
               C378 166 391 163 404 163 Z"
            fill="#020405" stroke="#50606a" strokeWidth="1.4"/>

      <g id={id("tachometer")} className="boot" aria-label={`Tachometer ${Math.round(rpm)} RPM`}>
        <path id={id("tachBase")} d="M238 485 C188 371 207 249 304 194 C346 170 397 166 466 170 L1355 170"
              fill="none" stroke="#27333b" strokeWidth="31" opacity=".75"/>
        <path id={id("tachFill")} d="M238 485 C188 371 207 249 304 194 C346 170 397 166 466 170 L1355 170"
              pathLength="1000" fill="none" stroke={url("blueBand")} strokeWidth="30"
              strokeDasharray={`${(rpmRatio * 1000).toFixed(2)} 1000`} className="blue-glow" opacity=".93"/>
        <path ref={tach.pathRef} id={id("tachRim")} d="M238 485 C188 371 207 249 304 194 C346 170 397 166 466 170 L1355 170"
              fill="none" stroke="#8fa2b0" strokeWidth="1.4"/>
        <g id={id("tachTicks")}>{tach.ticks}</g>
        {tach.marker && <line id={id("tachMarker")} {...tach.marker}
              stroke={theme.tachMarker} strokeWidth="4" filter={url("blueGlow")}/>}
        <text x="1160" y="268" className="small">RPM x 1000</text>
      </g>

      <g className="boot-delay">
        <path d="M403 276 H1273" stroke="#8d9aa3" strokeOpacity=".8" strokeWidth="1"/>
        <path d="M283 578 H1274" stroke="#49545b" strokeWidth="1"/>
        <path d="M587 300 V548" stroke="#1d2429" strokeWidth="1"/>

        <g aria-label={`Selected gear ${gear}`}>
          <text x="419" y="337" textAnchor="middle" className="label">GEAR</text>
          <text id={id("gearValue")} x="420" y="458" textAnchor="middle" fontSize="126"
                fontWeight="300" className="metal-value value-shadow">{gear}</text>
          <g transform="translate(383 481)" fill={url("sportBadgeSilver")} aria-label="Sport Plus">
            <path d="M21 0 H50 L46 7 H22 Q17 7 16 10 H36 Q46 10 44 17 L42 22 Q39 27 32 27 H0 L5 20 H31 Q35 20 36 17 H16 Q5 17 8 10 L10 6 Q13 0 21 0 Z"/>
            <path d="M61 0 H68 L66 6 H73 L71 12 H64 L62 19 H55 L57 12 H50 L52 6 H59 Z"/>
          </g>
        </g>

        <g id={id("transGauge")} aria-label={`Transmission temperature ${Math.round(transTemp)} degrees Fahrenheit`}>
          <circle cx="705" cy="397" r="75" fill="#030506" stroke="#77818a" strokeWidth="1.5"/>
          <SmallGaugeScale cx={705} value={transTemp} min={100} max={300} blueBand={url("blueBand")} />
          <circle cx="705" cy="397" r="27" fill="none" stroke="#d8dde0" strokeWidth="6"/>
          <circle cx="705" cy="397" r="11" fill="none" stroke="#d8dde0" strokeWidth="4"/>
          <g stroke="#d8dde0" strokeWidth="5">
            <path d="M705 362 V373 M705 421 V432 M670 397 H681 M729 397 H740"/>
            <path d="M680 373 L688 381 M722 413 L730 421 M680 421 L688 413 M722 381 L730 373"/>
          </g>
          <path d="M709 379 V404 A8 8 0 1 1 701 404 V379 A4 4 0 0 1 709 379 Z"
                fill="#d8dde0"/>
          <text x="705" y="464" textAnchor="middle" className="small">°F</text>
          <text x="654" y="496" textAnchor="middle" className="label">100</text>
          <text x="756" y="496" textAnchor="middle" className="label">300</text>
          <text x="705" y="532" textAnchor="middle" className="small">TRANS TEMP</text>
        </g>

        <g id={id("oilGauge")} aria-label={Number.isFinite(oilPressure) ? `Oil pressure ${Math.round(oilPressure)} PSI` : "Oil pressure unavailable"}>
          <circle cx="913" cy="397" r="75" fill="#030506" stroke="#77818a" strokeWidth="1.5"/>
          <SmallGaugeScale cx={913} value={oilPressure} min={0} max={100} blueBand={url("blueBand")} />
          <OilTemperatureIcon transform="translate(879 370) scale(1.25)" />
          <text x="863" y="496" textAnchor="middle" className="label">L</text>
          <text x="963" y="496" textAnchor="middle" className="label">H</text>
          <text x="913" y="532" textAnchor="middle" className="small">OIL PRESS</text>
        </g>

        <g id={id("engineGauge")} aria-label={`Engine temperature ${Math.round(engineTemp)} degrees Fahrenheit`}>
          <circle cx="1121" cy="397" r="75" fill="#030506" stroke="#77818a" strokeWidth="1.5"/>
          <SmallGaugeScale cx={1121} value={engineTemp} min={140} max={340} blueBand={url("blueBand")} />
          <TemperatureIcon transform="translate(1089 367)" />
          <text x="1121" y="464" textAnchor="middle" className="small">°F</text>
          <text x="1070" y="496" textAnchor="middle" className="label">140</text>
          <text x="1172" y="496" textAnchor="middle" className="label">340</text>
          <text x="1121" y="532" textAnchor="middle" className="small">ENG TEMP</text>
        </g>
      </g>

      <g id={id("speedometer")} className="boot" aria-label={`Speed ${Math.round(speed)} ${speedUnitName}`}>
        <circle cx="1480" cy="360" r="224" fill="#020405" stroke="#93a7b5" strokeWidth="1.4"/>
        <circle cx="1480" cy="360" r="205" fill="none" stroke="#1a242c" strokeWidth="47"/>
        <path id={id("speedArc")} d={arcPath(1480, 360, 205, 135, speedAngle)} fill="none" stroke={url("blueBand")} strokeWidth="47" className="blue-glow"/>
        <g id={id("speedTicks")}><SpeedTicks /></g>
        <line id={id("speedMarker")} x1={speedInner.x} y1={speedInner.y} x2={speedOuter.x} y2={speedOuter.y} stroke={theme.speedMarker} strokeWidth="5" strokeLinecap="square"
              filter={url("blueGlow")}/>
        <circle cx="1480" cy="360" r="132" fill="#020405" stroke="#7c8790" strokeWidth="2.5"/>
        <circle cx="1480" cy="360" r="122" fill={url("glass")} stroke="#252c31" strokeWidth="1"/>
        <text x="1480" y="327" textAnchor="middle" className="label">{speedUnit.toUpperCase()}</text>
        <text id={id("speedValue")} x="1480" y="445" textAnchor="middle" fontSize="126"
              fontWeight="300" className="metal-value value-shadow">{Math.round(speed)}</text>
        <text x="1480" y="492" textAnchor="middle" className="label">{speedUnit.toUpperCase()}</text>
      </g>

      <g className="boot-delay">
        <path d="M282 575 H1277" stroke="#11181e" strokeWidth="6"/>
        <path d="M285 578 H1277" stroke="#64717a" strokeOpacity=".52" strokeWidth="1"/>

        <g aria-label={`Coolant temperature ${Math.round(coolantTemp)} degrees Fahrenheit`}>
          <text x="315" y="614" className="label">C</text>
          <path d="M346 598 C383 610 433 610 474 598" fill="none" stroke="#1b2730" strokeWidth="19"/>
          <path id={id("coolantArc")} d="M346 598 C383 610 433 610 474 598" pathLength="100"
                fill="none" stroke={url("blueBand")} strokeWidth="18" strokeDasharray={`${coolantPercent} 100`}/>
          <g stroke={theme.tick} strokeWidth="1.5" opacity=".75">
            <path d="M367 602 V620 M395 605 V623 M423 604 V622 M450 601 V619"/>
          </g>
          <path d="M474 598 L480 617" stroke="#ed1b14" strokeWidth="4"/>
          <text x="490" y="614" className="label">H</text>
          <TemperatureIcon transform="translate(520 590) scale(.55)" />
        </g>

        <text id={id("odometerValue")} x="630" y="614" className="label">{odometer.toFixed(1).padStart(8, "0")}</text>
        <text x="751" y="614" className="small">{distanceUnit}</text>

        <g aria-label={`Transmission in ${gearSelector}`}>
          {['P', 'R', 'N', 'D', 'S'].map((selector, index) => (
            <text key={selector} x={[848, 885, 923, 957, 990][index]} y="615" fontSize="30"
              className={selector === gearSelector ? 'drive-text' : 'muted-text'}>
              {selector}
            </text>
          ))}
        </g>

        <text id={id("rangeValue")} x="1117" y="614" className="label">{Math.round(rangeToEmpty)}</text>
        <text x="1173" y="614" className="small">{distanceUnit} to E</text>

        <g aria-label={`Fuel level ${Math.round(fuelLevel)} percent`}>
          <g id={id("fuelPump")} transform="translate(1345 590)">
            <path d="M4 0 H15 Q17 0 17 2 V28 H19 L21 31 H0 L2 28 V2 Q2 0 4 0 Z M5 3 H14 V10 H5 Z"
                  fill="#c7ccd0" fillRule="evenodd"/>
            <path d="M17 11 H19 C23 11 23 15 23 19 V22 C23 28 30 28 30 22 L27 9 L21 1 M25 6 L23 9 L27 12"
                  fill="none" stroke="#c7ccd0" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/>
          </g>
          <text x="1386" y="615" className="label">E</text>
          <path d="M1414 599 C1452 610 1512 610 1551 599" fill="none" stroke="#1b2730" strokeWidth="19"/>
          <path id={id("fuelArc")} d="M1414 599 C1452 610 1512 610 1551 599" pathLength="100"
                fill="none" stroke={url("blueBand")} strokeWidth="18" strokeDasharray={`${fuelLevel} 100`}/>
          <path d="M1414 599 L1408 618" stroke="#ed1b14" strokeWidth="4"/>
          <g stroke={theme.tick} strokeWidth="1.5" opacity=".75">
            <path d="M1445 605 V623 M1478 607 V625 M1511 605 V623 M1540 602 V620"/>
          </g>
          <text x="1577" y="615" className="label">F</text>
        </g>
      </g>
    </svg>
    </div>
  );
};

export default MustangDashboard;
