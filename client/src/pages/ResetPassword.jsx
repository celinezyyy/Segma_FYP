import React, { useContext, useState } from 'react'
import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AppContent } from '../context/AppContext'
import { toast } from 'react-toastify'
import axios from 'axios'

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContent);
  axios.defaults.withCredentials = true;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [otp, setOtp] = useState(0);
  const [isOtpSubmited, setIsOtpSubmited] = useState(false);

  const inputRefs = React.useRef([]);

  // Input handling logic
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

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/send-reset-otp', { email });
      data.success ? toast.success(data.message) : toast.error(data.message);
      data.success && setIsEmailSent(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const onSubmitOTP = async (e) => {
    e.preventDefault();
    const otpArray = inputRefs.current.map(e => e.value);
    setOtp(otpArray.join(''));
    setIsOtpSubmited(true);
  };

  const onSubmitNewPassword = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/reset-password', { email, otp, newPassword });
      data.success ? toast.success(data.message) : toast.error(data.message);
      data.success && navigate('/login');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#C3E5F1] via-[#F0F8FE] to-[#C3E5F1] min-h-screen flex items-center justify-center px-6 sm:px-0">
      <img
        onClick={() => navigate('/')}
        src={assets.SegmaLogo}
        alt="logo"
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer"
      />

      {/* Enter email */}
      {!isEmailSent && (
        <form onSubmit={onSubmitEmail} className="bg-white p-10 rounded-lg shadow-md w-96 text-gray-800 text-sm">
          <h1 className="text-black text-2xl font-semibold text-center mb-4">Reset Password</h1>
          <p className="text-center mb-6 text-gray-600">Enter your registered email address.</p>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-white border border-gray-300">
            <img src={assets.mail_icon} alt="" className="w-4 h-4" />
            <input
              type="email"
              placeholder="Email"
              className="bg-transparent outline-none text-gray-800 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-gray-400 hover:brightness-95"
            style={{ backgroundColor: '#C7EDC3' }}
          >
            Submit
          </button>
        </form>
      )}

      {/* OTP input form */}
      {!isOtpSubmited && isEmailSent && (
        <form onSubmit={onSubmitOTP} className="bg-white p-10 rounded-lg shadow-md w-96 text-gray-800 text-sm">
          <h1 className="text-black text-2xl font-semibold text-center mb-4">Reset Password OTP</h1>
          <p className="text-center mb-6 text-gray-600">Enter the 6-digit code sent to your email.</p>

          <div className="flex justify-between mb-8" onPaste={handlePaste}>
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <input
                  type="text"
                  maxLength="1"
                  key={index}
                  required
                  className="w-12 h-12 bg-white text-gray-800 text-center text-xl rounded-md border border-gray-300"
                  ref={(el) => (inputRefs.current[index] = el)}
                  onInput={(e) => handleInput(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                />
              ))}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-gray-400 hover:brightness-95"
            style={{ backgroundColor: '#C7EDC3' }}
          >
            Submit
          </button>
        </form>
      )}

      {/* Enter new password */}
      {isOtpSubmited && isEmailSent && (
        <form onSubmit={onSubmitNewPassword} className="bg-white p-10 rounded-lg shadow-md w-96 text-gray-800 text-sm">
          <h1 className="text-black text-2xl font-semibold text-center mb-4">New Password</h1>
          <p className="text-center mb-6 text-gray-600">Enter the new password below.</p>
          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-white border border-gray-300">
            <img src={assets.lock_icon} alt="" className="w-4 h-4" />
            <input
              type="password"
              placeholder="Password"
              className="bg-transparent outline-none text-gray-800 w-full"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-gray-400 hover:brightness-95"
            style={{ backgroundColor: '#C7EDC3' }}
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
