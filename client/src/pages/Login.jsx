import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const Login = () => {

  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState(location.pathname === '/register' ? 'Sign Up' : 'Login');

  const { backendUrl, setIsLoggedin, getUserData } = useContext(AppContext);

  useEffect(() => {
    if (location.pathname === '/register') {
      setState('Sign Up');
    } else if (location.pathname === '/login') {
      setState('Login');
    }
  }, [location.pathname]);

  // Yup schema generator depending on state
  const getSchema = (isSignup) =>
    yup.object().shape({
      username: isSignup
        ? yup.string().required('Username is required')
        : yup.string().notRequired(),
      email: yup.string().email('Invalid email').required('Email is required'),
      password: isSignup
        ? yup
            .string()
            .required('Password is required')
            .min(8, 'Password must be at least 8 characters')
            .max(20, 'Password must be at most 20 characters')
            .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
            .matches(/[0-9]/, 'Password must contain at least one number')
            .matches(/[@$!%*?&]/, 'Password must contain at least one special character @$!%*?&')
        : yup.string().required('Password is required'),
    });

  const isSignup = state === 'Sign Up';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(getSchema(isSignup)),
  });

  const toggleForm = () => {
    if (state === 'Sign Up') {
      setState('Login');
      navigate('/login');
      reset(); // clear form on toggle
    } else {
      setState('Sign Up');
      navigate('/register');
      reset();
    }
  };

  const onSubmitHandler = async (data) => {
    try {
      axios.defaults.withCredentials = true;

      if (isSignup) {
        const { username, email, password } = data;
        const res = await axios.post(`${backendUrl}/api/auth/register`, {
          username,
          email,
          password,
        });

        if (res.data.success) {
          localStorage.setItem('verifyUserId', res.data.userId);
          toast.success('OTP sent! Please check your email');
          navigate('/verify-account', { state: { email } });
        } else {
          toast.error(res.data.message);
        }
      } else {
        const { email, password } = data;
        const res = await axios.post(`${backendUrl}/api/auth/login`, {
          email,
          password,
        });

        if (res.data.success) {
          setIsLoggedin(true);
          getUserData();
          navigate('/user-home');
        } else if (res.data.message === 'Please verify your email before logging in') {
          if (res.data.userId) {
            localStorage.setItem('verifyUserId', res.data.userId);
          }
          toast.info(res.data.message);
          navigate('/verify-account', { state: { email } });
        } else {
          toast.error(res.data.message);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#C3E5F1] via-[#F0F8FE] to-[#C3E5F1] min-h-screen flex items-center justify-center px-6 sm:px-0">
      {/* Logo */}
      <img
        onClick={() => navigate('/')}
        src={assets.SegmaLogo}
        alt=""
        className="absolute left-5 sm:left-20 top-5 w-28 sm:w-32 cursor-pointer"
      />

      {/* Form Card */}
      <div className="bg-white border border-gray-200 p-10 rounded-lg shadow-md w-full sm:w-96 text-gray-800 text-sm z-10">
        <h2 className="text-3xl font-semibold text-black text-center mb-6">
          {isSignup ? 'Create account' : 'Login'}
        </h2>

        <form onSubmit={handleSubmit(onSubmitHandler)}>
          {isSignup && (
            <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-white border border-gray-300">
              <img src={assets.person_icon} alt="" />
              <input
                {...register('username')}
                className="bg-transparent outline-none text-gray-800 w-full"
                type="text"
                placeholder="Username"
                required
              />
            </div>
          )}
          {errors.username && (
            <p className="text-red-600 text-xs mb-2">{errors.username?.message}</p>
          )}

          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-white border border-gray-300">
            <img src={assets.mail_icon} alt="" />
            <input
              {...register('email')}
              className="bg-transparent outline-none text-gray-800 w-full"
              type="email"
              placeholder="Email"
              required
            />
          </div>
          {errors.email && <p className="text-red-600 text-xs mb-2">{errors.email?.message}</p>}

          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-white border border-gray-300 relative">
            <img src={assets.lock_icon} alt="" />
            <input
              {...register('password')}
              className="bg-transparent outline-none text-gray-800 w-full pr-10"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 focus:outline-none"
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

      {errors.password && (
        <p className="text-red-600 text-xs mb-2">{errors.password?.message}</p>
      )}

      {!isSignup && (
        <p
          onClick={() => navigate('/reset-password')}
          className="mb-4 text-sm text-blue-700 cursor-pointer underline text-right"
        >
          Forgot Password
        </p>
      )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-gray-400 hover:brightness-90"
          style={{ backgroundColor: '#C7EDC3' }}
        >
          {state}
        </button>
      </form>

        {isSignup ? (
          <p className="text-gray-600 text-center text-xs mt-4">
            Already have an account?{' '}
            <span onClick={toggleForm} className="text-blue-700 cursor-pointer underline">
              Login Here
            </span>
          </p>
        ) : (
          <p className="text-gray-600 text-center text-xs mt-4">
            Don't have an account?{' '}
            <span onClick={toggleForm} className="text-blue-700 cursor-pointer underline">
              Sign Up
            </span>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;