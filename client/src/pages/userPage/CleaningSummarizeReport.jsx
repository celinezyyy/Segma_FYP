import React, { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserSidebar from '../../components/UserSidebar';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const DataQualityReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  const { selectedCustomer, selectedOrder, customerReport, orderReport } = location.state || {};
  const [activeTab, setActiveTab] = React.useState('customer');

  console.log('📊 Location state:', location.state);
  console.log('📊 Customer Report:', customerReport);
  console.log('📊 Order Report:', orderReport);

  const handleDownload = async (datasetId, datasetName, type) => {
    try {
      console.log('Downloading:', `${backendUrl}/api/dataset/download/${datasetId}`);
      
      const response = await axios.get(`${backendUrl}/api/dataset/download/${datasetId}`, {
        withCredentials: true,
        responseType: 'blob' // Important for file download
      });

      console.log('Download response:', response);

      // Check if response is an error (sometimes API returns JSON error as blob)
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Download failed');
      }

      // Create a blob from the response
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = datasetName || `cleaned_${type}_dataset.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: 'success',
        title: 'Download Started',
        text: `Your cleaned ${type} dataset is being downloaded.`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Download error:', error);
      console.error('Error response:', error.response);
      
      let errorMessage = 'Failed to download the dataset. Please try again.';
      
      // Try to extract error message from blob response
      if (error.response && error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing blob:', e);
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: errorMessage,
      });
    }
  };

  if (!customerReport || !orderReport) {
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        No report data found.
      </div>
    );
  }

  // Helper function to render messages with better visual structure
  const formatMessage = (message) => {
    if (!message) return null;

    // Render **bold** segments inside a line
    const renderStyledText = (text) => {
      const parts = [];
      let lastIndex = 0;
      const regex = /\*\*(.+?)\*\*/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
        parts.push(<span className="font-semibold" key={`b-${match.index}`}>{match[1]}</span>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) parts.push(text.slice(lastIndex));
      return parts;
    };

    // Split by double newlines for paragraphs
    const paragraphs = message.split('\n\n');
    
    return paragraphs.map((paragraph, pIdx) => {
      const lines = paragraph.split('\n').filter(line => line.trim());
      
      // Check if this paragraph is a title (contains key phrases)
      const firstLine = lines[0]?.trim() || '';
      const isWarning = firstLine.includes('⚠️') || firstLine.includes('WARNING') || firstLine.includes('🔴');
      const isSuccess = firstLine.includes('✅');
      const isTitle = firstLine.includes('Summary:') || 
                      firstLine.includes('Detected:') || 
                      firstLine.includes('Look Good:') ||
                      firstLine.includes('Removed:') ||
                      firstLine.includes('Calculated:') ||
                      firstLine.includes('Details:') ||
                      firstLine.includes('Note:') ||
                      firstLine.includes('Impact:') ||
                      firstLine.includes('STRONGLY RECOMMENDED:') ||
                      firstLine.includes('RECOMMENDED:') ||
                      firstLine.includes('What we did:') ||
                      firstLine.includes('How Missing Values') ||
                      firstLine.includes('Data Completeness:') ||
                      firstLine.includes('Missing Data');
      
      // Special handling for separator lines (===)
      if (firstLine.match(/^={3,}$/)) {
        return <div key={pIdx} className="border-t-2 border-orange-300 my-2"></div>;
      }
      
      return (
        <div key={pIdx} className="mb-4">
          {lines.map((line, lIdx) => {
            const trimmedLine = line.trim();
            
            // First line and it's a title
            if (lIdx === 0 && (isTitle || isWarning || isSuccess)) {
              let colorClass = 'text-gray-800';
              if (isWarning) colorClass = 'text-red-700';
              if (isSuccess) colorClass = 'text-green-700';
              
              return (
                <h4 key={lIdx} className={`font-semibold ${colorClass} text-base mb-2`}>
                  {renderStyledText(trimmedLine)}
                </h4>
              );
            }
            
            // Sub-items (lines starting with spaces, dashes, or bullets)
            if (trimmedLine.match(/^\s*[•\-]/) || line.match(/^\s{2,}/)) {
              const text = trimmedLine.replace(/^[\s•\-]+/, '');
              return (
                <div key={lIdx} className="flex items-start gap-2 ml-4 mb-1">
                  <span className="text-blue-500 mt-1.5 text-xs">●</span>
                  <p className="text-gray-600 flex-1 leading-relaxed">{renderStyledText(text)}</p>
                </div>
              );
            }
            
            // Regular lines
            return (
              <p key={lIdx} className="text-gray-700 mb-1.5 leading-relaxed">
                {renderStyledText(trimmedLine)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  const renderReportSection = (title, message, icon, bgColor) => {
    if (!message) return null;

    return (
      <div className={`${bgColor} border-l-4 border-blue-400 rounded-lg p-5 mb-4 shadow-sm`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
        </div>
        <div className="pl-8">
          {formatMessage(message)}
        </div>
      </div>
    );
  };

  const renderReport = (report, type) => {
    if (!report) return <p className="italic text-gray-500">No report available.</p>;

    const { summary, detailed_messages } = report;
    const [showDetails, setShowDetails] = React.useState(false);
    
    // Determine dataset ID and name for download
    const datasetId = type === 'Customer' ? selectedCustomer : selectedOrder;

    // Section titles and icons mapping
    const sectionConfig = {
      check_mandatory_columns: { title: '✓ Column Validation', icon: '📋', color: 'bg-blue-50' },
      customer_check_optional_columns: { title: '✓ Optional Fields Check', icon: '📊', color: 'bg-purple-50' },
      remove_duplicate_entries: { title: '✓ Duplicate Removal', icon: '🔄', color: 'bg-green-50' },
      standardize_dob: { title: '✓ Date of Birth Processing', icon: '📅', color: 'bg-indigo-50' },
      standardize_purchase_date: { title: '✓ Purchase Date Processing', icon: '📅', color: 'bg-indigo-50' },
      handle_missing_values_customer: { title: '✓ Missing Values Handled', icon: '🔧', color: 'bg-yellow-50' },
      handle_missing_values_order: { title: '✓ Missing Values Handled', icon: '🔧', color: 'bg-yellow-50' },
      customer_detect_outliers: { title: '✓ Unusual Values Check', icon: '📈', color: 'bg-orange-50' },
      order_detect_outliers: { title: '✓ Unusual Values Check', icon: '📈', color: 'bg-orange-50' },
    };

    return (
      <div className="bg-white border-2 border-[#C3E5F1] shadow-lg rounded-lg p-6 mb-8">
        <div className="border-b-2 border-gray-200 pb-4 mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#2C3E50] flex items-center gap-3">
            <span className="text-3xl">{type === 'Customer' ? '👤' : '🛒'}</span>
            {type} Dataset Checking Report
          </h2>
          <button
            onClick={() => handleDownload(datasetId, `cleaned_${type.toLowerCase()}_data.csv`, type)}
            className="inline-block bg-[#F1F8E9] border border-green-400 text-green-700 font-medium py-2 px-4 rounded hover:bg-[#E6F4D7] transition"
          >
            Download Cleaned Data
          </button>
        </div>

        {/* Summary Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3 text-lg flex items-center gap-2">
            <span>📊</span> Summary Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summary.initial_rows !== undefined && (
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-gray-700">{summary.initial_rows}</p>
                <p className="text-xs text-gray-600 mt-1">Initial Rows</p>
              </div>
            )}
            {summary.duplicates_removed_rows !== undefined && (
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-red-500">{summary.duplicates_removed_rows + (summary.initial_rows-summary.rows_after_deduplication - summary.duplicates_removed_rows)}</p>
                <p className="text-xs text-gray-600 mt-1">Duplicates Removed</p>
              </div>
            )}
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-green-500">{summary.total_rows_final}</p>
              <p className="text-xs text-gray-600 mt-1">Final Row Count</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-purple-500">{summary.total_columns_final}</p>
              <p className="text-xs text-gray-600 mt-1">Total Columns</p>
            </div>
          </div>
        </div>

        {/* User-facing note and optional technical details */}
        <div className="mt-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
            <p className="text-sm text-yellow-900">
              You can view how your data was prepared and checked in more detail below.
            </p>
          </div>
          <button
            onClick={() => setShowDetails(prev => !prev)}
            className="inline-block bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded hover:bg-gray-50 transition"
          >
           {showDetails ? 'Hide Data Checking Details' : 'View Data Checking Details'}
          </button>

          {showDetails && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-800 mb-4 text-lg flex items-center gap-2">
                <span>📝</span> Detailed Data Checking Steps
              </h3>
              {Object.entries(detailed_messages).map(([key, msg]) => {
                if (!msg) return null;
                const config = sectionConfig[key] || { 
                  title: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
                  icon: '✓', 
                  color: 'bg-gray-50' 
                };
                return renderReportSection(config.title, msg, config.icon, config.color);
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserSidebar />
      <main className="flex-grow px-4 md:px-8 pt-20 pb-20">
        <div className="max-w-full mx-auto">
          <h1 className="text-2xl font-bold mb-5 text-center text-[#2C3E50] flex items-center justify-center gap-3">
            Data Checking Report
          </h1>

          {/* Tab Navigation */}
          <div className="mb-6 flex justify-center">
            <div className="flex border-2 border-[#C3E5F1] rounded-lg overflow-hidden shadow-sm">
              <button
                className={`px-8 py-2 font-semibold transition-all ${
                  activeTab === 'customer' 
                    ? 'bg-[#C3E5F1] text-[#2C3E50]' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('customer')}
              >
                👤 Customer Report
              </button>
              <button
                className={`px-8 py-2 font-semibold transition-all border-l-2 border-[#C3E5F1] ${
                  activeTab === 'order' 
                    ? 'bg-[#C3E5F1] text-[#2C3E50]' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('order')}
              >
                🛒 Order Report
              </button>
            </div>
          </div>

          {/* Report Content Based on Active Tab */}
          {activeTab === 'customer' && renderReport(customerReport, 'Customer')}
          {activeTab === 'order' && renderReport(orderReport, 'Order')}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => navigate('/dataset-selection')}
              className="py-2.5 px-6 rounded-full border border-gray-400 hover:bg-gray-100 text-gray-700 font-semibold transition-all hover:shadow-md"
            >
              ← Back
            </button>
            <button
              onClick={() => navigate('/segmentation', { state: { selectedCustomer, selectedOrder } })}
              className="self-center py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90"
                  style={{ backgroundColor: '#C7EDC3' }}
            >
              Proceed to Segmentation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataQualityReport;
