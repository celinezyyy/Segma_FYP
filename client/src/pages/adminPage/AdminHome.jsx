import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import AdminSidebar from '../../components/AdminSidebar';
import axios from 'axios';
import Swal from 'sweetalert2';

const UserHome = () => {
  const { userData, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    users: 0,
    feedback: 0,
    resolved: 0
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/admin/home-cards-info`);
        if (res.data.success) {
          setMetrics(res.data.metrics);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: res.data.message || 'Failed to fetch metrics',
          });
        }
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response?.data?.message || 'Error loading dashboard data',
        });
      }
    };
    fetchMetrics();
  }, [backendUrl]);
  
  const [selectedFiles, setSelectedFiles] = useState({
    customer: null,
    order: null,
  });

  const handleFileUpload = (e, type) => {
    setSelectedFiles((prev) => ({ ...prev, [type]: e.target.files[0] }));
  };

  const uploadTemplate = async (type) => {
    if (!selectedFiles[type]) 
      return;

    const formData = new FormData();
    formData.append('file', selectedFiles[type]);

    try {
      const res = await axios.post(`${backendUrl}/api/admin/upload-dataset-template/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Uploaded!',
          text: `${type} dataset template uploaded successfully.`,
        });
        setSelectedFiles((prev) => ({ ...prev, [type]: null }));
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: res.data.message || 'Upload failed.',
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Server error while uploading.',
      });
    }
  };

  return (
    <div>
      {/* Navbar and Sidebar outside main content */}
      <Navbar />
      <div className="flex pt-20 min-h-screen">
        <AdminSidebar />
        {/* Main content area grows to fill the space */}
        <main className="flex-grow px-4 md:px-8">
        {/* Greeting */}
        <h1 className="text-3xl font-bold mt-6 mb-12 text-center max-w-3xl mx-auto text-[#2C3E50]">
          Hi {userData ? userData.username : 'Admin'} 👋 <br />Welcome to your admin dashboard!
        </h1>

        {/* Admin Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 max-w-6xl mx-auto w-full">
          {/* Total Users */}
          <div className="bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md border-2 border-[#C3E5F1]">
            <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Users</h3>
            <p className="text-4xl font-bold text-[#2C3E50]">{metrics.users}</p> {/* Replace with real data */}
            <p className="text-gray-600 mt-1">Registered Users</p>
          </div>

          {/* Total Feedback */}
          <div className="bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md border-2 border-[#C3E5F1]">
            <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Feedback</h3>
            <p className="text-4xl font-bold text-[#2C3E50]">{metrics.feedback}</p> {/* Replace with real data */}
            <p className="text-gray-600 mt-1">Total Feedback Submitted</p>
          </div>

          {/* Feedback Resolved */}
          <div className="bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md border-2 border-[#C3E5F1]">
            <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Resolved</h3>
            <p className="text-4xl font-bold text-[#2C3E50]">{metrics.resolved}</p> {/* Replace with real data */}
            <p className="text-gray-600 mt-1">Feedback Resolved</p>
          </div>
        </div>

        {/* Optional Feedback Button */}
        <div className="flex justify-center mb-12">
          <button
            onClick={() => navigate('/admin-feedback-list')}
            className="py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90"
            style={{ backgroundColor: '#C3E5F1' }}
          >
            Manage Feedback
          </button>
        </div>

        {/* Dataset Template Upload Section */}
        <div className="max-w-4xl mx-auto bg-white shadow-md rounded-lg p-8 border-2 border-[#C3E5F1] mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center text-[#2C3E50]">
            Dataset Template Management
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Upload the latest dataset template. Each type only keeps <b>one active template</b>. Uploading a new one will replace the old.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Dataset Template */}
            <div className="flex flex-col items-center justify-center border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-[#2C3E50]">Customer Dataset Template</h3>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => handleFileUpload(e, 'customer')}
                className="mb-4"
              />
              <button
                onClick={() => uploadTemplate('customer')}
                disabled={!selectedFiles.customer}
                className="py-2 px-4 rounded-lg bg-[#C3E5F1] text-black font-semibold border border-black hover:brightness-90 disabled:opacity-50"
              >
                Upload
              </button>
            </div>

            {/* Order Dataset Template */}
            <div className="flex flex-col items-center justify-center border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-[#2C3E50]">Order Dataset Template</h3>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => handleFileUpload(e, 'order')}
                className="mb-4"
              />
              <button
                onClick={() => uploadTemplate('order')}
                disabled={!selectedFiles.order}
                className="py-2 px-4 rounded-lg bg-[#C3E5F1] text-black font-semibold border border-black hover:brightness-90 disabled:opacity-50"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      </main>
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default UserHome;
