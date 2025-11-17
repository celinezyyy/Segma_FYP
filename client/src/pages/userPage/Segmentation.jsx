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
  const [mergedData, setMergedData] = useState(null);
  const [availableAttributes, setAvailableAttributes] = useState(null);
  const [summary, setSummary] = useState(null);
  const [downloading, setDownloading] = useState(false);

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
      console.log('Fetching and merging data...');
      console.log('Customer ID:', selectedCustomer);
      console.log('Order ID:', selectedOrder);

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

      console.log('Merge response:', response.data);

      if (response.data.success) {
        setMergedData(response.data.data.customerProfiles);
        setAvailableAttributes(response.data.data.availableAttributes);
        setSummary(response.data.data.summary);

        Swal.fire({
          icon: 'success',
          title: 'Data Prepared!',
          text: `Successfully merged ${response.data.data.summary.totalCustomers} customer profiles.`,
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

  // Generate CSV from existing mergedData 
  const handleDownloadMerged = () => {
    try {
      setDownloading(true);
      
      if (!mergedData || mergedData.length === 0) {
        throw new Error('No data available to download, server returned empty dataset.');
      }

      // Convert mergedData to CSV
      const csv = convertToCSV(mergedData);
      
      // Create blob and download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }); // \ufeff = BOM for Excel
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dt = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `merged_customer_profiles_${dt}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      Swal.fire({
        icon: 'success',
        title: 'Download Complete',
        text: `Downloaded ${mergedData.length} customer profiles`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error('Download failed', e);
      Swal.fire({ 
        icon: 'error', 
        title: 'Download failed', 
        text: e?.message || 'Unable to download merged CSV.' 
      });
    } finally {
      setDownloading(false);
    }
  };

  // Helper: Convert array of objects to CSV string
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    // Get all unique column names
    const columns = Array.from(
      new Set(data.flatMap(row => Object.keys(row)))
    );
    
    // Escape CSV values
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    
    // Create header row
    const header = columns.join(',');
    
    // Create data rows
    const rows = data.map(row => 
      columns.map(col => escapeCSV(row[col])).join(',')
    );
    
    return [header, ...rows].join('\n');
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
                    onClick={handleDownloadMerged}
                    disabled={downloading}
                    className={`inline-block border border-green-400 text-green-700 font-medium py-2 px-4 rounded transition
                    ${downloading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#F1F8E9] hover:bg-[#E6F4D7]'}
                    `}
                >
                    {downloading ? 'Preparing CSV…' : (<>Download merged dataset</>)}
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

          {/* Available Attributes Info */}
          {availableAttributes && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Available Attributes for Segmentation</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Behavioral */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-3 flex items-center gap-2">
                    <span>📊</span> Behavioral
                  </h3>
                  <ul className="space-y-2">
                    {availableAttributes.behavioral.map((attr) => (
                      <li key={attr.value} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${attr.available ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className={attr.available ? 'text-gray-700' : 'text-gray-400'}>{attr.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Demographic */}
                <div>
                  <h3 className="text-lg font-semibold text-purple-600 mb-3 flex items-center gap-2">
                    <span>👥</span> Demographic
                  </h3>
                  <ul className="space-y-2">
                    {availableAttributes.demographic.map((attr) => (
                      <li key={attr.value} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${attr.available ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className={attr.available ? 'text-gray-700' : 'text-gray-400'}>{attr.label}</span>
                        {!attr.available && <span className="text-xs text-gray-400">(not provided)</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Geographic */}
                <div>
                  <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
                    <span>🌍</span> Geographic
                  </h3>
                  <ul className="space-y-2">
                    {availableAttributes.geographic.map((attr) => (
                      <li key={attr.value} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${attr.available ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className={attr.available ? 'text-gray-700' : 'text-gray-400'}>{attr.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Optional Fields Warning */}
              {(!summary?.hasAgeData || !summary?.hasGenderData) && (
                <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <span className="font-medium">Note:</span> Some demographic attributes are not available because they were not provided in the customer dataset.
                        {!summary?.hasAgeData && <span className="block">• Age and Age Group data is missing</span>}
                        {!summary?.hasGenderData && <span className="block">• Gender data is missing</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Data Preview - removed per stakeholder request */}

          {/* Next Steps - Coming Soon */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3">🚀 Next Steps</h2>
            <p className="text-gray-700 mb-4">
              Data merging and aggregation is complete! The following features will be implemented next:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span className="text-gray-700">Select 2 attributes for segmentation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span className="text-gray-700">Choose from pre-defined segmentation models (RFM, Demographic, Geographic-Behavioral)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span className="text-gray-700">Visualize customer segments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span className="text-gray-700">Download segment results</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Segmentation;
