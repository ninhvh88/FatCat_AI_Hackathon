import {
  RadialBarChart as RechartsRadialBarChart,
  RadialBar as RechartsRadialBar,
  PolarAngleAxis as RechartsPolarAngleAxis,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer as RechartsResponsiveContainer,
  Legend as RechartsLegend,
  ComposedChart as RechartsComposedChart,
  Area as RechartsArea,
  Cell as RechartsCell,
} from 'recharts';

// Re-export all recharts components
export const RadialBarChart = RechartsRadialBarChart;
export const RadialBar = RechartsRadialBar;
export const PolarAngleAxis = RechartsPolarAngleAxis;
export const BarChart = RechartsBarChart;
export const Bar = RechartsBar;
export const LineChart = RechartsLineChart;
export const Line = RechartsLine;
export const XAxis = RechartsXAxis;
export const YAxis = RechartsYAxis;
export const CartesianGrid = RechartsCartesianGrid;
export const Tooltip = RechartsTooltip;
export const ResponsiveContainer = RechartsResponsiveContainer;
export const Legend = RechartsLegend;
export const ComposedChart = RechartsComposedChart;
export const Area = RechartsArea;
export const Cell = RechartsCell;

// Simple progress view component
export function ProgressView({ value, max = 100, color = '#3b82f6' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}
