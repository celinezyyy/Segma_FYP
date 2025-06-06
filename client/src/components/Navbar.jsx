// src/components/Navbar.jsx
import React, { useContext } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AppContent } from '../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const Navbar = () => {
  const { setIsLoggedin, setUserData, backendUrl } = useContext(AppContent);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(backendUrl + '/api/auth/logout');
      if (data.success) {
        setIsLoggedin(false);
        setUserData(false);
        navigate('/');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div
      className="w-full flex justify-between items-center p-4 sm:p-6 sm:px-24 fixed top-0 left-0 right-0 shadow-md"
      style={{ backgroundColor: "#C3E5F1", zIndex: 10 }}
    >
      <img src={assets.SegmaLogo} alt="Segma Logo" className="w-auto h-auto sm:w-32" />
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 border border-gray-500 rounded-full px-6 py-2 text-gray-800 hover:bg-gray-100 transition-all"
      >
        Log Out
      </button>
    </div>
  );
};

export default Navbar;
