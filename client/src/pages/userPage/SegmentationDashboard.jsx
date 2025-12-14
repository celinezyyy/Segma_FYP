// SegmentationDashboard.jsx
import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { Users, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';

const COLORS = ['#1d4ed8', '#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function SegmentationDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { segmentationId, selectedFeatures } = location.state || {};
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('overview'); // 'overview' or cluster index
  const [selectedStateFilter, setSelectedStateFilter] = useState(null);
  const [stateSortOrder, setStateSortOrder] = useState('desc'); // 'asc' | 'desc'
  const stateChartWrapperRef = useRef(null);
  const [stateChartWidth, setStateChartWidth] = useState(0);

  // ---------------- Components ----------------
  const MetricCard = ({ title, value, icon, bgColor }) => (
    <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-3 ${bgColor} rounded-xl`}>{icon}</div>
        <p className="text-xl font-medium text-gray-600">{title}</p>
      </div>
      <p className="text-center text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );

  const SegmentCard = ({ seg, idx }) => {
    const { suggestedName, sizePct, revenuePct, avgSpend, topState, segmentType, keyInsight, recommendedAction } = seg;

    return (
      <div
        onClick={() => {
          navigate(`/segmentation/${segmentationId}/cluster/${idx}`, { state: { segmentationId, clusterIndex: idx, selectedFeatures } });
        }}
        className="bg-white rounded-3xl shadow-2xl overflow-hidden cursor-pointer transform hover:scale-105 transition duration-300 border border-gray-200"
      >
        <div className={`h-40 bg-gradient-to-br ${COLORS[idx % COLORS.length]} to-indigo-600 opacity-90 flex items-center justify-center`}>
          <h3 className="text-3xl font-bold text-white text-center px-6">{suggestedName}</h3>
        </div>
        <div className="p-8 space-y-4">
          <div className="flex justify-between"><span className="text-gray-600">Customers</span><span className="font-bold text-xl">{sizePct}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Revenue Share</span><span className="font-bold text-xl text-green-600">{revenuePct}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">Avg Spend</span><span className="font-bold">RM {avgSpend.toFixed(0)}</span></div>
          <div className="text-sm text-gray-600">Top Location: <strong>{topState || 'N/A'}</strong></div>

          {/* --- New section for differentiation --- */}
          {segmentType && <div className="text-sm text-purple-700 font-semibold">Type: {segmentType}</div>}
          {keyInsight && <div className="text-sm text-gray-700 italic">Insight: {keyInsight}</div>}
          {recommendedAction && <div className="text-sm text-green-700">Action: {recommendedAction}</div>}

          <button className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            View Detailed Profile →
          </button>
        </div>
      </div>
    );
  };
  
  // ---------------- Hooks / Data ----------------
  const activePair = useMemo(() => {
    const keys = Array.isArray(selectedFeatures) ? selectedFeatures.map(String) : [];
    const PAIRS = {
      rfm: ['recency', 'frequency', 'monetary'],
      spending: ['totalSpend', 'avgOrderValue', 'totalOrders'],
      lifetime: ['customerLifetimeMonths', 'purchaseFrequency', 'totalSpend'],
      timebased: ['recency', 'favoritePurchaseHour', 'purchaseFrequency'],
    };
    const keySet = new Set(keys);
    for (const [id, feats] of Object.entries(PAIRS)) if (feats.every(f => keySet.has(f))) return id;
    return null;
  }, [selectedFeatures]);

  const pairDescriptions = {
    rfm: { title: 'Classic RFM', summary: 'Ranks customers by recency, frequency and monetary value to find VIPs and churn risks.', kpis: ['Average Spend', 'Average Recency', 'Revenue Share'] },
    spending: { title: 'Spending Behavior', summary: 'Focuses on total spend, AOV and order count to spot high vs low spenders.', kpis: ['Average Spend', 'Order Count', 'Top Product'] },
    lifetime: { title: 'Customer Lifetime + Behavior', summary: 'Highlights loyal long-term customers and their spend/frequency patterns.', kpis: ['Average Spend', 'Purchase Frequency', 'Customer Lifetime'] },
    timebased: { title: 'Time-based Behavior', summary: 'Surfaces churn risks and preferred buying hours/days.', kpis: ['Average Recency', 'Favorite Purchase Hour', 'Purchase Frequency'] },
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
          if (parsed?.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            setData(parsed.payload);
            return;
          }
        }

        const res = await axios.post(`${backendUrl}/api/segmentation/${segmentationId}/dashboard`, { features: selectedFeatures }, { withCredentials: true });
        if (res.data.success) {
          const summaries = res.data.data.summaries.map((s, i) => ({ ...s, suggestedName: s.suggestedName || `Segment ${i + 1}` }));
          setData({ ...res.data.data, summaries });
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), payload: { ...res.data.data, summaries } }));
        }
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };

    fetchData();
  }, [segmentationId, selectedFeatures, backendUrl]);

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
    setStateChartWidth(el.clientWidth || 0);
    return () => ro.disconnect();
  }, []);

  // ---------------- Computed Data ----------------
  const { totalCustomers = 0, totalRevenue = 0, averageSpendOverall = 0, summaries = [] } = data || {};

  const productCounts = useMemo(() => {
    const counts = {};
    summaries.forEach(s => (s.items || []).forEach(it => counts[it.name] = (counts[it.name] || 0) + it.count));
    return counts;
  }, [summaries]);

  const topProducts = useMemo(() => Object.entries(productCounts).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0,5), [productCounts]);

  const stateChartData = useMemo(() => {
    const allStatesSet = new Set();
    summaries.forEach(s => (s.states || []).forEach(st => allStatesSet.add(st.name)));
    const allStates = Array.from(allStatesSet);
    const chartData = allStates.map(stateName => {
      const row = { state: stateName };
      summaries.forEach(s => { const st = (s.states || []).find(x => x.name === stateName); row[`cluster_${s.cluster}`] = st?.revenue || 0; });
      return row;
    });
    chartData.sort((a, b) => {
      const sum = r => Object.keys(r).filter(k => k.startsWith('cluster_')).reduce((acc, key) => acc + r[key], 0);
      return sum(b) - sum(a);
    });
    return chartData.slice(0, 10);
  }, [summaries]);

  const handleStateBarClick = entry => {
    const stateName = entry?.payload?.state;
    if (!stateName) return;
    setSelectedStateFilter(prev => (prev === stateName ? null : stateName));
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">Loading segmentation insights...</p>
        <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
      </div>
    </div>
  );
  if (!data) return <div className="p-20 text-center text-red-600 text-xl">No segmentation data available</div>;

  // ---------------- Render Overview ----------------
  if (selectedCluster === 'overview') {
    const pairKPIs = pairDescriptions[activePair]?.kpis || ['Average Spend', 'Average Recency', 'Revenue Share'];

    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserSidebar />
        <div className="flex-1 p-6 pt-24">
          <Navbar />
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-center text-indigo-900 mb-2">Customer Segmentation Dashboard Overview</h1>
            {activePair && <p className="text-center text-gray-700 mb-6">Pair selected: <strong>{pairDescriptions[activePair].title}</strong> — {pairDescriptions[activePair].summary}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
              <MetricCard title="Total Customers" value={totalCustomers.toLocaleString()} icon={<Users className="w-7 h-7 text-blue-600" />} bgColor="bg-blue-100" />
              <MetricCard title="Total Revenue" value={`RM ${totalRevenue.toFixed(2).toLocaleString()}`} icon={<DollarSign className="w-7 h-7 text-green-600" />} bgColor="bg-green-100" />
              <MetricCard title={pairKPIs[0]} value={pairKPIs[0]==='Average Spend' ? `RM ${averageSpendOverall.toFixed(2)}` : summaries.length} icon={<TrendingUp className="w-7 h-7 text-purple-600" />} bgColor="bg-purple-100" />
              <MetricCard title="Segments Found" value={summaries.length} icon={<ShoppingBag className="w-7 h-7 text-orange-600" />} bgColor="bg-orange-100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
              {/* States by Revenue */}
              <div className="bg-white p-8 rounded-3xl shadow-xl" ref={stateChartWrapperRef}>
                <h3 className="text-2xl font-bold mb-6 text-gray-800">States by Revenue</h3>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart data={stateChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="state" tick={{ angle: -35, textAnchor: 'end' }} height={70} />
                    <YAxis />
                    <Tooltip formatter={v => `RM ${v.toLocaleString()}`} />
                    <Legend />
                    {summaries.map((s, idx) => (
                      <Bar key={s.cluster} dataKey={`cluster_${s.cluster}`} stackId="a" fill={COLORS[idx % COLORS.length]} stroke="#fff" strokeWidth={1} name={s.suggestedName || `Cluster ${s.cluster}`} onClick={handleStateBarClick} cursor="pointer" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Products */}
              <div className="bg-white p-8 rounded-3xl shadow-xl">
                <h3 className="text-2xl font-bold mb-6 text-gray-800">Top 5 Best Selling Products</h3>
                <ResponsiveContainer width="100%" height={500}>
                  <PieChart>
                    <Pie data={topProducts} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={entry => `${entry.name} (${entry.count})`}>
                      {topProducts.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v => `${v} orders`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Segment Cards */}
            <h2 className="text-3xl font-bold text-center mt-16 mb-10 text-indigo-900">Explore Individual Segments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {summaries.map((seg, idx) => (
                <SegmentCard key={seg.cluster} seg={seg} idx={idx} pairDescription={pairDescriptions[activePair]} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
