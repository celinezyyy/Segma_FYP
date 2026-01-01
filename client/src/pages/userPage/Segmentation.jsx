import React, { useState, useEffect, useContext, useRef } from 'react';
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
  const [segLoading, setSegLoading] = useState(false);
  const [segResult, setSegResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const resultRef = useRef(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

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
          return; // skip fetch & merge
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
        // Persist cache to avoid re-prepare on return visits
        try {
          localStorage.setItem('segmentationCache', JSON.stringify({
            segmentationId: response.data.segmentationId || null,
            summary: response.data.summary || null,
            customerDatasetId: selectedCustomer,
            orderDatasetId: selectedOrder,
            cachedAt: Date.now(),
          }));
        } catch (_) {}
        // Fetch merged columns for custom selection
        // if (response.data.segmentationId) {
        //   try {
        //     const colsResp = await axios.get(`${backendUrl}/api/segmentation/${response.data.segmentationId}/columns`, { withCredentials: true });
        //     if (colsResp.data?.success && Array.isArray(colsResp.data.columns)) {
        //       console.log('[DEBUG] Merged columns:', colsResp.data.columns);
        //     }
        //   } catch (e) {
        //     console.warn('Unable to fetch merged columns', e?.message);
        //   }
        // }
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

    // Always use RFM features for segmentation
    const features = ['recency', 'frequency', 'monetary'];
    console.log('[DEBUG] Running segmentation with RFM features:', features);
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
        // Show success popup briefly before redirecting
        await Swal.fire({
          icon: 'success',
          title: 'Segmentation Complete',
          text: `${data.bestK} clusters found! Redirecting to dashboard...`,
          timer: 2000,
          showConfirmButton: false,
        });

        // Navigate directly to segmentation dashboard with context
        navigate('/segmentation-dashboard', {
          state: {
            segmentationId,
            selectedFeatures: features,
          },
        });
        return;
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
          <div className="p-4 mb-4">
            <div className="grid grid-cols-3 items-center mb-3 gap-3">
              <h1 className="text-2xl font-bold text-gray-800 text-center col-start-2">Customer Segmentation</h1>
              <button
                onClick={DownloadMergedDataset}
                disabled={downloading}
                className={`justify-self-end inline-block border border-green-400 text-green-700 font-medium py-2 px-4 rounded transition ${downloading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#F1F8E9] hover:bg-[#E6F4D7]'}`}
              >
                Download merged dataset
              </button>
            </div>
            <hr className="border-gray-200" />
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
          <p className="text-lg text-gray-700 mb-4">
            We will use RFM (Recency, Frequency, Monetary) analysis to group your customers based on their purchasing behavior. Later on you will be able to look the details segmentation results on dsahboard!
          </p>
          <div className="mt-2 flex gap-3 items-center">
              {/* Compact help link */}
              <button
                onClick={() => setShowHelpModal(true)}
                className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm"
              >
                <span className="inline-block w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">i</span>
                What is RFM?
              </button>
          </div>

          {/* RFM Segmentation Only */}
          <div className="bg-white border-2 border-[#C3E5F1] shadow-2xl rounded-lg p-6 mb-8 mt-8 text-center max-w-3xl mx-auto">

            <div className="border-b-2 border-gray-200 pb-4 mb-6">
              <h2 className="text-2xl font-bold text-[#2C3E50]">Ready to group your customers?</h2>
            </div>
            <p className="text-lg text-gray-700 mt-2">
              We’ll apply RFM and present easy-to-understand groups with insights and suggested next steps.
            </p>
            {errorMsg && <p className="text-red-600 text-sm mt-3">{errorMsg}</p>}

            <div className="mt-8 flex items-center justify-center">
              <button
                onClick={handleRunSegmentation}
                disabled={segLoading || !segmentationId}
                className="self-center py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90"
                style={{ backgroundColor: '#C7EDC3' }}
              >Group My Customers</button>
            </div>
          </div>
        </div>

          {/* Help Modal: What is RFM? */}
          {showHelpModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" onClick={() => setShowHelpModal(false)}></div>
              <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-800">What is RFM?</h3>
                  <button onClick={() => setShowHelpModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <p className="text-gray-700 mb-4">
                  RFM groups customers by how <span className="font-semibold">recently</span> they bought, how <span className="font-semibold">often</span> they buy, and how much <span className="font-semibold">money</span> they spend.
                  It’s a friendly way to spot VIPs, loyal fans, and customers who may be at risk of leaving.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600">Recency</p>
                    <p className="font-semibold text-blue-700">Days since last purchase</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600">Frequency</p>
                    <p className="font-semibold text-blue-700">Orders per month</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600">Monetary</p>
                    <p className="font-semibold text-blue-700">Total spend (MYR)</p>
                  </div>
                </div>
                <ul className="list-disc pl-6 text-gray-700 mb-4">
                  <li>See groups like VIPs, Loyal, Potential Loyal, and At Risk</li>
                  <li>Get simple, actionable tips for each group</li>
                  <li>Track spend and order trends by group</li>
                </ul>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Segmentation;
