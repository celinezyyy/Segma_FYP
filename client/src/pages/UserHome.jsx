import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const UserHome = () => {
  
  const { userData } = useContext(AppContent);
  const navigate = useNavigate();

  const datasetCount = 42;  // Replace with real data
  const reportCount = 17;   // Replace with real data

  return (
    <div className="flex flex-col items-center min-h-screen pt-24 px-4 sm:px-0 ">
      {/* Header */}
      <Navbar />
      <Sidebar />
      {/* Greeting */}
      <h1 className="text-3xl font-bold mt-6 mb-12 text-center max-w-3xl text-[#2C3E50]">
        Hi {userData ? userData.username : 'Business Owner'}👋 <br />Welcome to your dashboard!
      </h1>

      {/* Cards */}
      <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-6 sm:space-y-0 mb-10 max-w-4xl w-full">
        <div
          className="flex-1 bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md"
          style={{ border: "2px solid #C3E5F1" }}
        >
          <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Dataset</h3>
          <p className="text-4xl font-bold text-[#2C3E50]">{datasetCount}</p>
          <p className="text-gray-600 mt-1">Uploaded data entries</p>
        </div>

        <div
          className="flex-1 bg-white rounded-lg p-6 flex flex-col items-center justify-center shadow-md"
          style={{ border: "2px solid #C3E5F1" }}
        >
          <h3 className="text-xl font-semibold mb-2 text-[#2C3E50]">Report</h3>
          <p className="text-4xl font-bold text-[#2C3E50]">{reportCount}</p>
          <p className="text-gray-600 mt-1">Generated reports</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 max-w-4xl w-full">
        {['/dataset-tab', '/start-segmentation', '/view-report'].map((path, idx) => {
          const labels = ['Upload Dataset', 'Start Segmentation', 'View Reports'];
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="px-6 py-3 rounded-md font-semibold transition-colors bg-[#C7EDC3] text-black border-2 border-black min-w-[150px] text-center hover:bg-black hover:text-[#C7EDC3]"
            >
              {labels[idx]}
            </button>
          );
        })}
      </div>


        {/* Feedback Section */}
      <section
        className="max-w-4xl w-full bg-white rounded-lg p-6 mb-8 shadow-md text-center"
        style={{ border: "2px solid #C3E5F1", color: '#2C3E50' }}
      >
        <p className="mb-3 text-lg font-semibold">
          💬 We value your input! Have suggestions or issues?
        </p>
        <p className="mb-4">
          Submit your feedback to help us improve SEGMA.
        </p>
        <button
          onClick={() => navigate('/feedback')}
          className="px-6 py-2 rounded-full font-semibold border border-[#2C3E50] text-[#2C3E50] hover:bg-[#2C3E50] hover:text-white transition-all"
        >
          Give Feedback
        </button>
      </section>

      {/* Footer */}
      <footer
        className="text-center text-gray-600 text-sm py-4 w-full border-t border-gray-300 bg-gray-300"
      >
        &copy; {new Date().getFullYear()} Your Company. All rights reserved.
      </footer>

    </div>
  );
};

export default UserHome;
