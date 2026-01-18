// SegmentationDashboard.jsx
import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toPng } from 'html-to-image';
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
  // Removed Radar/Treemap as we switch to bar charts
} from 'recharts';
import { Users, DollarSign, ShoppingBag, TrendingUp, ArrowLeft, Save, FileText, HelpCircle } from 'lucide-react';
import ClusterDetailView from '../../components/ClusterDetailView';
import Swal from 'sweetalert2';
import { buildSegmentationKey, getCache, setCache, pruneExpired, pruneToCapacity } from '../../utils/localCache';

// Use valid 6-digit hex colors (avoid undefined entries and 8-digit hex)
const COLORS = ['#41D6F7', '#6366F1', '#F59E0B', '#10B981', '#EF4444', '#C1CF44'];

export default function SegmentationDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { segmentationId, selectedFeatures } = location.state || {};
  const { backendUrl } = useContext(AppContext);
  const stateChartWrapperRef = useRef(null);
  const kpiGridRef = useRef(null);
  const segmentsGridRef = useRef(null);
  const spendPanelRef = useRef(null);
  const distributionPanelRef = useRef(null);
  const productsPanelRef = useRef(null);
  const genderPanelRef = useRef(null);
  const agePanelRef = useRef(null);
  const overviewCaptureRef = useRef(null);
  const clusterSnapshotsContainerRef = useRef(null);
  const clusterSnapRefs = useRef([]);
  const [loading, setLoading] = useState(true);
  const [stateSortOrder, setStateSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [selectedStateFilter, setSelectedStateFilter] = useState(null);
  const [stateChartWidth, setStateChartWidth] = useState(0);
  const [data, setData] = useState(null);
  const [topProductsSortOrder, setTopProductsSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [spendSortOrder, setSpendSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [genderSortOrder, setGenderSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [ageSortOrder, setAgeSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [selectedGenderClusterIndex, setSelectedGenderClusterIndex] = useState(null);
  const [selectedAgeClusterIndex, setSelectedAgeClusterIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hoveredStateClusterKey, setHoveredStateClusterKey] = useState(null);
  const [hoveredGenderBar, setHoveredGenderBar] = useState(null);
  const [hoveredAgeBar, setHoveredAgeBar] = useState(null);

  // ---------------- Components ----------------
  const MetricCard = ({ title, value, icon, bgColor }) => (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="flex items-center gap-8 mb-3">
        <div className={`p-1 ${bgColor} rounded-xl`}>{icon}</div>
        <p className="text-small font-small text-gray-600">{title}</p>
      </div>
      <p className="text-center text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );

  const InfoTooltip = ({ text }) => {
    const iconRef = useRef(null);
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const show = () => {
      const r = iconRef.current?.getBoundingClientRect();
      if (r) {
        setPos({ top: r.bottom + 8, left: r.left + r.width / 2 });
      }
      setVisible(true);
    };
    const hide = () => setVisible(false);

    return (
      <>
        <span ref={iconRef} onMouseEnter={show} onMouseLeave={hide} className="inline-flex items-center ml-1 align-middle">
          <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-600" aria-label="Info" />
        </span>
        {visible && createPortal(
          <div className="fixed z-[999] pointer-events-none" style={{ top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}>
            <span className="bg-gray-900 text-white text-xs rounded-md px-2 py-1 whitespace-nowrap shadow-lg">
              {text}
            </span>
          </div>,
          document.body
        )}
      </>
    );
  };

  const SegmentCard = ({ seg, idx }) => {
    const {
      suggestedName,
      sizePct,
      revenuePct,
      avgSpend,
      topCity,
      topState,
      avgAOV,
      avgRecencyDays,  // Assume available in seg from summaries
      avgFrequencyPerMonth,  // Assume available
    } = seg;

    const desc = seg?.description || 'Classic RFM group based on recency, frequency, and monetary value to highlight VIPs and churn risks.';

    const currency = useMemo(() => new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 2 }), []);
    const percentFmt = v => `${(Number(v) || 0).toFixed(2)}%`;

    return (
      <div
        onClick={() => {
          navigate(`/segmentation/${segmentationId}/cluster/${idx}`, {
            state: { segmentationId, clusterIndex: idx, selectedFeatures, segment: seg },
          });
        }}
        className="bg-white rounded-3xl shadow-2xl overflow-visible cursor-pointer hover:shadow-indigo-200 transform hover:scale-105 transition duration-300 border border-gray-200"
        // className="bg-white rounded-3xl shadow-2xl overflow-visible cursor-pointer hover:shadow-indigo-200 transform hover:scale-105 transition duration-300 border border-gray-200"
      >
        {/* Header gradient uses Tailwind arbitrary color from hex */}
        <div className={`h-36 bg-gradient-to-br from-[${COLORS[idx % COLORS.length]}] to-indigo-600 flex items-center justify-between px-6`}>
          <h3 className="text-2xl md:text-xl font-bold text-black inline-flex items-center gap-2">{`${suggestedName} Group`} <InfoTooltip text={desc} /></h3>
          <span className="ml-3 inline-flex items-center px-2 py-1 rounded-md bg-black/10 text-black text-xs md:text-sm font-semibold">Group {idx + 1}</span>
        </div>

        <div className="p-6 md:p-8 space-y-5">
          {/* Key stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-600">Customers</div>
              <div className="text-xl font-bold text-gray-900">{percentFmt(sizePct)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Revenue Share</div>
              <div className="text-xl font-bold text-green-600">{percentFmt(revenuePct)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Average Spend</div>
              <div className="text-xl font-bold text-gray-900">{currency.format(avgSpend || 0)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 flex items-center justify-center">
                <span>Average Order Value</span>
                <InfoTooltip text="How much customers typically spend per order." />
              </div>
              <div className="text-xl font-bold text-gray-900">{avgAOV ? currency.format(avgAOV) : 'N/A'}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 flex items-center justify-center">
                <span>Average Recency</span>
                <InfoTooltip text="Average days since the last purchase (lower is more recent)." />
              </div>
              <div className="text-xl font-bold text-gray-900">{avgRecencyDays ? `${Math.round(avgRecencyDays)} days` : 'N/A'}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 flex items-center justify-center">
                <span>Average Purchase/Months</span>
                
              </div>
              <div className="text-xl font-bold text-gray-900">{avgFrequencyPerMonth ? Math.round(avgFrequencyPerMonth) : 'N/A'}</div>
            </div>
          </div>

          {/* Context bullets */}
          <ul className="space-y-2">
            <li className="text-sm text-gray-700">
              <span className="font-medium text-gray-600">Top Location:</span> <span className="font-semibold">{topState || 'N/A'}</span>
            </li>
            <li className="text-sm text-gray-700">
              <span className="font-medium text-gray-600">Top City:</span> <span className="font-semibold">{topCity || 'N/A'}</span>
            </li>
          </ul>

          <button className="w-full mt-2 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            View Detailed Profile →
          </button>
        </div>
      </div>
    );
  };

  
  // ---------------- Hooks / Data ----------------
  // RFM-only: simplify pair handling
  const activePair = 'rfm';
  const pairDescriptions = {
    rfm: { title: 'Classic RFM', summary: 'Ranks customers by recency, frequency and monetary value to find VIPs and churn risks.', kpis: ['Average Spend', 'Average Recency', 'Revenue Share'] },
  };

  useEffect(() => {
    if (!segmentationId || !selectedFeatures) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let customerDatasetId = null;
        let orderDatasetId = null;
        try {
          const raw = localStorage.getItem('segmentationCache');
          if (raw) {
            const cached = JSON.parse(raw);
            customerDatasetId = cached?.customerDatasetId || null;
            orderDatasetId = cached?.orderDatasetId || null;
          }
        } catch (_) {}

        const cacheKey = buildSegmentationKey(segmentationId, customerDatasetId, orderDatasetId);
        pruneExpired();
        const cachedPayload = getCache(cacheKey, 5 * 60 * 1000);
        if (cachedPayload) {
          setData(cachedPayload);
          setLoading(false);
          return;
        }

        const res = await axios.post(`${backendUrl}/api/segmentation/${segmentationId}/dashboard`, { features: selectedFeatures }, { withCredentials: true });
        if (res.data.success) {
          console.log('Segmentation dashboard data:', res.data.data.summaries);
          const summaries = res.data.data.summaries.map((s, i) => ({ ...s, suggestedName: s.suggestedNameAndDesc.name || `Segment ${i + 1}` }));
          const payload = { ...res.data.data, summaries };
          setData(payload);
          setCache(cacheKey, payload, 5 * 60 * 1000);
          pruneToCapacity(10);
        }
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };

    fetchData();
  }, [segmentationId, backendUrl]);
  
  // ---------------- Computed Data ----------------
  const { totalCustomers = 0, totalRevenue = 0, averageSpendOverall = 0, summaries = [] } = data || {};
  // --- Gender aggregation for overview (grouped bars per cluster) ---
  const hasGender = useMemo(() => summaries.some(s => Array.isArray(s.genders) && s.genders.length > 0), [summaries]);
  const genderChartData = useMemo(() => {
    const rows = (summaries || []).map((s, idx) => {
      const norm = (x) => String(x || '').trim().toLowerCase();
      const male = (s.genders || []).find(g => norm(g.name) === 'male')?.count ?? 0;
      const female = (s.genders || []).find(g => norm(g.name) === 'female')?.count ?? 0;

      return {
        clusterIndex: idx,
        cluster: `${s.suggestedName || `Cluster ${s.cluster}`} Group`,
        male,
        female,
        total: male + female
      };
    });
    rows.sort((a, b) => (genderSortOrder === 'asc' ? a.total - b.total : b.total - a.total));
    return selectedGenderClusterIndex == null ? rows : rows.filter(r => r.clusterIndex === selectedGenderClusterIndex);
  }, [summaries, genderSortOrder, selectedGenderClusterIndex]);

  // --- Age group aggregation for overview (stacked bars per cluster) ---
  const hasAgeGroup = useMemo(() => summaries.some(s => Array.isArray(s.ageGroups) && s.ageGroups.length > 0), [summaries]);
  // Use a fixed, natural age bucket order; include common variants
  const AGE_ORDER = ['Below 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'Above 65'];
  const ageGroupKeys = useMemo(() => {
    const present = new Set();
    summaries.forEach(s => (s.ageGroups || []).forEach(a => present.add(String(a.name))));
    return AGE_ORDER.filter(k => present.has(k));
  }, [summaries]);
  
  const ageStackData = useMemo(() => {
    const rows = (summaries || []).map((s, idx) => {
      const row = {
        clusterIndex: idx,
        cluster: `${s.suggestedName || `Cluster ${s.cluster}`} Group`,
        total: 0,
      };
      ageGroupKeys.forEach(k => {
        const found = (s.ageGroups || []).find(a => String(a.name) === k);
        const val = Number(found?.count || 0);
        row[k] = val;
        row.total += val;
      });
      return row;
    });
    rows.sort((a, b) => (ageSortOrder === 'asc' ? a.total - b.total : b.total - a.total));
    return selectedAgeClusterIndex == null ? rows : rows.filter(r => r.clusterIndex === selectedAgeClusterIndex);
  }, [summaries, ageGroupKeys, ageSortOrder, selectedAgeClusterIndex]);

  const handleGenderBarClick = (entry) => {
    const idx = entry?.payload?.clusterIndex;
    if (idx == null) return;
    setSelectedGenderClusterIndex(prev => (prev === idx ? null : idx));
  };

  const handleAgeBarClick = (entry) => {
    const idx = entry?.payload?.clusterIndex;
    if (idx == null) return;
    setSelectedAgeClusterIndex(prev => (prev === idx ? null : idx));
  };

  const overallAvgRecency = useMemo(() => {
    if (!summaries.length) return 0;

    const totalRecencyDay = summaries.reduce((acc, s) => {
      return acc + (s.avgRecencyDays * s.size);
    }, 0);

    const totalCustomers = summaries.reduce((acc, s) => acc + s.size, 0);

    return totalCustomers ? Number((totalRecencyDay / totalCustomers).toFixed(0)) : 0;
  }, [summaries]);

  const overallAvgFrequency = Number(
    (summaries.reduce((acc, s) => acc + (s.avgFrequencyPerMonth * s.size), 0) /
    summaries.reduce((acc, s) => acc + s.size, 0)
    ).toFixed(0) // no decimals
  );

  // Product counts for Top Products chart
  const productCounts = useMemo(() => {
    const counts = {};
    summaries.forEach(s => (s.items || []).forEach(it => {
      counts[it.name] = (counts[it.name] || 0) + (it.count || 0);
    }));
    return counts;
  }, [summaries]);

  const topProducts = useMemo(() => (
    Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
  ), [productCounts]);

  // Cluster comparison datasets
  const clusterSpendData = useMemo(() => {
    const rows = (summaries || []).map(s => ({
      cluster: `${s.suggestedName || `Cluster ${s.cluster}`} Group`,
      avgSpend: Number(s.avgSpend || 0),
    }));
    rows.sort((a, b) => (spendSortOrder === 'asc' ? a.avgSpend - b.avgSpend : b.avgSpend - a.avgSpend));
    return rows;
  }, [summaries, spendSortOrder]);

  const clusterDistribution = useMemo(() => (
    (summaries || []).map(s => ({
      name: `${s.suggestedName || `Cluster ${s.cluster}`} Group`,
      value: Number(s.size || 0),
      pct: Number((s.sizePct ?? 0).toFixed?.(2) || s.sizePct || 0),
    }))
  ), [summaries]);

  // Use a deterministic order for clusters (largest overall revenue share first)
  const orderedSummaries = useMemo(() => {
    return (summaries || []).slice().sort((a, b) => (Number(b.revenuePct || 0) - Number(a.revenuePct || 0)) || (a.cluster - b.cluster));
  }, [summaries]);
  
  // State chart data for States vs Revenue
  const stateChartData = useMemo(() => {
    const allStatesSet = new Set();
    summaries.forEach(s => (s.states || []).forEach(st => allStatesSet.add(st.name)));
    let allStates = Array.from(allStatesSet);

    // Apply filter if a state is selected
    if (selectedStateFilter) {
      allStates = allStates.filter(name => name === selectedStateFilter);
    }

    const chartData = allStates.map(stateName => {
      const row = { state: stateName };
      summaries.forEach(s => {
        const st = (s.states || []).find(x => x.name === stateName);
        row[`cluster_${s.cluster}`] = st?.revenue || 0;
      });
      // Precompute total for sorting
      row.__total = Object.keys(row)
        .filter(k => k.startsWith('cluster_'))
        .reduce((acc, key) => acc + (row[key] || 0), 0);
      return row;
    });

    chartData.sort((a, b) => (stateSortOrder === 'asc' ? a.__total - b.__total : b.__total - a.__total));

    const sliced = chartData.slice(0, 10).map(({ __total, ...rest }) => rest);
    return sliced;
  }, [summaries, selectedStateFilter, stateSortOrder]);

  // Compute max wrapped lines needed for X-axis labels based on chart width and number of ticks
  const maxLinesStates = useMemo(() => {
    const approxCharW = 10; // px per character at ~12px font
    const tickCount = Math.max(stateChartData.length, 1);
    const tickAvailWidth = Math.max(60, (stateChartWidth - 120) / tickCount);
    const perLine = Math.max(8, Math.floor(tickAvailWidth / approxCharW));
    const MAX_LINES = 3;

    const linesNeeded = (label) => {
      const words = String(label || '').split(/\s+/);
      const lines = [];
      let current = '';
      for (const w of words) {
        const candidate = current ? `${current} ${w}` : w;
        if (candidate.length <= perLine) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = w;
        }
        if (lines.length === MAX_LINES) break;
      }
      if (current && lines.length < MAX_LINES) {
        lines.push(current.length > perLine ? `${current.slice(0, Math.max(perLine - 1, 1))}…` : current);
      }
      return Math.max(lines.length, 1);
    };

    let max = 1;
    for (const d of stateChartData) {
      max = Math.max(max, linesNeeded(d.state));
    }
    return max;
  }, [stateChartData, stateChartWidth]);

  const WrappedXAxisTick = ({ x, y, payload }) => {
      const raw = String(payload?.value || '');
      // Clean 'Wilayah Persekutuan' and common prefixes
      let cleaned = raw.replace(/\(?\s*Wilayah\s+Persekutuan\s*\)?/gi, '');
      cleaned = cleaned.replace(/^\s*(W\.?P\.?|WP)\s+/gi, '');
      cleaned = cleaned.replace(/\s{2,}/g, ' ').replace(/^[\s,()\-\.]+|[\s,()\-\.]+$/g, '').trim();
      const approxCharW = 7; // px per character at ~12px font
      const tickCount = Math.max(stateChartData.length, 1);
      const tickAvailWidth = Math.max(60, (stateChartWidth - 120) / tickCount);
      const perLine = Math.max(12, Math.floor(tickAvailWidth / approxCharW));
      const MAX_LINES = 3;

      const words = cleaned.split(/\s+/);
      const lines = [];
      let current = '';
      for (const w of words) {
        const candidate = current ? `${current} ${w}` : w;
        if (candidate.length <= perLine) {
          current = candidate;
        } else {
          if (current) lines.push(current);
          current = w;
        }
        if (lines.length === MAX_LINES) break;
      }
      if (current && lines.length < MAX_LINES) {
        lines.push(current.length > perLine ? `${current.slice(0, Math.max(perLine - 1, 1))}…` : current);
      }
      const displayLines = lines.length ? lines : [''];

      return (
        <g transform={`translate(${x},${y})`}>
          <text textAnchor="middle" fill="#374151" fontSize={12}>
            {displayLines.map((line, index) => (
              <tspan key={index} x="0" dy={index === 0 ? 16 : 14}>{line}</tspan>
            ))}
            <title>{cleaned}</title>
          </text>
        </g>
      );
  };

  // Optional: keep width tracking for future responsive tweaks
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

  const handleStateBarClick = entry => {
    const stateName = entry?.payload?.state;
    if (!stateName) return;
    setSelectedStateFilter(prev => (prev === stateName ? null : stateName));
  };

  const FilteredTooltip = ({ active, payload, label, hoveredKey }) => {
    if (!active || !payload || !payload.length) return null;
    const items = hoveredKey ? payload.filter(p => p.dataKey === hoveredKey) : payload;
    if (!items.length) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md shadow-md p-3 text-sm">
        <div className="font-semibold text-gray-800 mb-1">{label}</div>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: it.color }} />
            <span className="text-gray-700">{it.name}:</span>
            <span className="font-medium text-gray-900">RM {Number(it.value || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  const GenderAgeFilteredTooltip = ({ active, payload, label, hoveredKey }) => {
    if (!active || !payload || !payload.length) return null;
    const items = hoveredKey ? payload.filter(p => p.dataKey === hoveredKey) : payload;
    if (!items.length) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md shadow-md p-3 text-sm">
        <div className="font-semibold text-gray-800 mb-1">{label}</div>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: it.color }} />
            <span className="text-gray-700">{it.name}:</span>
            <span className="font-medium text-gray-900">{Number(it.value || 0).toLocaleString()} customers</span>
          </div>
        ))}
      </div>
    );
  };

  const renderStateTooltip = (props) => (
    <FilteredTooltip {...props} hoveredKey={hoveredStateClusterKey} />
  );

  const renderGenderTooltip = (props) => (
    <GenderAgeFilteredTooltip {...props} hoveredKey={hoveredGenderBar} />
  );

  const renderAgeTooltip = (props) => (
    <GenderAgeFilteredTooltip {...props} hoveredKey={hoveredAgeBar} />
  );

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
    const handleSaveReport = async () => {
      try {
        if (saving) return;
        if (!segmentationId || !Array.isArray(summaries) || summaries.length === 0) return;
        setSaving(true);
        // Show loading immediately on click
        Swal.fire({
          title: 'Saving report…',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => { Swal.showLoading(); },
        });
        // Retrieve dataset IDs from cache so dedup works server-side
        let customerDatasetId = null;
        let orderDatasetId = null;
        try {
          const raw = localStorage.getItem('segmentationCache');
          if (raw) {
            const cached = JSON.parse(raw);
            customerDatasetId = cached?.customerDatasetId || null;
            orderDatasetId = cached?.orderDatasetId || null;
          }
        } catch (_) {}

        // 1) Preflight: Check existence before doing heavy capture
        try {
          const checkRes = await axios.get(
            `${backendUrl}/api/reports/exists`,
            {
              params: { segmentationId, customerDatasetId, orderDatasetId },
              withCredentials: true,
            }
          );
          const exists = checkRes?.data?.data?.exists;
          const existingId = checkRes?.data?.data?.id;
          if (exists && existingId) {
            Swal.close();
            await Swal.fire({
              icon: 'info',
              title: 'Report already exists',
              text: 'A report for this segmentation and datasets is already saved. You can view it in your Reports list.',
              confirmButtonText: 'Go to Reports',
              confirmButtonColor: '#3b82f6',
            });
            navigate('/reports');
            return; // Skip capture & save
          }
        } catch (_) { /* ignore preflight failure, continue */ }
        const payload = {
          segmentationId,
          customerDatasetId,
          orderDatasetId,
          bestK: summaries.length,
          kpis: { totalCustomers, totalRevenue, averageSpendOverall, overallAvgRecency, overallAvgFrequency },
          clusters: summaries,
          generatePdf: true,
        };

        // Capture and COMPOSE images into page-specific grids for PDF only (no UI change)
        try {
          // Helpers
          const sleep = (ms) => new Promise(r => setTimeout(r, ms));
          const capture = async (node) => {
            if (!node) return null;
            // small delay to ensure labels render
            await sleep(1000);
            let img = await toPng(node, {
              cacheBust: true,
              pixelRatio: 2,
              backgroundColor: '#ffffff',
              skipFonts: false,
              fontEmbedCSS: true,
              style: { transform: 'none' }
            });
            const svg = node.querySelector?.('svg.recharts-surface');
            if (svg) {
              try {
                const svgImg = await toPng(svg, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
                img = img || svgImg;
              } catch {}
            }
            return img;
          };
          const loadImage = (src) => new Promise((resolve) => { const im = new Image(); im.onload = () => resolve(im); im.src = src; });

          // Slice a tall image into A4-like pages for PDF
          const sliceIntoPages = async (src, targetW = 1800, pageH = 2546) => {
            if (!src) return [];
            const srcIm = await loadImage(src);
            const scale = targetW / srcIm.width;
            const scaledH = Math.round(srcIm.height * scale);
            const fullCanvas = document.createElement('canvas');
            fullCanvas.width = targetW; fullCanvas.height = scaledH;
            const fctx = fullCanvas.getContext('2d');
            fctx.fillStyle = '#ffffff'; fctx.fillRect(0, 0, targetW, scaledH);
            fctx.drawImage(srcIm, 0, 0, targetW, scaledH);
            const pages = [];
            for (let y = 0; y < scaledH; y += pageH) {
              const h = Math.min(pageH, scaledH - y);
              const p = document.createElement('canvas');
              p.width = targetW; p.height = h;
              const pctx = p.getContext('2d');
              pctx.fillStyle = '#ffffff'; pctx.fillRect(0, 0, targetW, h);
              pctx.drawImage(fullCanvas, 0, y, targetW, h, 0, 0, targetW, h);
              pages.push(p.toDataURL('image/png'));
            }
            return pages;
          };

          // Let charts finish initial render (one double rAF is enough)
          await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));

          // Capture KPI grid and Segment cards grid exactly as seen
          const kpiImg = await capture(kpiGridRef.current);
          const segmentsImg = await capture(segmentsGridRef.current);

          // Capture Overview charts section as a single WYSIWYG image (like cluster pages)
          let pages = [];
          try {
            const overviewImg = await toPng(overviewCaptureRef.current, {
              cacheBust: true,
              pixelRatio: 2,
              backgroundColor: '#ffffff',
              // Render at fixed width for consistent PDF scaling
              style: { width: '1800px' }
            });
            if (overviewImg) {
              pages = await sliceIntoPages(overviewImg);
            }
          } catch {}

          const imagesPayload = {};
          if (pages.length) {
            imagesPayload.overview = pages;
          }
          // KPI grid as its own image page(s)
          if (kpiImg) {
            const kpiPages = await sliceIntoPages(kpiImg);
            if (kpiPages.length) imagesPayload.kpi = kpiPages;
          }
          // Segment cards potentially multiple pages
          if (segmentsImg) {
            const segPages = await sliceIntoPages(segmentsImg);
            if (segPages.length) imagesPayload.segments = segPages;
          }
          // State chart capture
          try {
            const stateImg = await toPng(stateChartWrapperRef.current, {
              cacheBust: true,
              pixelRatio: 2,
              backgroundColor: '#ffffff',
              style: { width: '1800px' }
            });
            if (stateImg) {
              imagesPayload.stateRevenue = stateImg;
            }
          } catch (e) {
            console.warn('State chart capture failed:', e?.message);
          }

          // Cluster detail snapshots (one page per cluster) with limited concurrency to reduce peak memory
          try {
            // Ensure the hidden snapshots are rendered
            await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
            const clusterPages = [];
            for (let i = 0; i < (summaries?.length || 0); i++) {
              const node = clusterSnapRefs.current[i];
              if (!node) continue;
              const img = await toPng(node, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
              if (img) clusterPages.push(img);
            }
            if (clusterPages.length) imagesPayload.clusterDashboards = clusterPages;
          } catch (e) {
            console.warn('Cluster snapshot capture failed:', e?.message);
          }

          if (Object.keys(imagesPayload).length) payload.images = imagesPayload;
        } catch (captureErr) {
          console.warn('Panel capture failed, continuing without images:', captureErr?.message);
        }
        const res = await axios.post(`${backendUrl}/api/reports/save-report`, payload, { withCredentials: true });
        const id = res?.data?.data?.id;
        const pdf = res?.data?.data?.pdf;
        const reused = res?.data?.data?.reused;
        if (id) {
          Swal.close();
          if (reused) {
            await Swal.fire({
              icon: 'info',
              title: 'Report already exists',
              text: 'A report for this segmentation and datasets was previously saved. You can view it in your Reports list.',
              confirmButtonText: 'Go to Reports',
              confirmButtonColor: '#3b82f6',
            });
            navigate('/reports');
          } else {
            await Swal.fire({
              icon: 'success',
              title: 'Report saved',
              text: 'Your report has been saved. You can find it in your Reports list.',
              showConfirmButton: false,  
              timer: 3000,
            });
             if (pdf?.fileId) {
              window.open(`${backendUrl}/api/reports/${id}/pdf`, '_blank');
            }
          }
        }
      } catch (e) {
        console.error('Failed to save report', e);
        const msg = e.response?.data?.message || e.message || 'Unable to save report.';
        Swal.close();
        Swal.fire({ icon: 'error', title: 'Save failed', text: msg });
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <UserSidebar />
        <div className="flex-1 p-6 pt-24">
          <Navbar />
          <div className="max-w-7xl mx-auto">
            <div className="mb-5 flex items-center justify-between">
              {/* Title */}
              <h1 className="text-2xl font-bold text-indigo-900 flex-1 text-center md:text-left">
                Customer Segmentation Dashboard Overview
              </h1>

              {/* Report Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveReport}
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <Save size={16} /> {saving ? 'Saving…' : 'Save Report (PDF)'}
                </button>
                <button
                  onClick={() => navigate('/reports')}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                >
                  <FileText size={16} /> View Reports
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">We found {summaries.length} customer groups.</p>

            {/* Customer Groups quick overview chips with hover descriptions */}
            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-200 mb-6">
              <h3 className="text-md font-semibold text-gray-800 mb-3">Customer Groups</h3>
              <div className="flex flex-wrap gap-2">
                {summaries.map((s, i) => {
                  const chipName = `${s.suggestedName || `Cluster ${s.cluster}`} Group`;
                  const chipDesc = s?.description || 'Classic RFM group based on recency, frequency, and monetary value.';
                  return (
                    <div key={`chip-${s.cluster}`} className="group relative inline-flex items-center px-3 py-1 rounded-md border border-gray-300 bg-gray-50 text-gray-800 text-xs md:text-sm hover:bg-gray-100 cursor-default">
                      <span className="font-medium">{chipName}</span>
                      <span className="ml-2 inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] md:text-xs">#{i + 1}</span>
                      <div className="absolute top-full left-0 mt-2 hidden group-hover:block p-2 bg-gray-800 text-white text-xs rounded-md shadow-lg z-50 max-w-xs">
                        {chipDesc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10" ref={kpiGridRef}>
              <MetricCard title="Total Customers" value={totalCustomers.toLocaleString()} icon={<Users className="w-7 h-7 text-blue-600" />} bgColor="bg-blue-100" />
              <MetricCard title="Total Revenue" value={`RM ${totalRevenue.toFixed(2).toLocaleString()}`} icon={<DollarSign className="w-7 h-7 text-green-600" />} bgColor="bg-green-100" />
              <MetricCard title="Segments Found" value={summaries.length} icon={<ShoppingBag className="w-7 h-7 text-orange-600" />} bgColor="bg-orange-100" />
              <MetricCard title="Average Spend" value={`RM ${averageSpendOverall}`} icon={<TrendingUp className="w-7 h-7 text-purple-600" />} bgColor="bg-purple-100" />
              <MetricCard title="Average Days Since Last Purchase" value={`${overallAvgRecency} days`} icon={<TrendingUp className="w-7 h-7 text-purple-600" />} bgColor="bg-purple-100" />
              <MetricCard title="Average Purchases Per Month" value={`${overallAvgFrequency}`} icon={<TrendingUp className="w-7 h-7 text-purple-600" />} bgColor="bg-purple-100" />
            </div>

            {/* Overview charts wrapper for WYSIWYG PDF capture */}
            <div ref={overviewCaptureRef}>
            {/* Row: Left spans 2 rows, right has two stacked panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8 ">
              {/* Left: Avg Spend spanning two rows */}
              <div className="bg-white p-8 rounded-3xl shadow-xl lg:row-span-2" ref={spendPanelRef}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Average Customer Spend per Segment</h3>
                  <button
                    className="text-sm text-indigo-600 hover:underline"
                    onClick={() => setSpendSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    title="Toggle sort order"
                  >
                    Sort: {spendSortOrder === 'asc' ? '↑' : '↓'} 
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={650}>
                  <BarChart data={clusterSpendData} margin={{ top: 24, right: 0, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cluster" interval={0} height={70} tickMargin={8} tick={<WrappedXAxisTick />} label={{
                      value: 'Segment Groups Name',
                      position: 'insideBottom',
                      dy:10
                    }}/>
                    <YAxis tick={{ fontSize: 12 }} label={{
                      value: 'Average Spend (RM)',
                      position: 'insideStart',
                      angle: -90,
                      offset: 0,
                      dx: -15,
                      dy: 0
                    }}/>
                    <Tooltip formatter={v => `RM ${Number(v || 0).toLocaleString()}`} />
                    <Bar dataKey="avgSpend" name="Average Spend" fill={COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Right top: Customer distribution by cluster */}
              <div className="bg-white p-4 rounded-3xl shadow-xl" ref={distributionPanelRef}>
                <h3 className="text-xl font-bold text-gray-800 mb-6">Customer Distribution by Cluster</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clusterDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={entry => `${entry.value} (${entry.pct}%)`}
                    >
                      {clusterDistribution.map((entry, index) => (
                        <Cell key={`cluster-dist-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name, params) => `${v} customers (${params?.payload?.pct || 0}%)`} />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{ fontSize: 12, fontWeight: 400 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Right bottom: Top Products (Table) */}
              <div className="bg-white p-6 rounded-3xl shadow-xl self-start" ref={productsPanelRef}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Products by Popularity</h3>
                  <button
                    className="text-sm text-indigo-600 hover:underline"
                    onClick={() => setTopProductsSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    title="Toggle sort order"
                  >
                    Sort: {topProductsSortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="min-w-full table-auto border border-gray-400">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-700">
                        <th className="py-2 px-3 border-b border-r border-gray-400">Product</th>
                        <th className="py-2 px-3 text-right border-b border-gray-400">Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const sorted = topProducts
                          .slice()
                          .sort((a, b) => (topProductsSortOrder === 'asc' ? a.count - b.count : b.count - a.count));
                        const counts = sorted.map(x => x.count);
                        const minC = counts.length ? Math.min(...counts) : 0;
                        const maxC = counts.length ? Math.max(...counts) : 0;
                        const norm = (c) => (maxC === minC ? 0.5 : (c - minC) / (maxC - minC));

                        return sorted.map((p) => {
                          const t = norm(p.count);
                          const intensity = 0.2 + t * 0.6; // 0.2 (light) to 0.8 (dark)
                          return (
                            <tr
                              key={p.name}
                              className="transition-colors hover:bg-gray-100"
                              style={{ backgroundColor: `rgba(37, 99, 235, ${intensity})` }}
                            >
                              <td className="py-2 px-3 border-b border-r border-gray-400">{p.name}</td>
                              <td className="py-2 px-3 text-right border-b border-gray-400">{p.count.toLocaleString()}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Row: Gender & AgeGroup Overview (bar charts) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-8 ">
              {/* Gender Grouped BarChart */}
              <div className="bg-white p-8 rounded-3xl shadow-xl" ref={genderPanelRef}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Gender by Cluster</h3>
                  <button
                    className="text-sm text-indigo-600 hover:underline"
                    onClick={() => setGenderSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    title="Toggle sort order"
                  >
                    Sort: {genderSortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
                {hasGender ? (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={genderChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cluster" interval={0} height={70} tickMargin={8} tick={<WrappedXAxisTick />} />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', dy: 60, dx: 15 }} />
                      <Tooltip content={renderGenderTooltip} />
                      <Legend />
                      <Bar dataKey="male" name="Male" fill={COLORS[1]} onClick={handleGenderBarClick} cursor="pointer" onMouseOver={() => setHoveredGenderBar('male')} onMouseLeave={() => setHoveredGenderBar(null)} />
                      <Bar dataKey="female" name="Female" fill={COLORS[2]} onClick={handleGenderBarClick} cursor="pointer" onMouseOver={() => setHoveredGenderBar('female')} onMouseLeave={() => setHoveredGenderBar(null)} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">No gender data available.</p>
                )}
              </div>

              {/* Age Group Stacked BarChart */}
              <div className="bg-white p-8 rounded-3xl shadow-xl" ref={agePanelRef}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Age Group by Cluster</h3>
                  <button
                    className="text-sm text-indigo-600 hover:underline"
                    onClick={() => setAgeSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    title="Toggle sort order"
                  >
                    Sort: {ageSortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
                {hasAgeGroup ? (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={ageStackData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="cluster" interval={0} height={70} tickMargin={8}
                    tick={<WrappedXAxisTick />} />
                      <YAxis tick={{ fontSize: 12 }} label={{ value: 'Number of Customers', angle: -90, position: 'insideLeft', dy: 60, dx: 15 }} />
                      <Tooltip content={renderAgeTooltip} />
                      <Legend />
                      {ageGroupKeys.map((k, i) => (
                        <Bar key={k} dataKey={k} stackId="age" fill={COLORS[i % COLORS.length]} onClick={handleAgeBarClick} cursor="pointer" onMouseOver={() => setHoveredAgeBar(k)} onMouseLeave={() => setHoveredAgeBar(null)} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-500">No age group data available.</p>
                )}
              </div>
            </div>

            </div>

            {/* Row 2: States by Revenue full-width - SEPARATE from overview, will be with segment cards */}
            <div className="bg-white p-8 rounded-3xl shadow-xl mb-4" ref={stateChartWrapperRef}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6">States by Revenue</h3>
                <div className="flex items-center gap-2">
                  <button
                    className="text-sm text-indigo-600 hover:underline"
                    onClick={() => setStateSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    title="Toggle sort order"
                  >
                    Sort: {stateSortOrder === 'asc' ? '↑' : '↓'} 
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={stateChartData} >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="state"
                    interval={0}
                    height={Math.min(140, maxLinesStates * 16 + 24)}
                    tickMargin={8}
                    tick={<WrappedXAxisTick />}
                    label={{
                      value: 'State',
                      angle: 0,
                      position: 'insideStart',
                      offset: 0,
                      dy: 15
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} label={{
                      value: 'Average Spend (RM)',
                      position: 'insideStart',
                      angle: -90,
                      offset: 0,
                      dx: -29,
                      dy: 0
                    }}/>
                  <Tooltip content={renderStateTooltip} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                  />
                  {orderedSummaries.map((s, idx) => (
                    <Bar
                      key={s.cluster}
                      dataKey={`cluster_${s.cluster}`}
                      stackId="a"
                      fill={COLORS[idx % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={1}
                      name={s.suggestedName || `Cluster ${s.cluster}`}
                      onClick={handleStateBarClick}
                      onMouseOver={() => setHoveredStateClusterKey(`cluster_${s.cluster}`)}
                      onMouseLeave={() => setHoveredStateClusterKey(null)}
                      cursor="pointer"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Segment Cards */}
            <h2 className="text-3xl font-bold text-center mt-16 mb-10 text-indigo-900">Explore Individual Segments</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" ref={segmentsGridRef}>
              {summaries.map((seg, idx) => (
                <SegmentCard key={seg.cluster} seg={seg} idx={idx} pairDescription={pairDescriptions[activePair]} />
              ))}
            </div>
            {/* Hidden offscreen cluster snapshots for PDF capture */}
            <div ref={clusterSnapshotsContainerRef} className="absolute -left-[20000px] top-0">
              {summaries.map((seg, idx) => (
                <div key={`snap-${seg.cluster}`} ref={el => (clusterSnapRefs.current[idx] = el)} className="mb-6 w-[1800px]">
                  <ClusterDetailView seg={seg} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
