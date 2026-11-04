/* eslint-disable testing-library/no-container */
/* eslint-disable testing-library/no-node-access */
import { render, screen, within } from '@testing-library/react';
import App from './App';
import BottomInfoBar from './components/BottomInfoBar';
import CoolantBar from './components/CoolantBar';
import GearIndicator from './components/GearIndicator';
import MiniGauge from './components/MiniGauge';
import MustangDashboard from './components/MustangDashboard';
import RPMArc from './components/RPMArc';
import SpeedArc from './components/SpeedArc';
import { ObdData } from './types';

const mockDashboardData: ObdData = {
  RPM: '3500',
  Speed: '100',
  Gear: '4',
  DriveMode: 'D',
  OilTemp: '200',
  OilPressure: '58',
  TransTemp: '180',
  EngineTemp: '210',
  CoolantTemp: '195',
  Odometer: '1964.5',
  FuelLevel: '65',
  RangeToEmpty: '289',
  GearSelector: 'D',
};

jest.mock('./hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    data: mockDashboardData,
    speedUnit: 'km/h' as const,
    toggleSpeedUnit: jest.fn(),
  }),
}));

describe('App', () => {
  test('renders live WebSocket telemetry in the supplied instrument cluster', () => {
    render(<App />);

    expect(screen.getByRole('img', { name: 'Mustang digital dashboard' }))
      .toHaveAccessibleDescription(/100 kilometers per hour, 3500 RPM, gear 4/);
    expect(screen.getByLabelText('Speed 100 kilometers per hour')).toBeInTheDocument();
    expect(screen.getByText('001964.5')).toBeInTheDocument();
    expect(screen.getByText('289')).toBeInTheDocument();
    expect(screen.getByText('km to E')).toBeInTheDocument();
  });
});

