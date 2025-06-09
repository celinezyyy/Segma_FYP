import React, { useContext, useState, useRef } from 'react';
import { assets } from '../assets/assets';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const passwordSchema = yup.object().shape({
  newPassword: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(20, 'Password must be at most 20 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[@$!%*?&]/, 'Password must contain at least one special character @$!%*?&'),
});

const ResetPassword = () => {
  const { backendUrl } = useContext(AppContext);
  axios.defaults.withCredentials = true;
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isOtpSubmitted, setIsOtpSubmitted] = useState(false);
  const [otp, setOtp] = useState('');
  const inputRefs = useRef([]);
  const [showPassword, setShowPassword] = useState(false);

  // react-hook-form for new password with validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(passwordSchema),
  });

  // Input handling for OTP fields
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

  // Submit email to send OTP
  const onSubmitEmail = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(backendUrl + '/api/auth/send-reset-otp', { email });
      data.success ? toast.success(data.message) : toast.error(data.message);
      if (data.success) setIsEmailSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // Submit OTP
  const onSubmitOTP = (e) => {
    e.preventDefault();
    const otpArray = inputRefs.current.map((input) => input.value);
    const otpValue = otpArray.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter the full 6-digit OTP.');
      return;
    }
    setOtp(otpValue);
    setIsOtpSubmitted(true);
    toast.success('OTP verified! Please enter your new password.');
  };

  // Submit new password with validation
  const onSubmitNewPassword = async (data) => {
    try {
      const { newPassword } = data;
      const { data: res } = await axios.post(backendUrl + '/api/auth/reset-password', {
        email,
        otp,
        newPassword,
      });
      if (res.success) {
        toast.success('Password reset successful! You can now log in with your new password.');
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
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

      {/* Step 1: Enter email */}
      {!isEmailSent && (
        <form
          onSubmit={onSubmitEmail}
          className="bg-white p-10 rounded-lg shadow-md w-96 text-gray-800 text-sm"
        >
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

      {/* Step 2: Enter OTP */}
      {isEmailSent && !isOtpSubmitted && (
        <form
          onSubmit={onSubmitOTP}
          className="bg-white p-10 rounded-lg shadow-md w-96 text-gray-800 text-sm"
          onPaste={handlePaste}
        >
          <h1 className="text-black text-2xl font-semibold text-center mb-4">Reset Password OTP</h1>
          <p className="text-center mb-6 text-gray-600">Enter the 6-digit code sent to your email.</p>

          <div className="flex justify-between mb-8">
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

      {/* Step 3: Enter new password with validation and toggle */}
      {isEmailSent && isOtpSubmitted && (
        <form
          onSubmit={handleSubmit(onSubmitNewPassword)}
          className="bg-white p-10 rounded-lg shadow-md w-96 text-gray-800 text-sm"
        >
          <h1 className="text-black text-2xl font-semibold text-center mb-4">New Password</h1>
          <p className="text-center mb-6 text-gray-600">Enter the new password below.</p>
          <div className="mb-4 relative flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-white border border-gray-300">
            <img src={assets.lock_icon} alt="" className="w-4 h-4" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="New Password"
              className={`bg-transparent outline-none text-gray-800 w-full pr-10 ${
                errors.newPassword ? 'border-red-600' : ''
              }`}
              {...register('newPassword')}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 text-sm font-semibold text-gray-600 hover:text-gray-900"
              tabIndex={-1}
            >
              {showPassword ? (
              /* eye-slash icon SVG */
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>

            ) : (
              /* eye icon SVG */
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
          )}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-red-600 text-xs mb-4">{errors.newPassword.message}</p>
          )}

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