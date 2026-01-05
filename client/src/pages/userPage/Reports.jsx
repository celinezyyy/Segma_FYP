import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import UserSidebar from '../../components/UserSidebar';
import Navbar from '../../components/Navbar';
import { AppContext } from '../../context/AppContext';

export default function Reports() {
  const { backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${backendUrl}/api/reports/get-all-reports`, { withCredentials: true });
      setItems(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e) {
      console.error('Failed to load reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: 'Delete report?',
      text: 'Are you sure you want to delete this report? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!confirm.isConfirmed) return;
    try {
      await axios.delete(`${backendUrl}/api/reports/delete-report/${id}`, { withCredentials: true });
      setItems(prev => prev.filter(x => x._id !== id));
      Swal.fire({ icon: 'success', title: 'Deleted', text: 'Report has been deleted successfully.', showConfirmButton: false, timer: 1800 });
    } catch (e) {
      console.error('Failed to delete report', e);
      Swal.fire({ icon: 'error', title: 'Delete failed', text: e.response?.data?.message || 'Please try again', showConfirmButton: false, timer: 1800 });
    }
  };

  return (
    <div className="flex min-h-screen">
      <UserSidebar />
      <main className="flex-grow px-4 md:px-8 pt-20 pb-20 min-h-[calc(100vh-5rem)] relative">
        <Navbar />
        <div className="mb-6 relative flex items-center">
          {/* Centered title */}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold text-[#2C3E50]">
            Reports
          </h1>

          {/* Right-aligned search */}
          <div className="ml-auto">
            <input
              type="text"
              placeholder="Search reports..."
              className="border border-gray-300 px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-8 rounded-2xl shadow">
            <p className="text-gray-600">Loading reports...</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white shadow-lg rounded-lg border-2 border-[#C3E5F1] w-full">
            <table className="min-w-full text-left text-[#2C3E50]">
              <thead className="bg-[#C3E5F1] text-sm uppercase">
                <tr>
                  <th className="py-3 px-6 w-12">No.</th>
                  <th className="py-3 px-6">Title</th>
                  <th className="py-3 px-6">Created</th>
                  <th className="py-3 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const q = searchQuery || '';
                  const filtered = (items || []).filter((r) => {
                    const title = (r?.title || r?.pair?.label || 'Segmentation Report').toLowerCase();
                    const created = new Date(r.createdAt || Date.now()).toLocaleString().toLowerCase();
                    return title.includes(q) || created.includes(q);
                  });
                  return filtered.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-500">
                      No reports found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, index) => (
                    <tr key={r._id} className="border-t hover:bg-gray-50 transition">
                      <td className="py-3 px-6 text-gray-600">{index + 1}</td>
                      <td className="py-3 px-6 truncate max-w-xs">{r?.title || r?.pair?.label || 'Segmentation Report'}</td>
                      <td className="py-3 px-6">{new Date(r.createdAt || Date.now()).toLocaleString()}</td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex justify-center gap-2 items-center">
                          {/* Edit removed */}
                          <a
                            href={`${backendUrl}/api/reports/${r._id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50 transition text-sm"
                          >
                            Open Report
                          </a>
                          <button
                            onClick={() => handleDelete(r._id)}
                            className="text-red-600 border border-red-600 px-3 py-1 rounded hover:bg-red-50 transition text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ); })()}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
