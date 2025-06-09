import React, { useState, useEffect, useContext } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
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

    {/*Handle Save Profile Info button */}
    const handleSave = async (e) => {
        console.log("updateProfile controller triggered");
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
        console.log("Update profile run, middleware");
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

    {/*Handle Delete Account */}
    const handleDeleteAccount = async () => {
        const result = await Swal.fire({
            title: 'Are you sure you want to delete your account?',
            text: 'This action is permanent and cannot be undone. All your data, settings, and history will be permanently removed. If you proceed, you will lose access to your account and all associated information. Please confirm if you want to continue.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fca5a5',
            cancelButtonColor: '#c9c9c9',
            confirmButtonText: 'Yes, Delete Account!',
            cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) return;

        try {
            axios.defaults.withCredentials = true;
            const res = await axios.delete(`${backendUrl}/api/user/delete-account`);
            if (res.data.success) {
            Swal.fire(
                'Deleted!',
                'Your account has been deleted.',
                'success'
            );
            localStorage.clear();
            navigate('/');
            } else {
            Swal.fire('Failed', res.data.message || 'Deletion failed', 'error');
            }
        } catch (err) {
            Swal.fire('Error', err.response?.data?.message || 'An error occurred', 'error');
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
                            onClick={handleDeleteAccount}
                            type="button"
                            className="py-2.5 px-6 rounded-full font-semibold transition-all border border-black hover:brightness-90 min-w-[200px] flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#F5ABAD' }}
                            >
                            Delete Account
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="w-5 h-5"
                            >
                                <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z"
                                />
                            </svg>
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
                            className="w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-black hover:brightness-90"
                            style={{ backgroundColor: '#C9C9C9' }}
                            >
                            Cancel
                            </button>

                            <button
                            onClick={handleSave}
                            type="submit"
                            className="w-full py-2.5 rounded-full px-6 text-black font-semibold transition-all border border-black hover:brightness-90"
                            style={{ backgroundColor: '#C7EDC3' }}
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