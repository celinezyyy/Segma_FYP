// SegmentationDashboard.jsx (or .js)
import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Download, Edit2, Check, X } from 'lucide-react';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function SegmentationDashboard() {
  const location = useLocation();
  const { segmentationId, selectedFeatures } = location.state || {};
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // ← removed type
  const [activeTab, setActiveTab] = useState('overview');
  const [editingName, setEditingName] = useState(null); // ← no type
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    if (!segmentationId || !selectedFeatures) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.post(
          `${backendUrl}/api/segmentation/${segmentationId}/dashboard`,
          { features: selectedFeatures },
          { withCredentials: true }
        );

        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [segmentationId, selectedFeatures, backendUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-2xl text-gray-600">Loading your customer segments...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 text-xl">No data found. Please run segmentation first.</p>
      </div>
    );
  }

  const { totalCustomers, totalRevenue, summaries, featuresUsed } = data;

  // Start editing name
  const startEdit = (segment) => {
    setEditingName(segment.cluster);
    setTempName(segment.suggestedName || `Segment ${segment.cluster}`);
  };

  const saveName = (segment) => {
    segment.suggestedName = tempName;
    setEditingName(null);
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ['Segment Name', 'Customers', '% Customers', 'Revenue %', 'Avg Spend', 'Avg Orders', 'Recency', 'Gender', 'Age Group', 'State'];
    const rows = summaries.map(s => [
      s.suggestedName || `Segment ${s.cluster}`,
      s.size,
      `${s.sizePct}%`,
      `${s.revenuePct}%`,
      `RM ${s.avgSpend.toFixed(0)}`,
      s.avgOrders.toFixed(1),
      `${Math.round(s.avgRecencyDays)} days`,
      `${s.topGender} (${s.genderPct}%)`,
      `${s.topAgeGroup} (${s.agePct}%)`,
      `${s.topState} (${s.statePct}%)`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer_segments_${segmentationId}.csv`;
    a.click();
  };

  // Chart data
  const pieData = summaries.map(s => ({
    name: s.suggestedName || `Segment ${s.cluster}`,
    value: s.sizePct,
    revenue: s.revenuePct
  }));

  const radarData = summaries.map(s => ({
    segment: s.suggestedName || `Segment ${s.cluster}`,
    Recency: Math.max(10, 100 - s.avgRecencyDays / 3),
    Frequency: s.avgOrders * 10,
    Monetary: s.avgSpend / 10,
    Lifetime: s.avgLifetimeMonths * 2,
    AOV: s.avgAOV / 5
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Segmentation Results</h1>
              <p className="text-gray-600 mt-2">
                <strong>{totalCustomers.toLocaleString()}</strong> customers • 
                <strong> RM {(totalRevenue / 1000000).toFixed(2)}M</strong> revenue • 
                <span className="ml-3 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {featuresUsed.join(' + ')}
                </span>
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              <Download size={20} />
              Export Results
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex space-x-8 border-b">
          {['overview', 'hybrid table', 'behavior'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 capitalize font-medium text-lg transition ${
                activeTab === tab
                  ? 'text-purple-600 border-b-3 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'hybrid table' ? 'Hybrid Segments' : tab}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4">Customer Distribution</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} label>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-8 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold mb-4">Revenue Contribution</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={pieData} dataKey="revenue" nameKey="name" innerRadius={70} outerRadius={120} label>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Hybrid Table */}
          {activeTab === 'hybrid table' && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 bg-purple-50">
                <h2 className="text-2xl font-bold text-purple-900">Your Customer Segments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-left text-sm font-medium text-gray-700">
                    <tr>
                      <th className="p-5">Segment Name</th>
                      <th className="p-5">Size (%)</th>
                      <th className="p-5">Revenue (%)</th>
                      <th className="p-5">Behavior</th>
                      <th className="p-5">Demographic</th>
                      <th className="p-5">Geographic</th>
                      <th className="p-5">Best Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s) => (
                      <tr key={s.cluster} className="border-t hover:bg-purple-50 transition">
                        <td className="p-5 font-semibold text-purple-700">
                          {editingName === s.cluster ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                className="px-3 py-1 border rounded-md"
                                autoFocus
                              />
                              <button onClick={() => saveName(s)}><Check className="text-green-600" /></button>
                              <button onClick={() => setEditingName(null)}><X className="text-red-600" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <span>{s.suggestedName || `Segment ${s.cluster}`}</span>
                              <button onClick={() => startEdit(s)} className="text-gray-500 hover:text-purple-600">
                                <Edit2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-5">{s.sizePct}% ({s.size.toLocaleString()})</td>
                        <td className="p-5 font-bold text-green-600">{s.revenuePct}%</td>
                        <td className="p-5 text-sm">
                          <div>Recency: <strong>{Math.round(s.avgRecencyDays)} days</strong></div>
                          <div>Orders: <strong>{s.avgOrders.toFixed(1)}</strong></div>
                          <div>AOV: <strong>RM {s.avgAOV.toFixed(0)}</strong></div>
                        </td>
                        <td className="p-5">{s.topAgeGroup} • {s.topGender} ({s.genderPct}%)</td>
                        <td className="p-5">{s.topState} ({s.statePct}%)</td>
                        <td className="p-5">{s.topDayPart}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Behavior Radar */}
          {activeTab === 'behavior' && (
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold mb-6 text-center">Behavioral Comparison</h3>
              <ResponsiveContainer width="100%" height={500}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e0e0e0" />
                  <PolarAngleAxis dataKey="segment" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  {radarData.map((entry, i) => (
                    <Radar
                      key={i}
                      name={entry.segment}
                      dataKey={Object.keys(entry).filter(k => k !== 'segment')}
                      stroke={COLORS[i]}
                      fill={COLORS[i]}
                      fillOpacity={0.4}
                    />
                  ))}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}