import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserSidebar from '../../components/UserSidebar';

const DataQualityReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCustomer, selectedOrder, customerReport, orderReport } = location.state || {};

  console.log('📊 Location state:', location.state);
  console.log('📊 Customer Report:', customerReport);
  console.log('📊 Order Report:', orderReport);

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
                  {trimmedLine}
                </h4>
              );
            }
            
            // Sub-items (lines starting with spaces, dashes, or bullets)
            if (trimmedLine.match(/^\s*[•\-]/) || line.match(/^\s{2,}/)) {
              const text = trimmedLine.replace(/^[\s•\-]+/, '');
              return (
                <div key={lIdx} className="flex items-start gap-2 ml-4 mb-1">
                  <span className="text-blue-500 mt-1.5 text-xs">●</span>
                  <p className="text-gray-600 flex-1 leading-relaxed">{text}</p>
                </div>
              );
            }
            
            // Regular lines
            return (
              <p key={lIdx} className="text-gray-700 mb-1.5 leading-relaxed">
                {trimmedLine}
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

    // Section titles and icons mapping
    const sectionConfig = {
      check_mandatory_columns: { title: '✓ Column Validation', icon: '📋', color: 'bg-blue-50' },
      customer_check_optional_columns: { title: '✓ Optional Fields Check', icon: '📊', color: 'bg-purple-50' },
      remove_duplicate_entries: { title: '✓ Duplicate Removal', icon: '🔄', color: 'bg-green-50' },
      deduplicate_customers: { title: '✓ Customer Deduplication', icon: '👥', color: 'bg-teal-50' },
      standardize_dob: { title: '✓ Date of Birth Processing', icon: '📅', color: 'bg-indigo-50' },
      standardize_purchase_date: { title: '✓ Purchase Date Processing', icon: '📅', color: 'bg-indigo-50' },
      handle_missing_values_customer: { title: '✓ Missing Values Handled', icon: '🔧', color: 'bg-yellow-50' },
      handle_missing_values_order: { title: '✓ Missing Values Handled', icon: '🔧', color: 'bg-yellow-50' },
      customer_detect_outliers: { title: '✓ Unusual Values Check', icon: '📈', color: 'bg-orange-50' },
      order_detect_outliers: { title: '✓ Unusual Values Check', icon: '📈', color: 'bg-orange-50' },
    };

    return (
      <div className="bg-white border-2 border-[#C3E5F1] shadow-lg rounded-lg p-6 mb-8">
        <div className="border-b-2 border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-[#2C3E50] flex items-center gap-3">
            <span className="text-3xl">{type === 'Customer' ? '👤' : '🛒'}</span>
            {type} Dataset Cleaning Report
          </h2>
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
                <p className="text-2xl font-bold text-red-500">{summary.duplicates_removed_rows}</p>
                <p className="text-xs text-gray-600 mt-1">Duplicates Removed</p>
              </div>
            )}
            {summary.rows_after_deduplication && (
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <p className="text-2xl font-bold text-blue-500">{summary.rows_after_deduplication}</p>
                <p className="text-xs text-gray-600 mt-1">After Deduplication</p>
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

          {/* Final Columns List */}
          {summary.final_columns && summary.final_columns.length > 0 && (
            <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span>📋</span> Remaining Columns After Cleaning
              </h4>
              <div className="flex flex-wrap gap-2">
                {summary.final_columns.map((col, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Messages */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-4 text-lg flex items-center gap-2">
            <span>📝</span> Detailed Cleaning Steps
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
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <UserSidebar />
      <main className="flex-grow px-4 md:px-8 pt-20 pb-20">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center text-[#2C3E50] flex items-center justify-center gap-3">
            <span className="text-5xl">📊</span>
            Data Quality Report
          </h1>

          {/* Customer Report */}
          {renderReport(customerReport, 'Customer')}

          {/* Order Report */}
          {renderReport(orderReport, 'Order')}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <button
              onClick={() => navigate('/dataset-selection')}
              className="py-3 px-8 rounded-full border-2 border-gray-400 hover:bg-gray-100 text-gray-700 font-semibold transition-all hover:shadow-md"
            >
              ← Back
            </button>
            <button
              onClick={() => navigate('/segmentation', { state: { selectedCustomer, selectedOrder } })}
              className="py-3 px-8 rounded-full text-black font-semibold transition-all border-2 border-black hover:brightness-90 hover:shadow-lg"
              style={{ backgroundColor: '#C7EDC3' }}
            >
              Proceed to Segmentation →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataQualityReport;
