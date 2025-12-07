import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';

const SegmentationDashboard = ({ segmentationId }) => {
  const { backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [mergedData, setMergedData] = useState([]);
  const [clusterSummaries, setClusterSummaries] = useState({});

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${backendUrl}/api/segmentation/${segmentationId}/dashboard`, { withCredentials: true });
        if (res.data.success) {
          setMergedData(res.data.mergedWithClusters);
          setClusterSummaries(res.data.clusterSummaries);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [segmentationId]);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Customer Segmentation Dashboard</h1>

      {/* Cluster Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {Object.entries(clusterSummaries).map(([cid, summary]) => (
          <div key={cid} className="bg-white p-4 rounded shadow">
            <h2 className="font-bold text-lg">Cluster {cid}</h2>
            <p>Total Customers: {summary.total}</p>
            <p>Avg Age: {summary.avgAge}</p>
            <p>Avg Spending: ${summary.avgSpending}</p>
            <p>Top Gender: {summary.topGender}</p>
            <p>Top City: {summary.topCity}</p>
          </div>
        ))}
      </div>

      {/* Table of customers */}
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              {mergedData.length > 0 && Object.keys(mergedData[0]).map(col => (
                <th key={col} className="border p-2">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mergedData.map((c, idx) => (
              <tr key={idx} className={`border-b ${c.cluster==='1' ? 'bg-blue-50':''}`}>
                {Object.values(c).map((val,i) => <td key={i} className="p-2 border">{val}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SegmentationDashboard;
