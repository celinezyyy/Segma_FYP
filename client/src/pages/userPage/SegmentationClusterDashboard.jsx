import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import UserSidebar from '../../components/UserSidebar';
import Navbar from '../../components/Navbar';
import { ArrowLeft, Users, DollarSign, ShoppingBag, Clock } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#1d4ed8', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function SegmentationClusterDashboard() {
  const { segmentationId, clusterId: clusterIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Prefer params but allow state fallback if user navigated programmatically
  const clusterIndex = useMemo(() => {
    const fromState = location.state?.clusterIndex;
    const parsed = Number(clusterIdParam);
    return Number.isFinite(parsed) ? parsed : (Number.isFinite(fromState) ? fromState : 0);
  }, [clusterIdParam, location.state]);

  useEffect(() => {
    const fetchData = async () => {
      if (!segmentationId) return;
      setLoading(true);
      try {
        const selectedFeatures = location.state?.selectedFeatures;
        const featuresKey = Array.isArray(selectedFeatures)
          ? selectedFeatures.join(',')
          : (selectedFeatures != null ? String(selectedFeatures) : '');
        const cacheKey = featuresKey
          ? `segmentationDashboard:${segmentationId}:${featuresKey}`
          : '';

        if (cacheKey) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const ttlMs = 5 * 60 * 1000;
            if (parsed?.timestamp && Date.now() - parsed.timestamp < ttlMs) {
              setData(parsed.payload);
              setLoading(false);
              return;
            }
          }
        }

        if (selectedFeatures) {
          const res = await axios.post(
            `${backendUrl}/api/segmentation/${segmentationId}/dashboard`,
            { features: selectedFeatures },
            { withCredentials: true }
          );
          if (res.data?.success) {
            const summaries = res.data.data.summaries.map((s, i) => ({
              ...s,
              suggestedName: s.suggestedName || `Segment ${i + 1}`,
            }));
            const payload = { ...res.data.data, summaries };
            setData(payload);
            if (cacheKey) {
              localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), payload }));
            }
            setLoading(false);
            return;
          }
        }

        // Final fallback (when no selectedFeatures in state): attempt GET, may not work if backend requires features
        const res = await axios.get(`${backendUrl}/api/segmentation/${segmentationId}/dashboard`, { withCredentials: true });
        if (res.data?.success) {
          const summaries = res.data.data.summaries.map((s, i) => ({
            ...s,
            suggestedName: s.suggestedName || `Segment ${i + 1}`,
          }));
          const payload = { ...res.data.data, summaries };
          setData(payload);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [segmentationId, backendUrl, location.state]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading cluster insights...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-20 text-center text-red-600 text-xl">No data available</div>;
  }

  const seg = data.summaries?.[clusterIndex];
  if (!seg) {
    return <div className="p-20 text-center text-red-600 text-xl">Invalid cluster index</div>;
  }

  const genderData = seg.genders || null;
  const ageData = seg.ageGroups || null;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UserSidebar />
      <div className="flex-1 p-6 pt-24">
        <Navbar />
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/segmentation-dashboard', { state: { segmentationId, selectedFeatures: location.state?.selectedFeatures } })}
            className="mb-6 flex items-center gap-2 text-indigo-700 hover:text-indigo-900 font-semibold"
          >
            <ArrowLeft size={22} /> Back to Overview Dashboard
          </button>

          <div className="relative mb-8">
            <h1 className="text-3xl font-bold text-center text-indigo-900 mb-4">{seg.suggestedName}</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-10 h-10 text-blue-600" />
                <p className="text-xl font-medium text-gray-600">Customers ({seg.sizePct}%)</p>
              </div>
              <p className="text-center text-2xl font-bold text-gray-900">{seg.size.toLocaleString()} people</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="w-7 h-7 text-green-600" />
                </div>
                <p className="text-xl font-medium text-gray-600">Average Spend</p>
              </div>
              <p className="text-center text-2xl font-bold text-gray-900">RM {seg.avgSpend.toFixed(2)}</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Clock className="w-7 h-7 text-purple-600" />
                </div>
                <p className="text-xl font-medium text-gray-600">Average Recency</p>
              </div>
              <p className="text-center text-2xl font-bold text-gray-900">{Math.round(seg.avgRecencyDays)} days</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <ShoppingBag className="w-7 h-7 text-orange-600" />
                </div>
                <p className="text-xl font-medium text-gray-600">Top Product</p>
              </div>
              <p className="text-xl font-bold">{seg.topFavoriteItem}</p>
            </div>
          </div>

        
        </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* States by Revenue (match overview style) */}
            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">States by Revenue</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={(seg.states || []).slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    tick={{ angle: -35, textAnchor: 'end' }}
                    height={70}
                    tickMargin={10}
                    tickFormatter={(v) => (typeof v === 'string' && v.length > 12 ? v.slice(0, 11) + '…' : v)}
                  />
                  <YAxis tickFormatter={(v) => `RM${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `RM ${Number(v).toLocaleString()}`} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 Best Selling Products (by count, match overview style) */}
            <div className="bg-white p-8 rounded-3xl shadow-xl">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Top 5 Best Selling Products</h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={(seg.items || [])
                      .map(it => ({ name: it.name, count: it.count }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry) => `${entry.name} (${entry.count})`}
                  >
                    {(seg.items || [])
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                      .map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} orders`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div> 
      </div>
    </div>
  );
}
