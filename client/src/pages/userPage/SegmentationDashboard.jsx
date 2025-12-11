// SegmentationDashboard.jsx
import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
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

const COLORS = ['#1d4ed8', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function SegmentationDashboard() {
  const location = useLocation();
  const { segmentationId, selectedFeatures } = location.state || {};
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('overview'); // 'overview' or cluster index
  const stateChartWrapperRef = useRef(null);
  const [stateChartWidth, setStateChartWidth] = useState(0);
  const [selectedStateFilter, setSelectedStateFilter] = useState(null);
  const [stateSortOrder, setStateSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Compute Top States by Revenue across clusters (always call hooks at top level)
  const stateStackData = useMemo(() => {
    const summariesLocal = data?.summaries || [];
    if (!summariesLocal.length) return [];

    // 1. Collect all unique states
    const allStatesSet = new Set();
    summariesLocal.forEach(s => {
      (s.states || []).forEach(st => allStatesSet.add(st.name));
    });
    const allStates = Array.from(allStatesSet);

    // 2. Build chart data
    const chartData = allStates.map(stateName => {
      const row = { state: stateName };
      summariesLocal.forEach(s => {
        const st = (s.states || []).find(x => x.name === stateName);
        row[`cluster_${s.cluster}`] = st ? st.revenue : 0;
      });
      return row;
    });

    // 3. Sort by total revenue descending
    chartData.sort((a, b) => {
      const sumA = Object.keys(a).filter(k => k.startsWith('cluster_')).reduce((acc, key) => acc + a[key], 0);
      const sumB = Object.keys(b).filter(k => k.startsWith('cluster_')).reduce((acc, key) => acc + b[key], 0);
      return sumB - sumA;
    });

    // 4. Take top 10 states
    return chartData.slice(0, 10);
  }, [data?.summaries]);

  // Observe chart container width for dynamic tick sizing
  useEffect(() => {
    const el = stateChartWrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect?.width || el.clientWidth || 0;
        setStateChartWidth(w);
      }
    });
    ro.observe(el);
    // set initial width
    setStateChartWidth(el.clientWidth || 0);
    return () => ro.disconnect();
  }, []);

  const stateCount = stateStackData.length;
  const xTickAngle = useMemo(() => {
    if (!stateCount || !stateChartWidth) return 0;
    const pxPerLabel = stateChartWidth / Math.max(1, stateCount);
    return pxPerLabel < 90 ? -30 : 0;
  }, [stateCount, stateChartWidth]);

  const stateChartMargin = useMemo(
    () => ({ top: 20, right: 30, left: 20, bottom: xTickAngle ? 90 : 5 }),
    [xTickAngle]
  );

  // Filter state data when a bar is clicked
  const stateSortedData = useMemo(() => {
    const arr = [...stateStackData];
    const sum = (row) => Object.keys(row)
      .filter(k => k.startsWith('cluster_'))
      .reduce((acc, k) => acc + (row[k] || 0), 0);
    arr.sort((a, b) => {
      const sa = sum(a);
      const sb = sum(b);
      return stateSortOrder === 'asc' ? sa - sb : sb - sa;
    });
    return arr.slice(0, 10);
  }, [stateStackData, stateSortOrder]);

  const filteredStateStackData = useMemo(
    () => (selectedStateFilter ? stateSortedData.filter(d => d.state === selectedStateFilter) : stateSortedData),
    [stateSortedData, selectedStateFilter]
  );

  const handleStateBarClick = (entry) => {
    const stateName = entry?.payload?.state;
    if (!stateName) return;
    setSelectedStateFilter(prev => (prev === stateName ? null : stateName));
  };

  useEffect(() => {
    if (!segmentationId || !selectedFeatures) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const featuresKey = Array.isArray(selectedFeatures) ? selectedFeatures.join(',') : String(selectedFeatures);
        const cacheKey = `segmentationDashboard:${segmentationId}:${featuresKey}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Optional: simple TTL in ms (e.g., 5 minutes)
          const ttlMs = 5 * 60 * 1000;
          if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < ttlMs) {
            setData(parsed.payload);
            return; // use cache; skip network
          }
        }

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
          const payload = { ...res.data.data, summaries };
          setData(payload);
          // cache the result for faster subsequent loads
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), payload }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [segmentationId, selectedFeatures, backendUrl]);

  if (loading) 
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading segmentation insights...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
        </div>
      </div>);
  if (!data) return <div className="p-20 text-center text-red-600 text-xl">No segmentation data available</div>;

  const { totalCustomers, totalRevenue, averageSpendOverall, summaries } = data;

  // ==================================== OVERVIEW DASHBOARD ====================================
  if (selectedCluster === 'overview') {
    
    // Aggregate total counts across clusters
    const productCounts = {};
    summaries.forEach(s => {
      (s.items || []).forEach(it => {
        productCounts[it.name] = (productCounts[it.name] || 0) + it.count;
      });
    });

    // Convert to array and sort top 5
    const topProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

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
                  <p className="text-xl font-medium text-gray-600">Total Customers</p>
                </div>
                <p className="text-center text-2xl font-bold text-gray-900">{totalCustomers.toLocaleString()}</p>
              </div>

              {/* Total Revenue */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <DollarSign className="w-7 h-7 text-green-600" />
                  </div>
                  <p className="text-xl font-medium text-gray-600">Total Revenue</p>
                </div>
                <p className="text-center text-2xl font-bold text-gray-900">RM {totalRevenue.toFixed(2).toLocaleString()}</p>
              </div>

              {/* Average Spend */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <TrendingUp className="w-7 h-7 text-purple-600" />
                  </div>
                  <p className="text-xl font-medium text-gray-600">Average Spend</p>
                </div>
                <p className="text-center text-2xl font-bold text-gray-900">RM {averageSpendOverall.toFixed(2)}</p>
              </div>

              {/* Segments Found */}
              <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ShoppingBag className="w-7 h-7 text-orange-600" />
                  </div>
                  <p className="text-xl font-medium text-gray-600">Segments Found</p>
                </div>
                <p className="text-center text-2xl font-bold text-gray-900">{summaries.length}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
              <div className="bg-white p-8 rounded-3xl shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800">States by Revenue</h3>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600">Sort:</label>
                    <button
                      onClick={() => setStateSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
                      className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                      title="Toggle sort order"
                    >
                      {stateSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    </button>
                    {selectedStateFilter && (
                      <>
                        <span className="text-sm text-gray-600">Filtered: <strong>{selectedStateFilter}</strong></span>
                        <button
                          onClick={() => setSelectedStateFilter(null)}
                          className="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div ref={stateChartWrapperRef} className="w-full">
                  <ResponsiveContainer width="100%" height={500}>
                    <BarChart data={filteredStateStackData} margin={stateChartMargin}>
                    <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="state"
                        interval={0}
                        tick={{ angle: -35, textAnchor: 'end' }}
                        height={70}
                        tickMargin={10}
                        tickFormatter={(v) => (typeof v === 'string' && v.length > 12 ? v.slice(0, 11) + '…' : v)}
                    />
                    <YAxis />
                      <Tooltip
                        labelFormatter={(label) => label}
                        formatter={(value) => `RM ${value.toLocaleString()}`}
                      />
                    <Legend 
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                    />
                    {summaries.map((s, idx) => (
                      <Bar
                        key={s.cluster}
                        dataKey={`cluster_${s.cluster}`}
                        stackId="a"
                           fill={COLORS[idx % COLORS.length]}
                           stroke="#ffffff"
                           strokeWidth={1}
                        name={s.suggestedName || `Cluster ${s.cluster}`}
                          onClick={handleStateBarClick}
                          cursor="pointer"
                      />
                    ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Top 5 Best Selling Products</h3>
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie
                      data={topProducts}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={(entry) => `${entry.name} (${entry.count})`}
                    >
                      {topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} orders`} />
                    <Legend />
                  </PieChart>
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

  // ==================================== CLUSTER DETAIL DASHBOARD ====================================
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
            <ArrowLeft size={22} /> Back to Overview Dashboard
          </button>

          {/* Title and Select Cluster Options */}
          <div className="relative mb-8">
            {/* Centered Title */}
            <h1 className="text-3xl font-bold text-center text-indigo-900 mb-4">
              {seg.suggestedName}
            </h1>

            {/* Top-right Select */}
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(Number(e.target.value))}
              className="px-6 py-2 text-sm rounded-xl border border-gray-300 bg-white shadow-md absolute right-0 top-0"
            >
              {summaries.map((s, i) => (
                <option key={i} value={i}>{s.suggestedName}</option>
              ))}
            </select>
          </div>

          {/* Metric Cards */}
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