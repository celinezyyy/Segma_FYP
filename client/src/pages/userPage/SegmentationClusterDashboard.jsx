import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import UserSidebar from '../../components/UserSidebar';
import Navbar from '../../components/Navbar';
import { ArrowLeft, Users, DollarSign, Clock, Repeat } from 'lucide-react';
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
} from 'recharts';

const COLORS = ['#1d4ed8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SegmentationClusterDashboard() {
  const { segmentationId, clusterId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const seg = location.state?.segment || null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    console.log('[Cluster Detail] State:', seg);
  }, []);

  if (!seg) {
    return (
      <div className="p-20 text-center text-red-600 text-xl">
        No cluster data found. Please return to overview.
      </div>
    );
  }

  /* -------------------- DATA PREP -------------------- */
  const [stateSort, setStateSort] = useState('desc');
  const [citySort, setCitySort] = useState('desc');

  const baseStates = useMemo(
    () => (seg.states || []).map(s => ({ name: s.name, value: (s.revenue ?? s.count ?? 0) })),
    [seg]
  );

  const topStates = useMemo(() => {
    const data = [...baseStates];
    data.sort((a, b) => (stateSort === 'desc' ? b.value - a.value : a.value - b.value));
    return data.slice(0, 10);
  }, [baseStates, stateSort]);

  const baseCities = useMemo(
    () => (seg.cities || []).map(c => ({ name: c.name, value: (c.count ?? c.revenue ?? 0) })),
    [seg]
  );

  const topCities = useMemo(() => {
    const data = [...baseCities];
    data.sort((a, b) => (citySort === 'desc' ? b.value - a.value : a.value - b.value));
    return data.slice(0, 10);
  }, [baseCities, citySort]);

  const topProducts = useMemo(
    () =>
      (seg.items || [])
        .map(i => ({ name: i.name, count: i.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [seg]
  );

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

  /* -------------------- UI -------------------- */

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UserSidebar />

      <div className="flex-1 p-6 pt-24">
        <Navbar />

        <div className="max-w-7xl mx-auto">

          {/* HEADER */}
          <div className="mb-8 grid grid-cols-3 items-center">
            <button
              onClick={() =>
                navigate('/segmentation-dashboard', {
                  state: {
                    segmentationId,
                    selectedFeatures: location.state?.selectedFeatures,
                  },
                })
              }
              className="flex items-center gap-2 text-indigo-700 font-semibold"
            >
              <ArrowLeft size={20} /> Back
            </button>

            <h1 className="text-3xl font-bold text-center text-indigo-900">
              {seg.suggestedName}
            </h1>
            <div />
          </div>

          {/* ================= SUMMARY CARDS ================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">

            <MetricCard
              icon={<Users className="text-blue-600" />}
              title="Total Customers"
              value={`${seg.size} customers`}
              bgColor="bg-blue-100"
            />

            <MetricCard
              icon={<Clock className="text-purple-600" />}
              title="Average Days Since Last Purchase"
              value={`${seg.avgRecencyDays} days`}
              bgColor="bg-purple-100"
            />

            <MetricCard
              icon={<Repeat className="text-green-600" />}
              title="Average Purchases Per Month"
              value={seg.avgFrequencyPerMonth}
              bgColor="bg-green-100"
            />

            <MetricCard
              icon={<DollarSign className="text-emerald-600" />}
              title="Average Spend"
              value={`RM ${seg.avgSpend.toFixed(2)}`}
              bgColor="bg-emerald-100"
            />
          </div>

          {/* ================= State & Product ================= */}
          <TwoCol>
              <BarBox
                title="Customers by State"
                action={
                  <button
                    onClick={() => setStateSort(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    Sort {stateSort === 'desc' ? '↓' : '↑'}
                  </button>
                }
              >
                <SimpleBarChart data={topStates} valueKey="value" />
              </BarBox>
              <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Top 5 Best Selling Products</h3>
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie
                  data={topProducts}
                  dataKey="count"
                  nameKey="name"
                  outerRadius={100}
                  // cx="50%"
                  label={({value, percent }) => `${value} (${(percent * 100).toFixed(1)}%)`}
                >
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="horizontal"      // horizontal legend
                  verticalAlign="bottom"   // place at bottom
                  align="center"           // center horizontally
                  wrapperStyle={{ fontSize: 14, fontWeight: 500 }} // adjust font
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
            </TwoCol>

          {/* ================= CITY ================= */}
          <BarBox
            title="Customers by City"
            action={
              <button
                onClick={() => setCitySort(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                className="text-sm text-indigo-600 hover:underline"
              >
                Sort {citySort === 'desc' ? '↓' : '↑'}
              </button>
            }
          >
            <SimpleBarChart data={topCities} valueKey="value" />
          </BarBox>

          {/* ================= PURCHASE TIMING ================= */}
            <TwoCol>
              <BarBox title="Preferred Purchase Hour">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={purchaseHourData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <XAxis dataKey="hour" interval={0} tickMargin={8} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey={Array.isArray(seg.purchaseHours) && seg.purchaseHours.length ? 'count' : 'pct'} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </BarBox>

              <BarBox title="Preferred Day Part">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dayPartData}
                      dataKey="value"
                      outerRadius={100}
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                    >
                      <Cell fill="#8b5cf6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </BarBox>
            </TwoCol>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENTS ================= */

const MetricCard = ({ title, value, icon, bgColor }) => (
  <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
    <div className="flex items-center gap-8 mb-3">
      <div className={`p-1 ${bgColor} rounded-xl`}>{icon}</div>
      <p className="text-small font-small text-gray-600">{title}</p>
    </div>
    <p className="text-center text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

function Section({ title, children }) {
  return (
    <div className="mb-12">
      <h2 className="text-2xl font-bold text-indigo-900 mb-5">{title}</h2>
      {children}
    </div>
  );
}

function TwoCol({ children }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {children}
    </div>
  );
}

function BarBox({ title, children, action }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action || null}
      </div>
      {children}
    </div>
  );
}

function SimpleBarChart({ data, valueKey = 'count' }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" interval={0} tickMargin={8} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={valueKey} fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
