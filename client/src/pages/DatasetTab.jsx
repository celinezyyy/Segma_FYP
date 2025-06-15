import React, { useState, useEffect, useContext } from 'react';
import UserSidebar from '../components/UserSidebar';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';

const DatasetTab = () => {
  const [customerDatasets, setCustomerDatasets] = useState([]);
  const [productDatasets, setProductDatasets] = useState([]);
  const [activeTab, setActiveTab] = useState('customer');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState(null);
  const { backendUrl } = useContext(AppContext);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/dataset`, { withCredentials: true });
      if (res.data.success) {
        setCustomerDatasets(res.data.customer || []);
        setProductDatasets(res.data.product || []);
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
      toast.error('Error uploading dataset. Please try again.');
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
      setProductDatasets([...productDatasets].sort(sortFunction));
    }
  };

  const handlePreview = (dataset) => {
    toast.info(`Previewing: ${dataset.originalname}`);
    // You can navigate to a preview page or open modal
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

  const datasets = activeTab === 'customer' ? customerDatasets : productDatasets;

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
            className={`px-6 py-2 border rounded-r-md ${activeTab === 'product' ? 'bg-[#C3E5F1]' : 'bg-white'} border-[#C3E5F1]`}
            onClick={() => setActiveTab('product')}
          >
            Product
          </button>
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

        {/* Dataset Table */}
        <div className="border border-[#C3E5F1] p-6 bg-white rounded-lg shadow">
          <table className="w-full text-center table-fixed">
          <thead>
            <tr className="border-b font-semibold">
              <th className="py-2 w-12">No</th>
              <th className="py-2 w-[300px]">Dataset Name</th>
              <th className="py-2 w-[200px] cursor-pointer" onClick={handleSort}>
                <div className="flex justify-center items-center gap-1">
                  <span>Date Uploaded</span>
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </div>
              </th>
              <th className="py-2 w-[180px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((dataset, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="py-2">{index + 1}</td>
                <td className="py-2 truncate text-left overflow-hidden text-ellipsis">{dataset.originalname}</td>
                <td className="py-2">{new Date(dataset.uploadedAt).toLocaleString()}</td>
                <td className="py-2">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handlePreview(dataset)}
                      className="bg-white border border-gray-400 px-3 py-1 rounded hover:bg-gray-100 text-sm"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleDelete(dataset._id)}
                      className="bg-red-100 border border-red-300 text-red-600 px-3 py-1 rounded hover:bg-red-200 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {datasets.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center text-gray-500 py-4">
                  No datasets uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

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