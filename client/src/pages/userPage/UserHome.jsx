import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';
import Navbar from '../../components/Navbar';
import UserSidebar from '../../components/UserSidebar';
import Footer from '../../components/Footer';

const UserHome = () => {
  const { backendUrl, userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [datasetCounts, setDatasetCounts] = useState({ customer: 0, order: 0 });
  const reportCount = 0; // Replace with real report count later

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/dataset/dataset-counts`, {
          withCredentials: true,
        });
        if (res.data.success) {
          setDatasetCounts(res.data.counts);
          console.log('Dataset:', res.data);
        }
      } catch (err) {
        console.error('Failed to fetch dataset counts:', err);
      }
    };

    fetchCounts();
  }, [backendUrl]);

  return (
    <div>
      <Navbar />
      <div className="flex pt-20 min-h-screen">
        <UserSidebar />
        <main className="flex-grow px-4 md:px-8">
          <h1 className="text-3xl font-bold mt-6 mb-12 text-center max-w-3xl mx-auto text-[#2C3E50]">
            Hi {userData ? userData.username : 'Business Owner'}👋 <br />Welcome to your dashboard!
          </h1>

          {/* Dataset + Report Cards */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6 space-y-6 sm:space-y-0 mb-10 max-w-5xl mx-auto w-full">
            <div className="flex-1 bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md" style={{ border: "2px solid #C3E5F1" }}>
              <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Customer Dataset</h3>
              <p className="text-4xl font-bold text-[#2C3E50]">{datasetCounts.customer}</p>
              <p className="text-gray-600 mt-1">Demographic + Geographic</p>
            </div>

            <div className="flex-1 bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md" style={{ border: "2px solid #C3E5F1" }}>
              <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Order Dataset</h3>
              <p className="text-4xl font-bold text-[#2C3E50]">{datasetCounts.order}</p>
              <p className="text-gray-600 mt-1">Behavioral Data</p>
            </div>

            <div className="flex-1 bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md" style={{ border: "2px solid #C3E5F1" }}>
              <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Report</h3>
              <p className="text-4xl font-bold text-[#2C3E50]">{reportCount}</p>
              <p className="text-gray-600 mt-1">Generated reports</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 max-w-4xl mx-auto w-full">
            {['/dataset-tab', '/dataset-selection', '/reports'].map((path, idx) => {
              const labels = ['Upload Dataset', 'Start Segmentation', 'View Reports'];
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90 min-w-[150px] text-center"
                  style={{ backgroundColor: '#C7EDC3' }}
                >
                  {labels[idx]}
                </button>
              );
            })}
          </div>

          {/* Feedback Section */}
          <div className="max-w-4xl w-full bg-white rounded-lg p-6 mb-8 shadow-md text-center mx-auto" style={{ border: "2px solid #C3E5F1", color: '#2C3E50' }}>
            <p className="mb-3 text-lg font-semibold">
              💬 We value your input! Have suggestions or issues?
            </p>
            <p className="mb-4">
              Submit your feedback to help us improve SEGMA.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/submit-feedback')}
                className="flex items-center gap-2 border border-gray-500 rounded-full px-3 py-1 sm:px-6 sm:py-2 text-sm sm:text-base text-gray-800 transition-all whitespace-nowrap hover:bg-[#C3E5F1]"
              >
                Give Feedback
              </button>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default UserHome;