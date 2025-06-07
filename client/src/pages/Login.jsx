import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import { AppContent } from '../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';

import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { backendUrl, setIsLoggedin, getUserData } = useContext(AppContent);

  const [state, setState] = useState(location.pathname === '/register' ? 'Sign Up' : 'Login');

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
            />
          </div>
          {errors.email && <p className="text-red-600 text-xs mb-2">{errors.email?.message}</p>}

          <div className="mb-4 flex items-center gap-3 w-full px-5 py-2.5 rounded-full bg-white border border-gray-300">
            <img src={assets.lock_icon} alt="" />
            <input
              {...register('password')}
              className="bg-transparent outline-none text-gray-800 w-full"
              type="password"
              placeholder="Password"
            />
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
            className="w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-gray-400 hover:brightness-95"
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
