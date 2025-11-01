import React, { useState, useEffect, useContext } from 'react';
import UserSidebar from '../../components/UserSidebar';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const DatasetSelection = () => {
  const [customerDatasets, setCustomerDatasets] = useState([]);
  const [orderDatasets, setOrderDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState('customer');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewData, setPreviewData] = useState(false);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewingDataset, setPreviewingDataset] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/dataset`, { withCredentials: true });
      if (res.data.success) {
        setCustomerDatasets(res.data.customer || []);
        setOrderDatasets(res.data.order || []);
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
      Swal.fire({ 
        icon: 'error', 
        text: 'Failed to fetch datasets', 
        showConfirmButton: false,
        timer: 2000 
      });
    }
  };

  const handlePreview = async (datasetId) => {
    try {
      const res = await axios.get(`${backendUrl}/api/dataset/preview/${datasetId}`, {
        withCredentials: true
      });
      const data = res.data.preview || [];

      if (data.length === 0) {
        setPreviewHeaders([]);
        setPreviewRows([]);
        return;
      }

      const headers = Object.keys(data[0]);
      const rows = data.map((row) => headers.map((h) => row[h]));
      const allDatasets = [...customerDatasets, ...orderDatasets];
      const matchedDataset = allDatasets.find((d) => d._id === datasetId);

      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setPreviewingDataset(matchedDataset);
      setPreviewData(true);
    } catch (err) {
      console.error('Preview error:', err);
      Swal.fire({ 
        icon: 'error', 
        text: 'Error previewing dataset', 
        showConfirmButton: false,
        timer: 2000 
      });
    }
  };

  const handleConfirmSelection = async () => {
    if (!selectedCustomer || !selectedOrder) {
      Swal.fire({
        icon: 'warning',
        title: 'Selection Required',
        text: 'Please select one Customer and one Order dataset.'
      });
      return;
    }

    navigate('/confirm-selected-dataset', {
      state: { selectedCustomer, selectedOrder },
    });
  };

  const allDatasets = activeTab === 'customer' ? customerDatasets : orderDatasets;
  const filteredDatasets = allDatasets.filter((d) =>
    d.originalname.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedId = activeTab === 'customer' ? selectedCustomer : selectedOrder;
  const setSelected = activeTab === 'customer' ? setSelectedCustomer : setSelectedOrder;

  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-grow px-4 md:px-8 pt-20 pb-20 min-h-[calc(100vh-5rem)]">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#2C3E50]">Select Dataset</h1>

        <div className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            {/* Left: Tabs */}
            <div className="flex flex-col gap-1">
              <div className="inline-flex">
                <button
                  className={`px-6 py-2 border rounded-l-md ${activeTab === 'customer' ? 'bg-[#C3E5F1]' : 'bg-white'} border-[#C3E5F1]`}
                  onClick={() => setActiveTab('customer')}
                >
                  Customer
                </button>
                <button
                  className={`px-6 py-2 border rounded-r-md ${activeTab === 'order' ? 'bg-[#C3E5F1]' : 'bg-white'} border-[#C3E5F1]`}
                  onClick={() => setActiveTab('order')}
                >
                  Orders
                </button>
              </div>
              <p className="text-red-600 text-sm italic">
                * Only one dataset can be selected
              </p>
            </div>

            {/* Right: Search */}
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 px-4 py-2 rounded-md w-full sm:w-64 focus:outline-none focus:ring focus:border-blue-300"
            />
          </div>
        </div>

        {/* Dataset Table */}
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg border-2 border-[#C3E5F1] w-full">
          <table className="min-w-full text-left text-[#2C3E50]">
            <thead className="bg-[#C3E5F1] text-sm uppercase">
              <tr>
                <th className="py-3 px-4 w-12">Select</th>
                <th className="py-3 px-6">Dataset Name</th>
                <th className="py-3 px-6">Date Uploaded</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDatasets.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-gray-500">
                    No datasets found.
                  </td>
                </tr>
              ) : (
                filteredDatasets.map((dataset) => (
                  <tr key={dataset._id} className="border-t hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedId === dataset._id}
                        onChange={() => setSelected(dataset._id)}
                      />
                    </td>
                    <td className="py-3 px-6 truncate max-w-xs">{dataset.originalname}</td>
                    <td className="py-3 px-6">{new Date(dataset.uploadedAt).toLocaleString()}</td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => handlePreview(dataset._id)}
                        className="text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition text-sm"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Confirm Buttons */}
        <div className="flex justify-center mt-8">
          {activeTab === 'customer' ? (
            <button
              onClick={() => {
                if (!selectedCustomer) {
                  Swal.fire({
                    icon: 'warning',
                    title: 'Selection Required',
                    text: 'Please select one Customer dataset before proceeding.'
                  });
                } else {
                  setActiveTab('order');
                  setSearchQuery('');
                }
              }}
              className="py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90"
              style={{ backgroundColor: '#C7EDC3' }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleConfirmSelection}
              className="py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90"
              style={{ backgroundColor: '#C7EDC3' }}
            >
              Confirm Selection
            </button>
          )}
        </div>

        {/* Preview Modal */}
        {previewData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto shadow-xl relative">
              <button
                className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl font-bold"
                onClick={() => {
                  setPreviewData(false);
                  setPreviewHeaders([]);
                  setPreviewRows([]);
                  setPreviewingDataset(null);
                }}
              >
                &times;
              </button>
              <h2 className="text-lg font-semibold mb-4 text-[#2C3E50]">
                Preview: {previewingDataset?.originalname}
              </h2>
              <p className="text-sm text-gray-500 mb-4 italic">
                (Only the first 100 rows are shown in this preview)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {previewHeaders.map((header, index) => (
                        <th key={index} className="px-2 py-1 border">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-2 py-1 border">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DatasetSelection;
