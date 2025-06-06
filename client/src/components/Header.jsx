import React, { useContext } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AppContent } from '../context/AppContext';

const Header = () => {
    
    const navigate = useNavigate();
    return (
        <div className="w-full min-h-screen flex flex-col items-center justify-center px-4 text-center text-gray-800 bg-cover bg-center"
            style={{ backgroundImage: `url(${assets.landingbackground})`}}>
            <img src={assets.header_img} alt="" className='w-36 h-36 rounded-full' />    
            <h1 className='flex items-center gap-2 text-xl sm:text-3xl font-extrabold mb-2'>“Segment Your Customers, Smarter & Faster”</h1>
            <p className='mb-8 max-w-md mt-2'>A web-based tool for SMEs to easily analyze customer data and uncover market segments using AI-powered clustering.</p>
            <button onClick={() => navigate('/login')} className='border border-gray-500 rounded-full px-8 py-2.5 hover:bg-gray-100 transition-all'>Get Started</button>
        </div>
    )
}

export default Header
