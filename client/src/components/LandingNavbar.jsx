import React from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom';

const LandingNavbar = () => {

  const navigate = useNavigate();

  return (
    <div className="w-full flex justify-between items-center p-4 sm:p-6 sm:px-24 absolute top-0  shadow-md" style={{ backgroundColor: "#C3E5F1" }} >
      <img src= {assets.SegmaLogo} alt="" className="w-auto h-auto sm:w-32" />

      <button onClick={() => navigate('/login')} className="flex items-center gap-2 border border-gray-500 rounded-full px-6 py-2 text-gray-800 hover:bg-gray-100 transition-all">Login</button>
  </div>

  )
};

export default LandingNavbar;
