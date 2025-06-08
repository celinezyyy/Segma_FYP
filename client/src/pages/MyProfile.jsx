import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const MyProfile = () => {
  const { userData, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
  });

  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        username: userData.username || '',
        email: userData.email || '',
      });
      setInitialData({
        username: userData.username || '',
        email: userData.email || '',
      });
    }
  }, [userData]);

{/*Handle Cancel button */}
  const handleCancel = () => {
    if (initialData) {
      setFormData({ ...initialData });
    }
  };

{/*Handle Save button */}
 const handleSave = async (e) => {
  e.preventDefault();

  try {
    axios.defaults.withCredentials = true;

    if (!userData) return;

    const usernameChanged = formData.username !== initialData.username;
    const emailChanged = formData.email !== initialData.email;

    if (!usernameChanged && !emailChanged) {
      toast.info("No changes made");
      return;
    }

    const res = await axios.post(`${backendUrl}/api/user/update-profile`, {
      username: formData.username,
      email: formData.email,
    });

    if (res.data.success) {
      // Update initialData to the new saved values
      setInitialData({
        username: formData.username,
        email: formData.email,
      });

      if (emailChanged) {
        toast.success("Email changed successfully! Please verify again.");
        localStorage.setItem("verifyUserId", res.data.userId);
        navigate('/verify-account', { state: { email: formData.email } });
      } else {
        toast.success("Profile updated successfully!");
      }
    } else {
      toast.error(res.data.message || "Update failed");
    }
  } catch (err) {
    toast.error(err.response?.data?.message || "An error occurred");
  }
};


  return (
    <div>
      <Navbar />
      <div className="flex pt-20">
        <Sidebar />
        <main className="flex-grow px-4 md:px-8 mt-20 flex flex-col items-center">
          {/* Title Outside the Form Box */}
          <h2 className="text-3xl font-bold text-center mb-6 text-[#1f3f66]">
            Edit Profile Information
          </h2>

          <form
            className="flex flex-col md:flex-row max-w-4xl gap-12 bg-[#f0f4f8] p-6 rounded-lg border border-blue-100 shadow-lg w-full"
            style={{ border: '1px solid #C3E5F1' }}
          >
            {/* Left: Profile Image & Delete Button */}
            <div className="flex flex-col items-center justify-center md:w-1/3 w-full mb-6 md:mb-0 space-y-6">
              <img
                src={assets.editprofile}
                alt="Profile"
                className="max-w-[190px] w-full h-auto object-contain rounded"
              />
              <button
                type="button"
                className="text-red-500 font-semibold px-6 py-3 rounded-md border-2 border-red-500 min-w-[200px] text-center bg-transparent hover:bg-red-300 hover:text-black transition-colors flex items-center justify-center gap-2"
              >
                Delete Account
              </button>
            </div>

            {/* Right: Form Fields */}
            <div className="md:w-2/3 flex-grow flex flex-col gap-4 w-full">
              <label className="flex flex-col">
                <span className="font-semibold mb-1">Username</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </label>

              <label className="flex flex-col">
                <span className="font-semibold mb-1">Email</span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border rounded px-3 py-2 w-full"
                  required
                />
              </label>

              {/* Reset Password Link */}
              <div className="mt-2">
                <a
                  href="/reset-password"
                  className="text-blue-600 hover:underline font-semibold underline"
                >
                  Reset Password
                </a>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleCancel}
                  type="button"
                  className="px-6 py-3 rounded-md font-semibold transition-colors bg-[#C9C9C9] text-black border-2 border-black min-w-[150px] text-center hover:bg-black hover:text-[#C9C9C9]"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  type="submit"
                  className="px-6 py-3 rounded-md font-semibold transition-colors bg-[#C7EDC3] text-black border-2 border-black min-w-[150px] text-center hover:bg-black hover:text-[#C7EDC3]"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default MyProfile;
