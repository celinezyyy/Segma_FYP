// SegmentationDashboard.jsx
import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import UserSidebar from '../../components/UserSidebar';
import Navbar from '../../components/Navbar';
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { ArrowLeft, Users, DollarSign, Clock, Calendar, MapPin, CreditCard, Sun, Moon } from 'lucide-react';

// Align chart palette with app theme (blues/greens + accents)
const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#ef4444'];

export default function SegmentationDashboard() {
  const location = useLocation();
  const { segmentationId, selectedFeatures } = location.state || {};
  const { backendUrl } = useContext(AppContext);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null); // null = overview, number = specific cluster

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
          const summaries = res.data.data.summaries;

          // AUTO-GENERATE MEANINGFUL NAMES if missing
          const namedSummaries = summaries.map((s, i) => {
            if (s.suggestedName) return s;

            const names = [
              "Champions", "Loyal Customers", "Potential Loyalists",
              "At Risk", "Hibernating", "Lost Customers",
              "New Customers", "Price-Sensitive", "Occasional Buyers", "High-Value Regulars"
            ];
            return { ...s, suggestedName: names[i] || `Segment ${s.cluster}` };
          });

          setData({ ...res.data.data, summaries: namedSummaries });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [segmentationId, selectedFeatures, backendUrl]);

  if (loading) return <div className="p-10 text-center text-xl">Loading segments...</div>;
  if (!data) return <div className="p-10 text-center text-red-600">No data found</div>;

  const { totalCustomers, totalRevenue, summaries } = data;

  // SINGLE CLUSTER VIEW
  if (selectedCluster !== null) {
    const seg = summaries.find(s => s.cluster === selectedCluster);
    if (!seg) return <div>Cluster not found</div>;

    const radarData = [{
      dimension: "Recency", value: Math.max(10, 100 - seg.avgRecencyDays / 3) },
      { dimension: "Frequency", value: seg.avgOrders * 15 },
      { dimension: "Monetary", value: seg.avgSpend / 8 },
      { dimension: "Lifetime", value: seg.avgLifetimeMonths * 2 },
      { dimension: "AOV", value: seg.avgAOV / 4 }
    ];

    return (
      <div className="flex min-h-screen bg-gray-50">
        <UserSidebar />
        <div className="flex-1 p-8 pt-20">
          <Navbar />
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => setSelectedCluster(null)}
              className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={20} /> Back to All Segments
            </button>
          <h1 className="text-4xl font-bold text-blue-800 mb-2">{seg.suggestedName}</h1>
          <p className="text-xl text-gray-600 mb-8">
            {seg.size.toLocaleString()} customers • {seg.revenuePct}% of total revenue
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-blue-600" />
                <p className="text-gray-600">Segment Size</p>
              </div>
              <p className="text-3xl font-bold">{seg.sizePct}%</p>
              <p className="text-sm text-gray-500">of all customers</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="text-green-600" />
                <p className="text-gray-600">Avg Spend</p>
              </div>
              <p className="text-3xl font-bold">RM {seg.avgSpend.toFixed(0)}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="text-blue-600" />
                <p className="text-gray-600">Last Purchase</p>
              </div>
              <p className="text-3xl font-bold">{Math.round(seg.avgRecencyDays)} days ago</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-orange-600" />
                <p className="text-gray-600">Customer Lifetime</p>
              </div>
              <p className="text-3xl font-bold">{seg.avgLifetimeMonths.toFixed(0)} months</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Who Are They?</h3>
              <div className="space-y-4 text-lg">
                <p><strong>Age:</strong> {seg.topAgeGroup}</p>
                <p><strong>Gender:</strong> {seg.topGender} ({seg.genderPct}%)</p>
                <p><strong>Location:</strong> {seg.topState} → {seg.topCity}</p>
                <p><strong>Payment:</strong> {seg.topPayment}</p>
                <p><strong>Active Time:</strong> {seg.topDayPart === "Evening" ? <Sun className="inline" /> : <Moon className="inline" />} {seg.topDayPart}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Behavioral Profile</h3>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name={seg.suggestedName} dataKey="value" stroke={COLORS[seg.cluster % COLORS.length]} fill={COLORS[seg.cluster % COLORS.length]} fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN OVERVIEW: ALL CLUSTERS
  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserSidebar />
      <div className="flex-1 p-8 pt-20">
        <Navbar />
        <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Your Customer Segments</h1>
        <p className="text-center text-xl text-gray-600 mb-12">
          {totalCustomers.toLocaleString()} customers analyzed • {summaries.length} segments discovered
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {summaries.map((seg) => (
            <div
              key={seg.cluster}
              onClick={() => setSelectedCluster(seg.cluster)}
              className="bg-white rounded-3xl shadow-xl overflow-hidden cursor-pointer transform hover:scale-105 transition duration-300"
            >
              <div className={`h-32`} style={{ backgroundColor: COLORS[seg.cluster % COLORS.length] + '20' }}>
                <div className="p-6 text-center">
                  <h2 className="text-3xl font-bold text-gray-800">{seg.suggestedName}</h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customers</span>
                  <span className="text-2xl font-bold">{seg.sizePct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revenue Share</span>
                  <span className="text-2xl font-bold text-green-600">{seg.revenuePct}%</span>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">Avg Spend: <strong>RM {seg.avgSpend.toFixed(0)}</strong></p>
                  <p className="text-sm text-gray-600">Last Seen: <strong>{Math.round(seg.avgRecencyDays)} days ago</strong></p>
                  <p className="text-sm text-gray-600">Main Location: <strong>{seg.topState}</strong></p>
                </div>

                <button className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">
                  View Details →
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