import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserSidebar from '../../components/UserSidebar';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const Segmentation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  const { selectedCustomer, selectedOrder } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [segmentationId, setSegmentationId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [selectedPairId, setSelectedPairId] = useState(null);
  const [segLoading, setSegLoading] = useState(false);
  const [segResult, setSegResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [recommendedPairs, setRecommendedPairs] = useState([]);
  const [mergedColumns, setMergedColumns] = useState([]);
  const [customAttrA, setCustomAttrA] = useState('');
  const [customAttrB, setCustomAttrB] = useState('');

  // Fetch and merge data when component loads
  useEffect(() => {
    if (!selectedCustomer || !selectedOrder) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Data',
        text: 'Please complete data cleaning before proceeding to segmentation.',
      }).then(() => {
        navigate('/confirm-selected-dataset');
      });
      return;
    }

    fetchAndMergeData();
  }, [selectedCustomer, selectedOrder]);

  const fetchAndMergeData = async () => {
    setLoading(true);
    try {
      console.log('[DEBUG] Fetching and merging data...');
      console.log('[DEBUG] Customer ID:', selectedCustomer);
      console.log('[DEBUG] Order ID:', selectedOrder);

      const response = await axios.post(
        `${backendUrl}/api/segmentation/prepare`,
        {
          customerDatasetId: selectedCustomer,
          orderDatasetId: selectedOrder,
        },
        {
          withCredentials: true,
        }
      );

      console.log('[DEBUG] Response return from /prepare API ::', response.data);

      if (response.data?.success) {
        setSegmentationId(response.data.segmentationId || null);
        setSummary(response.data.summary || null);
        setRecommendedPairs(Array.isArray(response.data.availablePairs) ? response.data.availablePairs : []);
        // Fetch merged columns for custom selection
        if (response.data.segmentationId) {
          try {
            const colsResp = await axios.get(`${backendUrl}/api/segmentation/${response.data.segmentationId}/columns`, { withCredentials: true });
            if (colsResp.data?.success && Array.isArray(colsResp.data.columns)) {
              console.log('[DEBUG] Merged columns:', colsResp.data.columns);
              setMergedColumns(colsResp.data.columns);
            }
          } catch (e) {
            console.warn('Unable to fetch merged columns', e?.message);
          }
        }
        Swal.fire({
          icon: 'success',
          title: 'Data Prepared!',
          text: `Successfully merged ${response.data.summary?.totalCustomers ?? ''} customer profiles.`,
          timer: 3000,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error('Error fetching merged data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Merge Failed',
        text: error.response?.data?.message || 'Failed to prepare segmentation data.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCustomer || !selectedOrder) {
    return null; // Will redirect via useEffect
  }

  if (loading) {
    return (
      <div className="flex">
        <UserSidebar />
        <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg font-medium">Merging and aggregating data...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  const DownloadMergedDataset = async () => {
    try {
      setDownloading(true);
      let sid = segmentationId;
      // If not prepared yet, prepare on-demand
      if (!sid) {
        const prepResp = await axios.post(
          `${backendUrl}/api/segmentation/prepare`,
          { customerDatasetId: selectedCustomer, orderDatasetId: selectedOrder },
          { withCredentials: true }
        );
        if (!prepResp.data?.success || !prepResp.data?.segmentationId) {
          throw new Error(prepResp.data?.message || 'Failed to prepare merged dataset');
        }
        sid = prepResp.data.segmentationId;
        setSegmentationId(sid);
        setSummary(prepResp.data.summary || null);
      }

      const resp = await axios.post(
        `${backendUrl}/api/segmentation/download`,
        { segmentationId: sid },
        { withCredentials: true, responseType: 'blob' }
      );

      const disposition = resp.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : `merged_customer_profiles_${new Date().toISOString().slice(0,10)}.csv`;

      const blob = new Blob([resp.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Swal.fire({ icon: 'success', title: 'Download Complete', timer: 2000, showConfirmButton: false });
    } catch (e) {
      console.error('Download failed', e);
      const msg = e.response?.data?.message || e.message || 'Unable to download merged CSV.';
      Swal.fire({ icon: 'error', title: 'Download failed', text: msg });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserSidebar />
      
      <div className="flex-1 p-8 pt-20">{/* pt-20 offsets fixed top navbar overlap */}
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Customer Segmentation
            </h1>
            <p className="text-gray-600">
              Analyze customer segments based on behavioral, demographic, and geographic attributes
            </p>
            <div className="mt-4 flex gap-3">
                <button
                  onClick={DownloadMergedDataset}
                  disabled={downloading}
                    className={`inline-block border border-green-400 text-green-700 font-medium py-2 px-4 rounded transition
                  ${downloading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#F1F8E9] hover:bg-[#E6F4D7]'}
                    `}
                >
                  Download merged dataset
                </button>
            </div>
          </div>

          {/* Summary Stats */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Customers</p>
                    <p className="text-2xl font-bold text-blue-600">{summary.totalCustomers}</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Total Orders</p>
                    <p className="text-2xl font-bold text-green-600">{summary.totalOrders}</p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Active Customers</p>
                    <p className="text-2xl font-bold text-purple-600">{summary.customersWithOrders}</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Inactive Customers</p>
                    <p className="text-2xl font-bold text-orange-600">{summary.customersWithoutOrders}</p>
                  </div>
                  <div className="bg-orange-100 rounded-full p-3">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Segmentation Pairs Selection */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Choose How To Segment</h2>
            <p className="text-sm text-gray-600 mb-4">Use our suggested pairs, or pick your own two attributes.</p>
            {errorMsg && <p className="text-red-600 text-sm mt-2">{errorMsg}</p>}

            {/* Suggested Pairs */}
            <h3 className="text-base font-semibold text-gray-800 mb-2">Use Suggested Pairs</h3>
            {recommendedPairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recommendedPairs.map(p => {
                  const selected = selectedPairId === p.id;
                  return (
                    <label key={p.id} className={`cursor-pointer select-none border rounded p-4 flex flex-col justify-between transition ${selected ? 'border-blue-600 bg-white shadow' : 'border-gray-200 bg-gray-50 hover:shadow-sm'}`}>
                      <input type="radio" name="segPair" checked={selected} onChange={() => setSelectedPairId(p.id)} className="sr-only" />
                      <div onClick={() => setSelectedPairId(p.id)}>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-800">{p.label}</div>
                        </div>
                        {!selected && <p className="text-xs text-gray-600 mt-2">{p.description}</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 p-4 bg-yellow-50 border-l-4 border-yellow-300 rounded text-sm text-yellow-700">
                No recommended segmentation pairs available. Please verify your datasets contain enough attributes.
              </div>
            )}

            <div className="mt-4">
              {/* Removed persistent warning; will show only after click via errorMsg */}
              <div className="flex items-center gap-2">
                <button
                  onClick={async ()=>{
                    setErrorMsg(null); setSegResult(null);
                    if (!selectedPairId) { setErrorMsg('Please select a segmentation pair.'); return; }
                    const p = recommendedPairs.find(x => x.id === selectedPairId);
                    if (!p) { setErrorMsg('Invalid pair selected.'); return; }
                    setSegLoading(true);
                    try {
                      const resp = await axios.post(`${backendUrl}/api/segmentation/run`, {
                        segmentationId,
                        selectedFeatures: [p.features[0], p.features[1]]
                      }, { withCredentials: true });
                      if (resp.data.success) {
                        setSegResult(resp.data);
                        Swal.fire({ icon:'success', title:'Segmentation Complete', text:`K=${resp.data.bestK} clusters generated`, timer:2500, showConfirmButton:false });
                      } else {
                        setErrorMsg(resp.data.message || 'Segmentation failed.');
                      }
                    } catch (err) {
                      console.error(err);
                      setErrorMsg(err.response?.data?.message || 'Server error running segmentation.');
                    } finally {
                      setSegLoading(false);
                    }
                  }}
                  disabled={segLoading || !selectedPairId}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded font-medium border transition ${(segLoading || !selectedPairId) ? 'bg-gray-300 border-gray-300 text-gray-600 cursor-not-allowed' : 'border-green-400 text-green-700 bg-[#F1F8E9] hover:bg-[#E6F4D7]'}`}
                >{segLoading ? 'Running...' : 'Run Suggested Pair'}</button>
                <button onClick={()=>{ setSelectedPairId(null); setErrorMsg(null); }} className="px-4 py-2 rounded border border-red-400 text-red-600 hover:bg-red-50">Clear</button>
              </div>
            </div>

            {/* OR Divider */}
            <div className="relative my-8">
              <div className="border-t"></div>
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-3 text-xs text-gray-500">OR</div>
            </div>

            {/* Custom Pair Selector */}
            <div className="mt-2">
              <h3 className="text-base font-semibold text-gray-800 mb-2">Choose Your Own Pair</h3>
              <p className="text-sm text-gray-600 mb-4">Pick any two attributes from the merged dataset.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Attribute A</label>
                  <select
                    className="w-full border rounded px-3 py-2 bg-white"
                    value={customAttrA}
                    onChange={(e) => setCustomAttrA(e.target.value)}
                    disabled={segLoading || !segmentationId}
                  >
                    <option value="">Select attribute</option>
                    {mergedColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Attribute B</label>
                  <select
                    className="w-full border rounded px-3 py-2 bg-white"
                    value={customAttrB}
                    onChange={(e) => setCustomAttrB(e.target.value)}
                    disabled={segLoading || !segmentationId}
                  >
                    <option value="">Select attribute</option>
                    {mergedColumns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              {customAttrA && customAttrB && customAttrA === customAttrB && (
                <p className="text-red-600 text-sm mt-2">Please choose two different attributes.</p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={async ()=>{
                    setErrorMsg(null); setSegResult(null);
                    const a = customAttrA, b = customAttrB;
                    if (!a || !b) { setErrorMsg('Please select two attributes.'); return; }
                    if (a === b) { setErrorMsg('Please choose two different attributes.'); return; }
                    setSegLoading(true);
                    try {
                      const resp = await axios.post(`${backendUrl}/api/segmentation/run`, {
                        segmentationId,
                        selectedFeatures: [a, b]
                      }, { withCredentials: true });
                      if (resp.data.success) {
                        setSegResult(resp.data);
                        Swal.fire({ icon:'success', title:'Segmentation Complete', text:`K=${resp.data.bestK} clusters generated`, timer:2500, showConfirmButton:false });
                      } else {
                        setErrorMsg(resp.data.message || 'Segmentation failed.');
                      }
                    } catch (err) {
                      console.error(err);
                      setErrorMsg(err.response?.data?.message || 'Server error running segmentation.');
                    } finally {
                      setSegLoading(false);
                    }
                  }}
                  disabled={segLoading || !segmentationId || !customAttrA || !customAttrB || customAttrA===customAttrB}
                  className={`inline-flex items-center gap-2 px-5 py-2 rounded font-medium border transition ${(segLoading || !segmentationId || !customAttrA || !customAttrB || customAttrA===customAttrB) ? 'bg-gray-300 border-gray-300 text-gray-600 cursor-not-allowed' : 'border-green-400 text-green-700 bg-[#F1F8E9] hover:bg-[#E6F4D7]'}`}
                >Run Custom Pair</button>
                <span className="text-xs text-gray-500">Tip: Choose two attributes you care about.</span>
              </div>
            </div>
          </div>

          {/* Segmentation Result */}
          {segResult && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Segmentation Result (K={segResult.bestK})</h2>
                <div>
                  <button onClick={()=>setSegResult(null)} className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100">Clear Result</button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Evaluation Metrics</h3>
                  <table className="w-full text-sm border">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border">K</th>
                        <th className="p-2 border">Silhouette</th>
                        <th className="p-2 border">DBI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {segResult.evaluations.map(ev => (
                        <tr key={ev.k} className={ev.k===segResult.bestK? 'bg-blue-50':''}>
                          <td className="p-2 border text-center">{ev.k}</td>
                          <td className="p-2 border text-center">{ev.silhouette}</td>
                          <td className="p-2 border text-center">{ev.dbi}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 mt-2">Higher silhouette and lower DBI indicate better separation.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Cluster Summary</h3>
                  <div className="space-y-3 max-h-72 overflow-auto pr-2">
                    {Object.entries(segResult.clusterSummary).map(([key,val]) => (
                      <div key={key} className="border rounded p-3">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium text-gray-800">{key}</span>
                          <span className="text-sm text-gray-600">{val.count} ({val.percentage}%)</span>
                        </div>
                        <ul className="text-xs text-gray-600 list-disc ml-4">
                          {Object.entries(val.attributes).map(([f,v]) => <li key={f}>{f}: {v}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">Records used: {segResult.recordsUsed} / Total profiles: {segResult.totalProfiles}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Segmentation;
