import React, { useContext, useEffect, useState } from 'react';
import UserSidebar from '../../components/UserSidebar';
import { AppContext } from '../../context/AppContext';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ConfirmSelectedDataset = () => {
    const { backendUrl } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();

    // Datasets passed from navigation state
    const { selectedCustomer, selectedOrder } = location.state || {};

    const [customerDataset, setCustomerDataset] = useState(null);
    const [orderDataset, setOrderDataset] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!location.state || !selectedCustomer || !selectedOrder) {
        Swal.fire({
            icon: 'warning',
            title: 'No Dataset Selected',
            text: 'Please select both Customer and Order datasets first.',
        });
        navigate('/dataset-selection');
        return;
        }

        fetchDatasetDetails();
    }, [location.state]);

    const fetchDatasetDetails = async () => {
        try {
        const res = await axios.get(`${backendUrl}/api/dataset`, { withCredentials: true });
        if (res.data.success) {
            const customer = res.data.customer.find((d) => d._id === selectedCustomer);
            const order = res.data.order.find((d) => d._id === selectedOrder);
            setCustomerDataset(customer);
            setOrderDataset(order);
        }
        } catch (err) {
        console.error('Error fetching datasets:', err);
        Swal.fire({ icon: 'error', text: 'Failed to load dataset info' });
        } finally {
        setLoading(false);
        }
    };

    const handlePerformDataCheck = async () => {
        console.log('Customer Dataset:', customerDataset);
        console.log('Order Dataset:', orderDataset);

        if (!customerDataset || !orderDataset) {
            Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Both datasets must be selected before performing data checking.',
            });
            return;
        }

        Swal.fire({
            title: 'Perform Data Checking?',
            text: 'We will clean and validate both datasets. This may take a few moments depending on size.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#66a868ff',
            confirmButtonText: 'Yes, proceed',
        }).then(async (result) => {
            
            if (result.isConfirmed) {
            try {
                // Step 1: Check both clean statuses in parallel
                const [customerRes, orderRes] = await Promise.all([
                axios.get(`${backendUrl}/api/dataset/status/${customerDataset._id}`, { withCredentials: true }),
                axios.get(`${backendUrl}/api/dataset/status/${orderDataset._id}`, { withCredentials: true }),
                ]);

                const isCustomerClean = customerRes.data?.isClean;
                const isOrderClean = orderRes.data?.isClean;

                if (isCustomerClean && isOrderClean) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Both Datasets Already Clean',
                        text: 'Skipping cleaning process and proceeding to segmentation.',
                        timer: 3000,
                        showConfirmButton: false,
                    });

                    navigate('/segmentation', {
                        state: { selectedCustomer, selectedOrder },
                    });
                    return;
                }

                // Step 2: At least one dataset is not clean
                Swal.fire({
                    icon: 'info',
                    title: 'Processing...',
                    text: 'Performing data checking and cleaning, please wait...',
                    showConfirmButton: false,
                });

                // Call cleaning APIs separately for each
                if (!isCustomerClean) {
                    await axios.post(`${backendUrl}/api/dataset/clean/${customerDataset._id}`, {}, { withCredentials: true });
                }
                if (!isOrderClean) {
                    await axios.post(`${backendUrl}/api/dataset/clean/${orderDataset._id}`, {}, { withCredentials: true });
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Cleaning Complete',
                    text: 'Both datasets cleaned and validated successfully!',
                    timer: 2500,
                    showConfirmButton: false,
                });

                navigate('/segmentation', {
                state: { selectedCustomer, selectedOrder },
                });
            } catch (err) {
                console.error('Error details:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.response?.data?.message || 'Failed to check dataset status. Please try again.',
                });
            }
            }
        });
    };

    if (loading) {
        return (
        <div className="flex justify-center items-center h-screen text-gray-500">
            Loading dataset details...
        </div>
        );
    }

    return (
        <div className="flex min-h-screen">
        <UserSidebar />
        <main className="flex-grow px-4 md:px-8 pt-20 pb-20 min-h-[calc(100vh-5rem)]">
            <h1 className="text-2xl font-bold mb-8 text-center text-[#2C3E50]">
            Confirm Selected Datasets
            </h1>

            <div className="bg-white border-2 border-[#C3E5F1] shadow-lg rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-[#2C3E50]">
                Selected Customer Dataset
            </h2>
            {customerDataset ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
                <p><strong>Name:</strong> {customerDataset.originalname}</p>
                <p><strong>Uploaded:</strong> {new Date(customerDataset.uploadedAt).toLocaleString()}</p>
                <p><strong>Type:</strong> Customer</p>
                </div>
            ) : (
                <p className="text-red-500 italic">Dataset not found</p>
            )}
            </div>

            <div className="bg-white border-2 border-[#C3E5F1] shadow-lg rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-[#2C3E50]">
                Selected Order Dataset
            </h2>
            {orderDataset ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-700">
                <p><strong>Name:</strong> {orderDataset.originalname}</p>
                <p><strong>Uploaded:</strong> {new Date(orderDataset.uploadedAt).toLocaleString()}</p>
                <p><strong>Type:</strong> Orders</p>
                </div>
            ) : (
                <p className="text-red-500 italic">Dataset not found</p>
            )}
            </div>

            <div className="flex justify-center gap-4 mt-8">
            <button
                onClick={() => navigate('/dataset-selection')}
                className="py-2.5 px-6 rounded-full border border-gray-500 hover:bg-gray-100 text-gray-700 font-semibold transition"
            >
                Back to Selection
            </button>

            <button
                onClick={handlePerformDataCheck}
                className="py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black hover:brightness-90"
                style={{ backgroundColor: '#C7EDC3' }}
            >
                Perform Data Checking
            </button>
            </div>
        </main>
        </div>
    );
};

export default ConfirmSelectedDataset;
