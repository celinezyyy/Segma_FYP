import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { AppContext } from '../../context/AppContext';
import AdminSidebar from '../../components/AdminSidebar';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [sortAsc, setSortAsc] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const { backendUrl } = useContext(AppContext);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/admin/users`);
        if (res.data.success) {
          setUsers(res.data.users);
          setFilteredUsers(res.data.users); // default view: all users
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Delete user
  const handleDelete = async (userId) => {
      const result = await Swal.fire({
          title: 'Are you sure you want to delete this user?',
          text: 'This action is permanent and cannot be undone. All the user data, settings, and history will be permanently removed.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#f87171',  
          cancelButtonColor: '#d1d5db',   
          confirmButtonText: 'Yes, delete it!',
          cancelButtonText: 'Cancel'
      });

    if (!result.isConfirmed) return;

      try {
        const res = await axios.delete(`${backendUrl}/api/admin/users/${userId}`);
        if (res.data.success) {
          const updated = users.filter((user) => user._id !== userId);
          setUsers(updated);
          setFilteredUsers(updated.filter(matchSearch));
          
          // SHOW SUCCESS POPUP:
          await Swal.fire({
            title: 'Deleted!',
            text: 'The user account has been deleted successfully.',
            icon: 'success',
            confirmButtonColor: '#3b82f6', // Blue
            confirmButtonText: 'OK',
          });
        }
      } catch (err) {
        console.error('Failed to delete user:', err);
      }
  };

  // Toggle sort
  const toggleSort = () => {
    const sorted = [...filteredUsers].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortAsc ? dateA - dateB : dateB - dateA;
    });
    setFilteredUsers(sorted);
    setSortAsc(!sortAsc);
  };

  // Search filter
  const matchSearch = (user) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase());

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFilteredUsers(users.filter((user) => matchSearch(user)));
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />

      <main className="flex-grow px-4 md:px-8 pt-20 min-h-[calc(100vh-5rem)]">
        <h1 className="text-2xl font-bold mb-4 text-center text-[#2C3E50]">
          👥 Registered Users
        </h1>

        <div className="mb-6 flex justify-center w-full">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Search by username or email"
              value={searchTerm}
              onChange={handleSearch}
              className="border border-gray-300 rounded-md px-10 py-2 w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C3E5F1]"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                className="w-5 h-5 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto bg-white shadow-lg rounded-lg border-2 border-[#C3E5F1] w-full">
          <table className="min-w-full text-left text-[#2C3E50]">
            <thead className="bg-[#C3E5F1] text-sm uppercase">
              <tr>
                <th className="py-3 px-6">No.</th>
                <th className="py-3 px-6">Username</th>
                <th className="py-3 px-6">Email</th>
                <th className="py-3 px-6 cursor-pointer flex items-center gap-1" onClick={toggleSort}>
                  <span>Date Joined</span>
                  {sortAsc ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
                    </svg>
                  )}
                </th>
                <th className="py-3 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-gray-500">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => (
                  <tr key={user._id} className="border-t hover:bg-gray-50 transition">
                    <td className="py-3 px-6 text-gray-600">{index + 1}</td> {/* 👈 Numbering */}
                    <td className="py-3 px-6">{user.username}</td>
                    <td className="py-3 px-6">{user.email}</td>
                    <td className="py-3 px-6">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-6 text-center">
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="text-red-600 border border-red-600 px-4 py-1 rounded hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default UserList;