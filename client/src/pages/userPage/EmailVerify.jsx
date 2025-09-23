import React, { useContext, useEffect, useState } from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import Swal from 'sweetalert2'
import { useNavigate } from 'react-router-dom'

const EmailVerify = () => {
  axios.defaults.withCredentials = true;
  const { backendUrl, getUserData } = useContext(AppContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const inputRefs = React.useRef([]);

  // ✅ Input handling logic
  const handleInput = (e, index) => {
    if (e.target.value.length > 0 && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData('text');
    const pasteArray = paste.split('');
    pasteArray.forEach((char, index) => {
      if (inputRefs.current[index]) {
        inputRefs.current[index].value = char;
      }
    });
  };

  // ✅ Submit handler
  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (loading) return; // Prevent multiple submissions
    setLoading(true);    // Disable the button

    const otpArray = inputRefs.current.map(input => input.value.trim());
    const otp = otpArray.join('');

    const userId = localStorage.getItem('verifyUserId'); // 👈 get userId
    
    // Check User ID
    if (!userId) {
      Swal.fire({
        icon: 'error',
        title: 'User Not Found',
        text: 'Verification failed.',
        showConfirmButton: false,
        timer: 3000,
      }).then(() => setLoading(false));
      return;
    }

    // Check OTP first
    if (!otp || otp.length !== 6) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid OTP',
        text: 'Please enter a valid 6-digit OTP code.'
      }).then(() => setLoading(false));
      return;
    }

    try {
      const { data } = await axios.post(`${backendUrl}/api/auth/verify-account`, { otp, userId });

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Verified!',
          text: data.message,
          showConfirmButton: false,
          timer: 3000,
        }).then(() => {
          setLoading(false);
          localStorage.removeItem('verifyUserId'); // ✅ cleanup
          getUserData();
          navigate('/login');
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message,
          showConfirmButton: false,
          timer: 3000,
        }).then(() => 
          setLoading(false)
        );
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        text: error.response?.data?.message || "Verification failed",
        showConfirmButton: false,
        timer: 3000,
      }).then(() => 
        setLoading(false)
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-6 sm:px-0 bg-gradient-to-br from-[#C3E5F1] via-[#F0F8FE] to-[#C3E5F1]">
      <img onClick={() => navigate('/')} src={assets.SegmaLogo} alt="logo" className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer" />

      <form onSubmit={onSubmitHandler} className='bg-white p-10 rounded-lg shadow-md w-96 text-gray-800 text-sm'>
        <h1 className='text-black text-2xl font-semibold text-center mb-4'>Email Verify OTP</h1>
        <p className='text-center mb-6 text-gray-600'>Enter the 6-digit code sent to your email.</p>

        <div className='flex justify-between mb-8' onPaste={handlePaste}>
          {Array(6).fill(0).map((_, index) => (
            <input
              type="text"
              maxLength="1"
              key={index}
              required
              className="w-12 h-12 bg-white text-gray-800 text-center text-xl rounded-md border border-gray-300"
              ref={el => inputRefs.current[index] = el}
              onInput={(e) => handleInput(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
          ))}
        </div>

        <button className='w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-gray-400 hover:brightness-95'
        style={{ backgroundColor: '#C7EDC3' }}>
          Verify Email
        </button>
      </form>
    </div>
  );
};

export default EmailVerify;