import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import { Users, DollarSign, Clock, Repeat } from 'lucide-react';

const COLORS = ['#1d4ed8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const MetricCard = ({ title, value, icon, bgColor }) => (
  <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
    <div className="flex items-center gap-8 mb-3">
      <div className={`p-1 ${bgColor} rounded-xl`}>{icon}</div>
      <p className="text-small font-small text-gray-600">{title}</p>
    </div>
    <p className="text-center text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

function TwoCol({ children }) {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{children}</div>;
}

function BarBox({ title, children, action }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action || null}
      </div>
      {children}
    </div>
  );
}

function WrappedXAxisTickCluster({ x, y, payload }) {
  const raw = String(payload?.value || '');
  const words = raw.split(/\s+/);
  const MAX_LINES = 4;
  const PER_LINE = 10;
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= PER_LINE) current = candidate; else { if (current) lines.push(current); current = w; }
    if (lines.length === MAX_LINES) break;
  }
  if (current && lines.length < MAX_LINES) lines.push(current.length > PER_LINE ? `${current.slice(0, Math.max(PER_LINE - 1, 1))}…` : current);
  const displayLines = lines.length ? lines : [''];
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="#374151" fontSize={12}>
        {displayLines.map((line, index) => (
          <tspan key={index} x="0" dy={index === 0 ? 16 : 14}>{line}</tspan>
        ))}
        <title>{raw}</title>
      </text>
    </g>
  );
}

function WrappedYAxisTickCluster({ x, y, payload }) {
  const raw = String(payload?.value || '');
  const cleaned = raw.replace(/Wilayah\s+Persekutuan/gi, '').trim().replace(/\s{2,}/g, ' ');
  const words = cleaned.split(/\s+/);
  const MAX_LINES = 2;
  const PER_LINE = 15;
  const lines = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length <= PER_LINE) current = candidate; else { if (current) lines.push(current); current = w; }
    if (lines.length === MAX_LINES) break;
  }
  if (current && lines.length < MAX_LINES) lines.push(current.length > PER_LINE ? `${current.slice(0, Math.max(PER_LINE - 1, 1))}…` : current);
  const displayLines = lines.length ? lines : [''];
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" fill="#374151" fontSize={12}>
        {displayLines.map((line, index) => (
          <tspan key={index} x="0" dy={index === 0 ? 4 : 14}>{line}</tspan>
        ))}
        <title>{cleaned}</title>
      </text>
    </g>
  );
}

