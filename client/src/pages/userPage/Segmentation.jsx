import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
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
  const resultRef = useRef(null);

    // Derive feature label/unit from recommendedPairs provided by backend
  const FEATURE_META = useMemo(() => {
    const entries = [];
    for (const p of recommendedPairs || []) {
      for (const f of p.features || []) {
        if (f && f.key) entries.push([f.key, { label: f.label, unit: f.unit }]);
      }
    }
    return Object.fromEntries(entries);
  }, [recommendedPairs]);

  // Scroll to result when it's rendered (handles conditional render timing)
  useEffect(() => {
    if (segResult && resultRef.current) {
      // Use rAF to ensure DOM painted, then adjust for fixed header offset
      requestAnimationFrame(() => {
        const el = resultRef.current;
        const rect = el.getBoundingClientRect();
        const offset = 80; // account for fixed navbar padding (pt-20 ~ 80px)
        const targetY = window.scrollY + rect.top - offset;
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      });
    }
  }, [segResult]);

  // Log segResult only after state updates to avoid stale null logs
  useEffect(() => {
    if (segResult) {
      console.log('[DEBUG] Segmentation result (state):', segResult);
    }
  }, [segResult]);

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
    // Try cache first: avoid re-prepare if already done for these datasets
    try {
      const raw = localStorage.getItem('segmentationCache');
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached.customerDatasetId === selectedCustomer && cached.orderDatasetId === selectedOrder && cached.segmentationId) {
          setSegmentationId(cached.segmentationId);
          setSummary(cached.summary || null);
          const pairs = Array.isArray(cached.availablePairs) ? cached.availablePairs : [];
          // Only short-circuit if we actually have pairs cached; otherwise refresh from server
          if (pairs.length > 0) {
            setRecommendedPairs(pairs);
            return; // skip fetch & merge
          }
        }
      }
    } catch (_) {}

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
        // Persist cache to avoid re-prepare on return visits
        try {
          localStorage.setItem('segmentationCache', JSON.stringify({
            segmentationId: response.data.segmentationId || null,
            summary: response.data.summary || null,
            availablePairs: Array.isArray(response.data.availablePairs) ? response.data.availablePairs : [],
            customerDatasetId: selectedCustomer,
            orderDatasetId: selectedOrder,
            cachedAt: Date.now(),
          }));
        } catch (_) {}
        // Fetch merged columns for custom selection
        if (response.data.segmentationId) {
          try {
            const colsResp = await axios.get(`${backendUrl}/api/segmentation/${response.data.segmentationId}/columns`, { withCredentials: true });
            if (colsResp.data?.success && Array.isArray(colsResp.data.columns)) {
              console.log('[DEBUG] Merged columns:', colsResp.data.columns);
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

  // Unified run handler for suggested or custom pairs with Swal loading UX
  const handleRunSegmentation = async () => {
    setErrorMsg(null);
    setSegResult(null);

    // Determine features based on selection
    let features = null;
    if (selectedPairId) {
      const p = recommendedPairs.find((x) => x.id === selectedPairId);
      if (!p) 
        { setErrorMsg('Invalid pair selected.'); return; }
      // Use feature keys, not full objects
      features = (p.features || []).map(f => f.key).filter(Boolean);
      console.log('[DEBUG] Running segmentation with suggested pair features (keys):', features);
    } else {
      setErrorMsg('Please choose a suggested pair or select two attributes.');
      return;
    }
    if (!segmentationId) 
      { setErrorMsg('Segmentation session is not ready yet.'); return; }

    setSegLoading(true);
    Swal.fire({
      title: 'Almost ready!',
      text: 'We’re grouping your customers now. Just a few seconds, please wait...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    try {
      const resp = await axios.post(
        `${backendUrl}/api/segmentation/${segmentationId}/run`,
        { features },
        { withCredentials: true }
      );
      const data = resp.data || {};
      Swal.close();

      if (data.success) {
        setSegResult({
          bestK: data.bestK,
          clusterSummary: data.clusterSummary,
          assignments: data.assignments,
          selectedFeatures: features,
          totalProfiles: summary?.totalCustomers || null,
        });
        // Scroll handled by useEffect on segResult
        Swal.fire({
          icon: 'success',
          title: 'Segmentation Complete',
          text: `${(data.bestK)} clusters generated`,
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        const msg = data.message || 'Segmentation failed.';
        setErrorMsg(msg);
        Swal.fire({ icon: 'error', title: 'Segmentation Failed', text: msg });
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Server error running segmentation.';
      setErrorMsg(msg);
      Swal.fire({ icon: 'error', title: 'Server Error', text: msg });
    } finally {
      setSegLoading(false);
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
            <p className="text-sm text-gray-600 mb-4">Use our suggested pairs</p>
            {errorMsg && <p className="text-red-600 text-sm mt-2">{errorMsg}</p>}

            {/* Suggested Pairs */}
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              Recommended Segmentation Strategies
            </h3>

            {recommendedPairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
                {recommendedPairs.map(p => {
                  const selected = selectedPairId === p.id;

                  return (
                    <label
                      key={p.id}
                      className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-300 ${
                        selected
                          ? "border-blue-600 bg-blue-50/70 shadow-2xl ring-4 ring-blue-200 scale-105"
                          : "border-gray-200 bg-white shadow-lg hover:shadow-2xl hover:scale-102"
                      }`}
                      onClick={() => setSelectedPairId(p.id)}
                    >
                      <input type="radio" name="segPair" checked={selected} className="sr-only" />

                      {/* Selected checkmark */}
                      {selected && (
                        <div className="absolute -top-4 -right-4">
                          <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl text-3xl font-bold">
                            ✓
                          </div>
                        </div>
                      )}

                      <div className="flex gap-5 items-start">
                        {/* Icon */}
                        <div className="text-5xl flex-shrink-0">{p.icon}</div>

                        <div className="flex-1">
                          {/* Title + tagline */}
                          <h4 className="text-2xl font-bold text-gray-900 mb-2">{p.label}</h4>
                          <p className="text-lg text-blue-600 font-medium mb-6">{p.tagline}</p>

                          {/* Benefits with green checks */}
                          <ul className="space-y-2 mb-6">
                            {p.benefits.map((benefit, i) => (
                              <li key={i} className="flex items-center gap-3 text-gray-700">
                                <span className="text-green-600 text-xl font-bold">✔</span>
                                <span className="text-base">{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 p-4 bg-yellow-50 border-l-4 border-yellow-300 rounded text-sm text-yellow-700">
                No recommended segmentation pairs available. Error in retrieving attributes pairs
              </div>
            )}

            {/* Unified Run Button */}
            {(() => {
              const canRun = !!segmentationId && (
                (selectedPairId && recommendedPairs.some(x => x.id === selectedPairId))
              );
              return (
                <div className="mt-6 pt-4 border-t flex items-center justify-end">
                  <button
                    onClick={handleRunSegmentation}
                    disabled={segLoading || !canRun}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded font-medium border transition ${(segLoading || !canRun) ? 'bg-gray-300 border-gray-300 text-gray-600 cursor-not-allowed' : 'border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100'}`}
                  >Run Segmentation</button>
                </div>
              );
            })()}
          </div>
          {/* Segmentation Result */}
          {segResult && (
            console.log('[DEBUG] Rendering segmentation result:', segResult),
            <div ref={resultRef} className="mt-8 bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Segmentation Result (K={segResult.bestK})</h2>
              </div>
              {/* Simple, user-friendly summary */}
              <div className="mb-4 p-4 border rounded bg-blue-50 text-sm text-gray-800">
                <p className="mb-1">
                  We have identidy <span className="font-semibold">{segResult.bestK}</span> customer clusters!
                </p>
              </div>
              
              {/* Compact per-cluster highlights based on selected attributes */}
              {segResult.clusterSummary && (
                <div className="mt-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Cluster Highlights</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(segResult.clusterSummary).map(([cid, info]) => {
                      const attrs = info?.attributes || {};
                      const selected = Array.isArray(segResult.selectedFeatures) ? segResult.selectedFeatures : [];
                      const highlights = selected
                        .map(f => {
                          if (!(f in attrs)) 
                            return null;
                          const meta = FEATURE_META?.[f];
                          const label = meta.label || f;
                          const unit = meta.unit ? ` ${meta.unit}` : '';
                          return (
                            <li key={cid + f} className="text-xs text-gray-700">
                              <span className="font-semibold">{label}</span>
                              {`: ${attrs[f]}${unit}`}
                            </li>
                          );
                        })
                        .filter(Boolean);
                      return (
                        <div key={cid} className="border rounded p-3 bg-gray-50">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-800">
                              Cluster {parseInt(cid.replace('cluster_', ''), 10) + 1}
                            </span>
                            <span className="text-xs text-gray-600">{info?.count} customers</span>
                          </div>
                          <div className="mt-2 text-xs text-gray-700">
                            {highlights.length > 0 ? (
                              <ul className="list-disc ml-4">
                                {highlights.map(h => <li key={cid+String(h)}>{h}</li>)}
                              </ul>
                            ) : (
                              <span className="text-gray-500">No clear attribute highlight for this cluster.</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <button
                  onClick={()=> navigate('/segmentation-dashboard', { state: {segmentationId, selectedFeatures: segResult.selectedFeatures} })}
                  className="px-4 py-2 rounded border border-blue-400 text-blue-600 hover:bg-blue-50"
                >View Detail Result</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Segmentation;
