import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import UserSidebar from '../../components/UserSidebar';

const ViewFeedbackStatus = () => {
  const { backendUrl } = useContext(AppContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'submittedAt', direction: 'desc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const statusMap = {
    New: 'Pending Review',
    Processing: 'In Progress',
    Solved: 'Resolved'
  };

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        if (loading) return;
        setLoading(true);
        const res = await axios.get(`${backendUrl}/api/user/view-feedback-status`, { withCredentials: true });
        if (res.data.success) {
          setFeedbacks(res.data.feedbacks);
        } else {
          toast.error(res.data.message || 'Failed to fetch feedback');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbacks();
  }, [backendUrl]);

  const truncate = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleViewFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setIsModalOpen(true);
  };

  const SortIcon = ({ active, direction }) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={
        direction === 'asc'
          ? "M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25"
          : "M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12"
      } />
    </svg>
  );

  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-grow px-4 md:px-8 pt-20 min-h-[calc(100vh-5rem)]">
        <h2 className="text-3xl font-bold mb-6 text-[#1f3f66] text-center">My Feedback Status</h2>

        <div className="overflow-x-auto bg-white shadow-lg rounded-lg border-2 border-[#C3E5F1]">
          <table className="min-w-full text-left text-[#2C3E50]">
            <thead className="bg-[#C3E5F1] text-sm uppercase text-[#2C3E50]">
              <tr>
                <th className="py-3 px-4 border-b">NO.</th>
                <th className="py-3 px-4 border-b cursor-pointer" onClick={() => handleSort('subject')}>Subject</th>
                <th className="py-3 px-4 border-b">Description</th>
                <th className="py-3 px-4 border-b cursor-pointer" onClick={() => handleSort('submittedAt')}>
                  <span className="inline-flex items-center">
                    Date Submitted
                    <span className="ml-2">
                      <SortIcon active={sortConfig.key === 'submittedAt'} direction={sortConfig.direction} />
                    </span>
                  </span>
                </th>
                <th className="py-3 px-4 border-b cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                <th className="py-3 px-4 border-b">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedFeedbacks.map((feedback, index) => (
                <tr key={feedback._id} className="hover:bg-gray-50 transition">
                  <td className="py-3 px-6 text-gray-600">{index + 1}</td>
                  <td className="py-3 px-4 border-b">{truncate(feedback.subject, 50)}</td>
                  <td className="py-3 px-4 border-b">
                    <span className="block truncate max-w-[300px]">{truncate(feedback.description, 80)}</span>
                  </td>
                  <td className="py-3 px-4 border-b">{new Date(feedback.submittedAt).toLocaleString()}</td>
                  <td className="py-3 px-4 border-b">{statusMap[feedback.status]}</td>
                  <td className="py-3 px-4 border-b">
                    <button
                      onClick={() => handleViewFeedback(feedback)}
                      className="py-1 px-3 rounded bg-blue-500 text-white text-sm hover:bg-blue-600"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {feedbacks.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-500">
                    No feedback submitted.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {isModalOpen && selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              >
                &times;
              </button>
              <h2 className="text-2xl font-bold mb-4">{selectedFeedback.subject}</h2>
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-1 text-gray-700">{selectedFeedback.description}</p>
              </div>
              <div className="mb-3">
                <strong>Status:</strong> {statusMap[selectedFeedback.status]}
              </div>
              <div className="mb-4">
                <strong>Date Submitted:</strong> {new Date(selectedFeedback.submittedAt).toLocaleString()}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded bg-gray-300 hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ViewFeedbackStatus;