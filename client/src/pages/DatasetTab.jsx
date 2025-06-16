import React, { useState, useEffect, useContext } from 'react';
import UserSidebar from '../components/UserSidebar';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

const DatasetTab = () => {
  const [customerDatasets, setCustomerDatasets] = useState([]);
  const [orderDatasets, setOrderDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState('customer');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const { backendUrl } = useContext(AppContext);
  // Add these state variables at the top
  const [previewData, setPreviewData] = useState(false);

const [previewHeaders, setPreviewHeaders] = useState([]);
const [previewRows, setPreviewRows] = useState([]);

  // const [previewData, setPreviewData] = useState(null); // for preview
  const [previewingDataset, setPreviewingDataset] = useState(null); // optional: to track which one

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
    }
  };

  const handleUploadDataset = async (e) => {
    e.preventDefault();
    if (!file) 
      return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${backendUrl}/api/dataset/upload/${activeTab}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        }
      );

      if (res.data.success) {
        fetchDatasets();
        setShowUploadModal(false);
        setFile(null);
        toast.success('Dataset uploaded successfully!');
      } else {
        toast.error('Upload failed: ' + res.data.message);
      }
    } catch (err) {
        console.error('Upload error:', err);

        const backendMsg = err?.response?.data?.message;
        if (backendMsg?.includes('Missing required columns')) {
          const missingList = backendMsg
            .replace('Missing required columns: ', '')
            .split(',')
            .map(col => `<li>${col.trim()}</li>`)
            .join('');

          Swal.fire({
            icon: 'error',
            title: 'Upload Failed',
            html: `
              <p><b>Please upload correct dataset format.</b><br>
              The following required columns are missing:</p>
              <ul style="text-align:center; list-style: none; padding: 0;">
                ${missingList}
              </ul>`,
            confirmButtonText: 'Fix Dataset',
            confirmButtonColor: '#3b82f6',
          });

        }
      }
  };

  const handleSort = () => {
    const direction = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(direction);

    const sortFunction = (a, b) => {
      const aDate = new Date(a.uploadedAt);
      const bDate = new Date(b.uploadedAt);
      return direction === 'asc' ? aDate - bDate : bDate - aDate;
    };

    if (activeTab === 'customer') {
      setCustomerDatasets([...customerDatasets].sort(sortFunction));
    } else {
      setOrderDatasets([...orderDatasets].sort(sortFunction));
    }
  };

  const handlePreview = async (datasetId) => {
    try {
      const res = await axios.get(`${backendUrl}/api/dataset/preview/${datasetId}`, {
        withCredentials: true
      });
      console.log("Previewing dataset ID:", datasetId);
      
      const data = res.data.preview || [];

      if (data.length === 0) {
        setPreviewHeaders([]);
        setPreviewRows([]);
        return;
      }

      const headers = Object.keys(data[0]);
      const rows = data.map((row) => headers.map((h) => row[h]));

      // Find the full dataset object for modal title display
      const allDatasets = [...customerDatasets, ...orderDatasets];
      const matchedDataset = allDatasets.find((d) => d._id === datasetId);

      setPreviewHeaders(headers);
      setPreviewRows(rows);
      setPreviewingDataset(matchedDataset);
      setPreviewData(true);
    } catch (err) {
      console.error('Preview error:', err);
      toast.error('Error previewing dataset');
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure you want to delete this dataset?',
      text: 'This action cannot be undone and the file will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f87171',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const res = await axios.delete(`${backendUrl}/api/dataset/delete-dataset/${id}`, { withCredentials: true });

        if (res.data.success) {
          toast.success('Dataset deleted successfully!');
          fetchDatasets();
        } else {
          toast.error(res.data.message);
        }
      } catch (err) {
        console.error(err);
        toast.error('Error deleting dataset.');
      }
    }
  };

  const datasets = activeTab === 'customer' ? customerDatasets : orderDatasets;

  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-grow px-4 md:px-8 pt-20 pb-20 min-h-[calc(100vh-5rem)] relative">
        <h1 className="text-2xl font-bold mb-6 text-center text-[#2C3E50]">📁 Dataset</h1>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
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
        {/* Download Template */}
        <div className="flex justify-center mb-4">
          <a
            href={
              activeTab === 'customer'
                ? '/template/customer_data_template.csv'
                : '/template/order_data_template.csv'
            }
            download
            className="inline-block bg-[#F1F8E9] border border-green-400 text-green-700 font-medium py-2 px-4 rounded hover:bg-[#E6F4D7] transition"
          >
            Download {activeTab === 'customer' ? 'Customer' : 'Order'} Dataset Template
          </a>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl relative">
              <button
                className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl font-bold"
                onClick={() => setShowUploadModal(false)}
              >
                &times;
              </button>

              <h2 className="text-xl font-semibold mb-4 text-[#2C3E50]">Upload Dataset</h2>

              <form
                onSubmit={handleUploadDataset}
                className="flex flex-col gap-4"
                encType="multipart/form-data"
              >
                <input
                  type="file"
                  name="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="border p-2 rounded"
                  required
                />
                <button
                  type="submit"
                  className="self-center py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90"
                  style={{ backgroundColor: '#C7EDC3' }}
                >
                  Upload
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-x-auto bg-white shadow-lg rounded-lg border-2 border-[#C3E5F1] w-full">
          <table className="min-w-full text-left text-[#2C3E50]">
            <thead className="bg-[#C3E5F1] text-sm uppercase">
              <tr>
                <th className="py-3 px-6 w-12">No.</th>
                <th className="py-3 px-6">Dataset Name</th>
                <th className="py-3 px-6 cursor-pointer" onClick={handleSort}>
                  <div className="flex items-center gap-1">
                    <span>Date Uploaded</span>
                    {sortDirection === 'asc' ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-gray-500">
                    No datasets uploaded yet.
                  </td>
                </tr>
              ) : (
                datasets.map((dataset, index) => (
                  <tr key={dataset._id} className="border-t hover:bg-gray-50 transition">
                    <td className="py-3 px-6 text-gray-600">{index + 1}</td>
                    <td className="py-3 px-6 truncate max-w-xs">{dataset.originalname}</td>
                    <td className="py-3 px-6">{new Date(dataset.uploadedAt).toLocaleString()}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handlePreview(dataset._id)}
                          className="text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition text-sm"
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => handleDelete(dataset._id)}
                          className="text-red-600 border border-red-600 px-3 py-1 rounded hover:bg-red-50 transition text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Preview Modal */}
        {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto shadow-xl relative">
            <button
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl font-bold"
              onClick={() => {
                setPreviewData(null);
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

        {/* Fixed Upload Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setShowUploadModal(true)}
            className="py-2.5 px-6 rounded-full text-black font-semibold border border-black hover:brightness-90"
            style={{ backgroundColor: '#C7EDC3' }}
          >
            + Upload Dataset
          </button>
        </div>
      </main>
    </div>
  );
};

export default DatasetTab;