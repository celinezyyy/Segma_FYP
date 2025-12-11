// SegmentationDashboard.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import UserSidebar from '../../components/UserSidebar';
import Navbar from '../../components/Navbar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ArrowLeft, Users, DollarSign, ShoppingBag, MapPin, Clock, TrendingUp } from 'lucide-react';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function SegmentationDashboard() {
  const location = useLocation();
  const { segmentationId, selectedFeatures } = location.state || {};
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('overview'); // 'overview' or cluster index

  useEffect(() => {
    if (!segmentationId || !selectedFeatures) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.post(
          `${backendUrl}/api/segmentation/${segmentationId}/dashboard`,
          { features: selectedFeatures },
          { withCredentials: true }
        );
        if (res.data.success) {
          const summaries = res.data.data.summaries.map((s, i) => ({
            ...s,
            suggestedName: s.suggestedName || `Segment ${i + 1}`
          }));
          setData({ ...res.data.data, summaries });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [segmentationId, selectedFeatures, backendUrl]);

  if (loading) return <div className="p-20 text-center text-2xl text-gray-600">Loading segmentation insights...</div>;
  if (!data) return <div className="p-20 text-center text-red-600 text-xl">No segmentation data available</div>;

  const { totalCustomers, totalRevenue, averageSpendOverall, summaries } = data;

  // === OVERVIEW DASHBOARD ===
  if (selectedCluster === 'overview') {
    // Aggregate top states across all clusters
    const stateAgg = {};
    summaries.forEach(s => {
      (s.states || []).forEach(st => {
        stateAgg[st.name] = (stateAgg[st.name] || 0) + st.revenue;
      });
    });
    const topStates = Object.entries(stateAgg)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Aggregate top items
    const itemAgg = {};
    summaries.forEach(s => {
      (s.items || []).forEach(it => {
        itemAgg[it.name] = (itemAgg[it.name] || 0) + it.revenue;
      });
    });
    const topProducts = Object.entries(itemAgg)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserSidebar />
        <div className="flex-1 p-6 pt-24">
          <Navbar />
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-center text-indigo-900 mb-4">Customer Segmentation Dashboard Overview</h1>

            {/* Metric Cards - Refined & Compact Version */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              {/* Total Customers */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="w-7 h-7 text-blue-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600">Total Customers</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers.toLocaleString()}</p>
              </div>

              {/* Total Revenue */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <DollarSign className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600">Total Revenue</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">RM {totalRevenue.toFixed(0).toLocaleString()}</p>
              </div>

              {/* Average Spend */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <TrendingUp className="w-7 h-7 text-purple-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600">Avg Spend</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">RM {averageSpendOverall.toFixed(0)}</p>
              </div>

              {/* Segments Found */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ShoppingBag className="w-7 h-7 text-orange-600" />
                  </div>
                  <p className="text-base font-medium text-gray-600">Segments Found</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{summaries.length}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              <div className="bg-white p-8 rounded-3xl shadow-xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Top States by Revenue</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topStates} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(v) => `RM ${v.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Most Popular Products (Revenue)</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topProducts} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(v) => `RM ${v.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Segment Cards */}
            <h2 className="text-3xl font-bold text-center mt-16 mb-10 text-indigo-900">Explore Individual Segments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {summaries.map((seg, idx) => (
                <div
                  key={seg.cluster}
                  onClick={() => setSelectedCluster(idx)}
                  className="bg-white rounded-3xl shadow-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition duration-300 border border-gray-200"
                >
                  <div className={`h-40 bg-gradient-to-br ${COLORS[idx % COLORS.length]} to-indigo-600 opacity-90 flex items-center justify-center`}>
                    <h3 className="text-3xl font-bold text-white text-center px-6">{seg.suggestedName}</h3>
                  </div>
                  <div className="p-8">
                    <div className="space-y-4">
                      <div className="flex justify-between"><span className="text-gray-600">Customers</span><span className="font-bold text-xl">{seg.sizePct}%</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Revenue Share</span><span className="font-bold text-xl text-green-600">{seg.revenuePct}%</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Avg Spend</span><span className="font-bold">RM {seg.avgSpend.toFixed(0)}</span></div>
                      <div className="pt-4 border-t text-sm text-gray-600">
                        Top Location: <strong>{seg.topState || 'N/A'}</strong>
                      </div>
                    </div>
                    <button className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
                      View Detailed Profile →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === CLUSTER DETAIL DASHBOARD ===
  const seg = summaries[selectedCluster];
  const genderData = seg.genders || null;
  const ageData = seg.ageGroups || null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UserSidebar />
      <div className="flex-1 p-6 pt-24">
        <Navbar />
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setSelectedCluster('overview')}
            className="mb-6 flex items-center gap-2 text-indigo-700 hover:text-indigo-900 font-semibold"
          >
            <ArrowLeft size={24} /> Back to Overview
          </button>

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold text-indigo-900">{seg.suggestedName}</h1>
              <p className="text-2xl text-gray-700 mt-2">
                {seg.size.toLocaleString()} customers ({seg.sizePct}%) • RM {seg.revenue.toLocaleString()} ({seg.revenuePct}% of revenue)
              </p>
            </div>
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(Number(e.target.value))}
              className="px-6 py-4 text-lg rounded-xl border border-gray-300 bg-white shadow-md"
            >
              {summaries.map((s, i) => (
                <option key={i} value={i}>{s.suggestedName}</option>
              ))}
            </select>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <Users className="w-10 h-10 text-blue-600" />
                <p className="text-gray-600">Customers</p>
              </div>
              <p className="text-4xl font-bold">{seg.sizePct}%</p>
              <p className="text-gray-500">{seg.size.toLocaleString()} people</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <DollarSign className="w-10 h-10 text-green-600" />
                <p className="text-gray-600">Avg Spend</p>
              </div>
              <p className="text-4xl font-bold">RM {seg.avgSpend.toFixed(0)}</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <Clock className="w-10 h-10 text-purple-600" />
                <p className="text-gray-600">Avg Recency</p>
              </div>
              <p className="text-4xl font-bold">{Math.round(seg.avgRecencyDays)} days</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <ShoppingBag className="w-10 h-10 text-orange-600" />
                <p className="text-gray-600">Top Product</p>
              </div>
              <p className="text-2xl font-bold">{seg.topFavoriteItem || 'N/A'}</p>
              <p className="text-gray-500">{seg.favoriteItemPct}% prefer</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Products by Revenue */}
            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Top Products by Revenue</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={(seg.items || []).slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(v) => `RM ${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Geographic Distribution */}
            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Top States by Revenue</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={(seg.states || []).slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(v) => `RM ${v.toLocaleString()}`} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Optional Demographics */}
            {genderData && (
              <div className="bg-white p-8 rounded-3xl shadow-xl lg:col-span-2">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Gender Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      dataKey="pct"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.name} ${entry.pct}%`}
                    >
                      {genderData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {ageData && (
              <div className="bg-white p-8 rounded-3xl shadow-xl lg:col-span-2">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Age Group Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="pct" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}