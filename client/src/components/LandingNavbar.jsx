import React from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';

const LandingNavbar = () => {
  
  const navigate = useNavigate();

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <div
      className="w-full h-16 fixed top-0 left-0 right-0 shadow-md bg-[#C3E5F1] z-10"
    >
      <div className="relative h-full px-4 sm:px-8 md:px-24 flex items-center">
        {/* Login button aligned right */}
        <button
          onClick={() => navigate('/login')}
          className="ml-auto flex items-center gap-2 border border-gray-500 rounded-full px-3 py-1 sm:px-6 sm:py-2 text-sm sm:text-base text-gray-800 hover:bg-gray-100 transition-all whitespace-nowrap"
        >
          Login
        </button>

        {/* Logo clickable and centered */}
        <div
          className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
          onClick={handleLogoClick}
        >
          <img
            src={assets.SegmaLogo}
            alt="Segma Logo"
            className="h-8 sm:h-10 object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default LandingNavbar;