import React, { useEffect, useMemo } from 'react';
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

  const topStates = useMemo(
    () =>
      (seg.states || [])
        .map(s => ({ name: s.name, value: (s.revenue ?? s.count ?? 0) }))
        .slice(0, 10),
    [seg]
  );

  const topCities = useMemo(
    () =>
      (seg.cities || [])
        .map(c => ({ name: c.name, value: (c.count ?? c.revenue ?? 0) }))
        .slice(0, 10),
    [seg]
  );

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

          {/* ================= GEOGRAPHIC ================= */}
          <Section title="Geographic Distribution">
            <TwoCol>
              <BarBox title="Customers by State">
                <SimpleBarChart data={topStates} valueKey="value" />
              </BarBox>
              <BarBox title="Customers by City">
                <SimpleBarChart data={topCities} valueKey="value" />
              </BarBox>
            </TwoCol>
          </Section>

          {/* ================= PRODUCT ================= */}
          <Section title="Product Preference Analysis">
            <div className="bg-white p-6 rounded-2xl shadow">
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={topProducts}
                    dataKey="count"
                    nameKey="name"
                    outerRadius={120}
                    label
                  >
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* ================= PURCHASE TIMING ================= */}
          <Section title="Purchase Timing Behavior">
            <TwoCol>
              <BarBox title="Preferred Purchase Hour">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={purchaseHourData}>
                    <XAxis dataKey="hour" />
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
                      label
                    >
                      <Cell fill="#8b5cf6" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </BarBox>
            </TwoCol>
          </Section>

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

function BarBox({ title, children }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function SimpleBarChart({ data, valueKey = 'count' }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey={valueKey} fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