function SimpleBarChart({
  data,
  valueKey = 'count',
  orientation = 'vertical',
  height = 360,
  xTickFontSize = 12,
  tickRenderer = null,
  bottomMargin = 5,
  leftShift = 0,
  yTickWidth = 140,
  barCategoryGap = '12%',
  barGap = 2,
  xNumberTickFormatter = (v) => Math.round(Number(v || 0)).toLocaleString(),
  showLabels = false,
  labelFontSize = 12,
  labelFormatter = null,
  xAxisLabel,
  yAxisLabel,
}) {
  const isHorizontal = orientation === 'horizontal';
  const computedHeight = height;
  const formatLabelValue = (v) => (labelFormatter ? labelFormatter(v) : Math.round(Number(v || 0)).toLocaleString());
  const renderBarLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (isHorizontal) {
      const textX = x + (width || 0) + 4;
      const textY = y + (height || 0) / 2;
      return (<text x={textX} y={textY} textAnchor="start" fontSize={labelFontSize} fill="#374151">{formatLabelValue(value)}</text>);
    }
    const textX = x + (width || 0) / 2;
    const textY = y - 6;
    return (<text x={textX} y={textY} textAnchor="middle" fontSize={labelFontSize} fill="#374151">{formatLabelValue(value)}</text>);
  };

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        data={data}
        layout={isHorizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 10, right: 20 + Math.abs(leftShift), bottom: bottomMargin, left: 10 - leftShift }}
        barCategoryGap={barCategoryGap}
        barGap={barGap}
      >
        <CartesianGrid strokeDasharray="3 3" />
        {isHorizontal ? (
          <>
            <XAxis
              type="number"
              allowDecimals={false}
              tickFormatter={xNumberTickFormatter}
              tick={{ fontSize: xTickFontSize }}
              label={{ value: 'Number of Customers', position: 'insideBottom', offset: 0, dy: 5 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              interval={0}
              tick={<WrappedYAxisTickCluster fontSize={xTickFontSize} />}
              label={{ value: 'State', angle: -90, position: 'insideStart', offset: 0, dx: -40 }}
              width={yTickWidth}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="name"
              interval={0}
              tickMargin={8}
              tick={tickRenderer || { fontSize: xTickFontSize }}
              label={{ value: xAxisLabel || 'Cities', position: 'insideBottom', offset: -30, dy: 5 }}
            />
            <YAxis
              tick={{ fontSize: xTickFontSize }}
              label={{ value: yAxisLabel || 'Number of Customers', angle: -90, position: 'insideStart', offset: 0, dx: -5 }}
            />
          </>
        )}
        <Tooltip formatter={(value) => [`${value}`, 'Customers']} labelFormatter={(label) => `City: ${label}`} />
        <Bar dataKey={valueKey} fill="#3b82f6">
          {showLabels && (<LabelList position={isHorizontal ? 'right' : 'top'} content={renderBarLabel} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ClusterDetailView({ seg }) {
  if (!seg) return null;

  const [stateSort, setStateSort] = useState('desc');
  const [citySort, setCitySort] = useState('desc');

  const baseStates = useMemo(() => (seg.states || []).map(s => ({
    name: s.name,
    value: (s.revenue ?? s.count ?? 0),
    count: s.count ?? 0,
    revenue: s.revenue ?? 0,
  })), [seg]);

  const topStates = useMemo(() => {
    const data = [...baseStates];
    data.sort((a, b) => (stateSort === 'desc' ? b.value - a.value : a.value - b.value));
    return data.slice(0, 15);
  }, [baseStates, stateSort]);

  const baseCities = useMemo(() => (seg.cities || []).map(c => ({ name: c.name, value: (c.count ?? 0) })), [seg]);

  const topCities = useMemo(() => {
    const data = [...baseCities];
    data.sort((a, b) => (citySort === 'desc' ? b.value - a.value : a.value - b.value));
    return data.slice(0, 20);
  }, [baseCities, citySort]);

  const topProducts = useMemo(() => (seg.items || [])
    .map(i => ({ name: i.name, count: i.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5), [seg]);

  const purchaseHourData = useMemo(() => {
    if (Array.isArray(seg.purchaseHours) && seg.purchaseHours.length) {
      return seg.purchaseHours.map(h => ({ hour: h.hour, count: h.count ?? h.value ?? 0 }));
    }
    return [{ hour: seg.topPurchaseHour, pct: seg.purchaseHourPct }];
  }, [seg]);

  const dayPartData = useMemo(() => {
    if (Array.isArray(seg.dayParts) && seg.dayParts.length) {
      return seg.dayParts.map(d => ({ name: d.name ?? d.part, value: d.count ?? d.value ?? d.pct ?? 0 }));
    }
    return [{ name: seg.topDayPart, value: 100 }];
  }, [seg]);

  const genderInfo = useMemo(() => {
    const list = Array.isArray(seg.genders) ? seg.genders : [];
    const norm = (x) => String(x || '').trim().toLowerCase();
    const male = list.find(g => norm(g.name) === 'male') || { count: 0, pct: 0 };
    const female = list.find(g => norm(g.name) === 'female') || { count: 0, pct: 0 };
    return {
      male: male.count,
      female: female.count,
      total: male.count + female.count,
      malePct: male.pct,
      femalePct: female.pct,
    };
  }, [seg]);

  const ageChartData = useMemo(() => (Array.isArray(seg.ageGroups) ? seg.ageGroups : []), [seg]);

  return (
    <div className="w-full max-w-[1800px] mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <MetricCard icon={<Users className="text-blue-600" />} title="Total Customers" value={`${seg.size} customers`} bgColor="bg-blue-100" />
        <MetricCard icon={<Clock className="text-purple-600" />} title="Average Days Since Last Purchase" value={`${seg.avgRecencyDays} days`} bgColor="bg-purple-100" />
        <MetricCard icon={<Repeat className="text-green-600" />} title="Average Purchases Per Month" value={seg.avgFrequencyPerMonth} bgColor="bg-green-100" />
        <MetricCard icon={<DollarSign className="text-emerald-600" />} title="Average Spend" value={`RM ${Number(seg.avgSpend || 0).toFixed(2)}`} bgColor="bg-emerald-100" />
      </div>

      {/* State & Product */}
      <TwoCol>
        <BarBox
          title="Customers by State"
          action={(
            <button onClick={() => setStateSort(prev => (prev === 'desc' ? 'asc' : 'desc'))} className="text-sm text-indigo-600 hover:underline">
              Sort {stateSort === 'desc' ? '↓' : '↑'}
            </button>
          )}
        >
          <SimpleBarChart
            data={topStates}
            valueKey="value"
            orientation="horizontal"
            xTickFontSize={12}
            height={360}
            leftShift={10}
            tickRenderer={<WrappedYAxisTickCluster />}
            yTickWidth={100}
            barCategoryGap="10%"
            barGap={5}
            xNumberTickFormatter={(v) => Math.round(Number(v || 0)).toLocaleString()}
            tooltipFormatter={(props) => [String(props?.payload?.count ?? 0), 'Customers']}
          />
        </BarBox>
        <BarBox title="Top 5 Best Selling Products">
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Pie data={topProducts} dataKey="count" nameKey="name" outerRadius={90} label={({ value, percent }) => `${value} (${(percent * 100).toFixed(1)}%)`}>
                {topProducts.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
              <Tooltip />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 12, fontWeight: 400 }} />
            </PieChart>
          </ResponsiveContainer>
        </BarBox>
      </TwoCol>

      {/* Gender & Age */}
      <div className="mt-6 mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <BarBox title="Gender">
            {genderInfo.total > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                <MetricCard icon={<Users className="text-blue-600" />} title="Male" value={`${genderInfo.male.toLocaleString()} (${genderInfo.malePct}%)`} bgColor="bg-blue-100" />
                <MetricCard icon={<Users className="text-pink-600" />} title="Female" value={`${genderInfo.female.toLocaleString()} (${genderInfo.femalePct}%)`} bgColor="bg-pink-100" />
              </div>
            ) : (
              <p className="text-sm text-gray-500">No gender data available.</p>
            )}
          </BarBox>
        </div>
        <div className="lg:col-span-2">
          <BarBox title="Age Group Distribution">
            {Array.isArray(seg.ageGroups) && seg.ageGroups.length > 0 ? (
              <SimpleBarChart
                data={ageChartData}
                valueKey="count"
                xTickFontSize={12}
                tickRenderer={<WrappedXAxisTickCluster />}
                xAxisLabel="Age Group"
                yAxisLabel="Number of Customers"
                height={240}
                bottomMargin={60}
              />
            ) : (
              <p className="text-sm text-gray-500">No age group data available.</p>
            )}
          </BarBox>
        </div>
      </div>

      {/* Cities */}
      <div className="mt-8">
        <BarBox
          title="Customers by City"
          action={(
            <button onClick={() => setCitySort(prev => (prev === 'desc' ? 'asc' : 'desc'))} className="text-sm text-indigo-600 hover:underline">
              Sort {citySort === 'desc' ? '↓' : '↑'}
            </button>
          )}
        >
          <SimpleBarChart data={topCities} valueKey="value" xTickFontSize={12} tickRenderer={<WrappedXAxisTickCluster />} bottomMargin={60} />
        </BarBox>
      </div>

      {/* Purchase Timing */}
      <TwoCol>
        <BarBox title="Customer Preferred Purchase Hour">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={purchaseHourData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <XAxis dataKey="hour" interval={0} tickMargin={8} tick={{ fontSize: 12 }} label={{ value: 'Purchase Hour', position: 'insideBottom', offset: -10, dy: 5 }} />
              <YAxis tick={{ fontSize: 12 }} label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', dy: 60, dx: 15 }} />
              <Tooltip formatter={(value) => [`${value} customers`]} labelFormatter={(label) => `Hour: ${label}`} />
              <Bar dataKey={Array.isArray(seg.purchaseHours) && seg.purchaseHours.length ? 'count' : 'pct'} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </BarBox>
        <BarBox title="Customer Preferred Day Part">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dayPartData} dataKey="value" outerRadius={100} label={({ value, percent }) => `${value} (${(percent * 100).toFixed(1)}%)`}>
                <Tooltip formatter={(name, value) => [`${value}: ${name} customers`]} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: 14, fontWeight: 400 }} />
                {dayPartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </BarBox>
      </TwoCol>
    </div>
  );
}
