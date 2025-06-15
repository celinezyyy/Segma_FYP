import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import Navbar from '../components/Navbar';
import UserSidebar from '../components/UserSidebar';
import Footer from '../components/Footer';

const UserHome = () => {
  const { userData } = useContext(AppContext);
  const navigate = useNavigate();

  const datasetCount = 42;  // Replace with real data
  const reportCount = 17;   // Replace with real data

  return (
    <div>
      {/* Navbar and Sidebar outside main content */}
      <Navbar />
      <div className="flex pt-20 min-h-screen">
        <UserSidebar />
        {/* Main content area grows to fill the space */}
        <main className="flex-grow px-4 md:px-8">
          {/* Greeting */}
          <h1 className="text-3xl font-bold mt-6 mb-12 text-center max-w-3xl mx-auto text-[#2C3E50]">
            Hi {userData ? userData.username : 'Business Owner'}👋 <br />Welcome to your dashboard!
          </h1>

          {/* Cards */}
          <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-6 sm:space-y-0 mb-10 max-w-4xl mx-auto w-full">
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
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12 max-w-4xl mx-auto w-full">
            {['/dataset-tab', '/start-segmentation', '/view-report'].map((path, idx) => {
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
          <div
            className="max-w-4xl w-full bg-white rounded-lg p-6 mb-8 shadow-md text-center mx-auto"
            style={{ border: "2px solid #C3E5F1", color: '#2C3E50' }}
          >
            <p className="mb-3 text-lg font-semibold">
              💬 We value your input! Have suggestions or issues?
            </p>
            <p className="mb-4">
              Submit your feedback to help us improve SEGMA.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/feedback-tab')}
                className="flex items-center gap-2 border border-gray-500 rounded-full px-3 py-1 sm:px-6 sm:py-2 text-sm sm:text-base text-gray-800 transition-all whitespace-nowrap hover:bg-[#C3E5F1]"
              >
                Give Feedback
              </button>
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