describe('MustangDashboard', () => {
  test('renders the original HTML composition as one scalable instrument cluster', () => {
    const { container } = render(
      <MustangDashboard data={mockDashboardData} speedUnit="km/h" />
    );

    expect(screen.getByRole('img', { name: 'Mustang digital dashboard' }))
      .toHaveAttribute('viewBox', '0 0 1920 720');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByText('RPM x 1000')).toBeInTheDocument();
    expect(screen.queryByText('GEAR')).not.toBeInTheDocument();
    expect(screen.getByText('TRANS TEMP')).toBeInTheDocument();
    expect(screen.getByText('OIL PRESS')).toBeInTheDocument();
    expect(screen.getByText('ENG TEMP')).toBeInTheDocument();
  });

  test('updates instruments, distances, units and transmission selection with new telemetry', () => {
    const { rerender } = render(
      <MustangDashboard data={mockDashboardData} speedUnit="km/h" />
    );

    expect(screen.getByLabelText('Tachometer 3500 RPM')).toBeInTheDocument();
    expect(screen.getByLabelText('Transmission temperature 180 degrees Fahrenheit')).toBeInTheDocument();
    expect(screen.getByLabelText('Oil pressure 58 PSI')).toBeInTheDocument();
    expect(screen.getByLabelText('Engine temperature 210 degrees Fahrenheit')).toBeInTheDocument();
    expect(screen.getByLabelText('Fuel level 65 percent')).toBeInTheDocument();

    rerender(<MustangDashboard data={{
      ...mockDashboardData, RPM: '4500', Speed: '55', Gear: '5', GearSelector: 'S',
      TransTemp: '178', OilPressure: '40', EngineTemp: '220', FuelLevel: '72',
      Odometer: '12345.6', RangeToEmpty: '180',
    }} speedUnit="mph" />);

    expect(screen.getByLabelText('Tachometer 4500 RPM')).toBeInTheDocument();
    expect(screen.getByLabelText('Speed 55 miles per hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Selected gear 5')).toHaveTextContent('5');
    expect(screen.getByLabelText('Oil pressure 40 PSI')).toBeInTheDocument();
    expect(screen.getByLabelText('Transmission temperature 178 degrees Fahrenheit')).toBeInTheDocument();
    expect(screen.getByLabelText('Engine temperature 220 degrees Fahrenheit')).toBeInTheDocument();
    expect(screen.getByLabelText('Fuel level 72 percent')).toBeInTheDocument();
    expect(screen.getByText('012345.6')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('mi to E')).toBeInTheDocument();
    const selector = screen.getByLabelText('Transmission in S');
    expect(within(selector).getByText('S')).toHaveClass('drive-text');
    expect(within(selector).getByText('D')).toHaveClass('muted-text');
  });

  test('uses existing fallbacks and leaves unavailable oil pressure unfilled', () => {
    render(<MustangDashboard data={{ OilTemp: '200' }} speedUnit="mph" />);

    expect(screen.getByLabelText('Selected gear N')).toBeInTheDocument();
    expect(screen.getByLabelText('Speed 0 miles per hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Tachometer 0 RPM')).toBeInTheDocument();
    expect(screen.getByLabelText('Oil pressure unavailable')).toBeInTheDocument();
    expect(screen.getByText('001964.5')).toBeInTheDocument();
    expect(screen.getByText('mi to E')).toBeInTheDocument();
  });

  test('accepts the legacy coolant temperature key and clamps gauge fills', () => {
    const { container, rerender } = render(
      <MustangDashboard data={{
        ...mockDashboardData, CoolantTemp: undefined, 'Coolant Temp': '260',
        RPM: '12000', FuelLevel: '150',
      }} speedUnit="km/h" />
    );

    expect(screen.getByLabelText('Coolant temperature 260 degrees Fahrenheit')).toBeInTheDocument();
    expect(container.querySelector('[id$="-coolantArc"]')).toHaveAttribute('stroke-dasharray', '100 100');
    expect(container.querySelector('[id$="-fuelArc"]')).toHaveAttribute('stroke-dasharray', '100 100');
    // Past the end of the scale the RPM arc stops at the end of the 270 degree sweep.
    expect(container.querySelector('[id$="-tachArc"]')).toHaveAttribute('d', 'M 295.04 504.96 A 205 205 0 1 1 584.96 504.96');

    rerender(<MustangDashboard data={{
      RPM: '-100', Speed: 'invalid', FuelLevel: '-20', CoolantTemp: 'Infinity',
    }} speedUnit="km/h" />);

    expect(container.querySelector('[id$="-fuelArc"]')).toHaveAttribute('stroke-dasharray', '0 100');
    // A negative reading draws an empty arc, a zero length one at the start of the sweep.
    expect(container.querySelector('[id$="-tachArc"]')).toHaveAttribute('d', 'M 295.04 504.96 A 205 205 0 0 1 295.04 504.96');
    expect(screen.getByLabelText('Speed 0 kilometers per hour')).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});

describe('GearIndicator', () => {
  test.each([
    ['4', 'D'],
    ['N', 'N'],
    ['P', 'P'],
  ])('renders gear %s and drive mode %s', (gear, driveMode) => {
    render(<GearIndicator gear={gear} driveMode={driveMode} rpm={3500} />);

    expect(screen.getByText('GEAR')).toBeInTheDocument();
    expect(screen.getAllByText(gear).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(driveMode).length).toBeGreaterThanOrEqual(1);
  });
});

describe('MiniGauge', () => {
  test.each([
    ['oil' as const, '200°F'],
    ['trans' as const, '180'],
    ['engine' as const, '210°F'],
  ])('renders the %s gauge with SVG icon and value', (icon, valueText) => {
    const { container } = render(
      <MiniGauge
        label={icon === 'trans' ? '' : '°F'}
        icon={icon}
        value={parseInt(valueText, 10)}
        min={icon === 'oil' ? 100 : 140}
        max={icon === 'engine' ? 340 : 300}
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText(valueText)).toBeInTheDocument();
  });

  test('clamps low values so no active arc is drawn', () => {
    render(
      <MiniGauge label="°F" icon="oil" value={50} min={100} max={300} />
    );

    expect(screen.getByText('50°F')).toBeInTheDocument();
  });

  test('renders name label below gauge when provided', () => {
    render(
      <MiniGauge name="TRANS TEMP" label="°F" icon="trans" value={200} min={100} max={300} />
    );

    expect(screen.getByText('TRANS TEMP')).toBeInTheDocument();
  });
});

describe('BottomInfoBar', () => {
  test('renders distance values in kilometers', () => {
    render(
      <BottomInfoBar
        odometer={1964.5}
        gearSelector="D"
        rangeToEmpty={289}
        fuelLevel={65}
        speedUnit="km/h"
        coolantTemp={190}
      />
    );

    expect(screen.getByText('1964.5 km')).toBeInTheDocument();
    expect(screen.getByText('289 km to E')).toBeInTheDocument();
  });

  test('renders distance values in miles', () => {
    render(
      <BottomInfoBar
        odometer={1220.5}
        gearSelector="S"
        rangeToEmpty={180}
        fuelLevel={65}
        speedUnit="mph"
        coolantTemp={190}
      />
    );

    expect(screen.getByText('1220.5 mi')).toBeInTheDocument();
    expect(screen.getByText('180 mi to E')).toBeInTheDocument();
  });

  test('renders coolant bar with C and H labels', () => {
    render(
      <BottomInfoBar
        odometer={1964.5}
        gearSelector="D"
        rangeToEmpty={289}
        fuelLevel={65}
        speedUnit="km/h"
        coolantTemp={260}
      />
    );

    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    const coolantFill = screen.getByText('C').nextElementSibling?.firstElementChild as HTMLElement;
    expect(coolantFill).toHaveStyle({ width: '100%', background: '#ff3333' });
  });

  test('renders the selected gear and fuel level state', () => {
    const { container } = render(
      <BottomInfoBar
        odometer={1964.5}
        gearSelector="S"
        rangeToEmpty={289}
        fuelLevel={10}
        speedUnit="km/h"
        coolantTemp={190}
      />
    );

    for (const gear of ['P', 'R', 'N', 'D', 'S']) {
      expect(screen.getByText(gear)).toBeInTheDocument();
    }

    expect(screen.getByText('S')).toHaveStyle({
      color: '#ff8800',
      fontWeight: 900,
    });
    expect(screen.getByText('F')).toBeInTheDocument();
    const eElements = screen.getAllByText('E');
    expect(eElements.length).toBeGreaterThanOrEqual(1);
    
    // Find the fuel bar fill element: E -> bar container -> fill
    const eFuelGauge = eElements.find(el => el.nextElementSibling?.nextElementSibling?.textContent === 'F');
    const fuelBarFill = eFuelGauge?.nextElementSibling?.firstElementChild as HTMLElement;
    expect(fuelBarFill).toHaveStyle({
      width: '10%',
      background: '#ff3333',
    });
  });
});

describe('RPMArc', () => {
  test('renders tachometer ticks and labels', () => {
    const { container } = render(<RPMArc rpm={3500} maxRpm={8000} />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 300 300');
    expect(svg).toHaveAccessibleName('Tachometer 3500 RPM');
    // Scale labels 0–8 are rendered as SVG text
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  test('does not draw active arcs at zero RPM', () => {
    const { container } = render(<RPMArc rpm={0} maxRpm={8000} />);

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(1);
  });

  test('draws normal and redline arcs above redline', () => {
    const { container } = render(<RPMArc rpm={8000} maxRpm={8000} />);

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(3);
  });
});

describe('SpeedArc', () => {
  test('renders speed, unit, and scale for kilometers per hour', () => {
    const { container } = render(
      <SpeedArc speed={100} maxSpeed={160} unit="km/h" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 300 300');
    expect(screen.getAllByText('KM/H').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('100').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('160')).toBeInTheDocument();
  });

  test('renders speed, unit, and scale for miles per hour', () => {
    render(<SpeedArc speed={62} maxSpeed={100} unit="mph" />);

    expect(screen.getAllByText('MPH').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('62')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('does not draw the active wedge at zero speed', () => {
    const { container } = render(
      <SpeedArc speed={0} maxSpeed={160} unit="km/h" />
    );

    const paths = container.querySelectorAll('path');
    expect(paths).toHaveLength(1);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CoolantBar', () => {
  test('renders cold, normal, and hot markers', () => {
    render(<CoolantBar value={195} min={100} max={260} />);

    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  test('fills from minimum to maximum temperature', () => {
    const { rerender } = render(
      <CoolantBar value={100} min={100} max={260} />
    );

    // Navigate from C to the fill div
    const getFill = () => screen.getByText('C').nextElementSibling?.firstElementChild as HTMLElement;

    expect(getFill()).toHaveStyle({ width: '0%', background: '#2288dd' });

    rerender(<CoolantBar value={260} min={100} max={260} />);

    expect(getFill()).toHaveStyle({ width: '100%', background: '#ff3333' });
  });
});
