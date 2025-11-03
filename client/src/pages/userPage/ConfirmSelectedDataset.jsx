import React, { useContext, useEffect, useState } from 'react';
import UserSidebar from '../../components/UserSidebar';
import { AppContext } from '../../context/AppContext';
import Swal from 'sweetalert2';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from "socket.io-client";

const ConfirmSelectedDataset = () => {
    const { backendUrl, userData } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();

    // Datasets passed from navigation state
    const { selectedCustomer, selectedOrder } = location.state || {};

    const [customerDataset, setCustomerDataset] = useState(null);
    const [orderDataset, setOrderDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    // For spinner & dynamic message
    const [isCleaning, setIsCleaning] = useState(false);
    const [cleanMessage, setCleanMessage] = useState("");
    // ✅ For live cleaning progress
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("Preparing cleaning process...");

    // 🔌 Connect to socket once
    useEffect(() => {
        const socket = io(backendUrl, { withCredentials: true });

        socket.on('connect', () => {
        console.log("🟢 Connected to cleaning socket:", socket.id);
        // register this socket with server so server can emit to the user's room
        if (userData && userData._id) {
            socket.emit('register', { userId: userData._id });
        }
        });

        socket.on('cleaning-progress', ({ progress, message, reportSaved }) => {
        console.log(`Progress: ${progress}% - ${message}`);
        setProgress(progress);
        setStatusMessage(message);

        if (reportSaved) {
            setIsCleaning(false);
            Swal.fire({
            icon: 'success',
            title: 'Cleaning Complete',
            text: 'Your dataset cleaning report is ready!',
            timer: 2500,
            showConfirmButton: false
            });

            // Redirect to cleaning report page after short delay
            setTimeout(() => {
            navigate('/summarize-cleaning-report', {
                state: { datasetId: customerDataset?._id },
            });
            }, 2500);
        }
        });

        socket.on('disconnect', () => {
        console.log("🔴 Disconnected from socket");
        });

        return () => socket.disconnect();
    }, [backendUrl, navigate, customerDataset, userData]);
    // note: include userData so we register the socket once the user is available
    // (keep customerDataset in deps to ensure dataset-specific navigation still works)

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
                setIsCleaning(true);
                setProgress(0);
                setStatusMessage("Initializing cleaning process...");
                try {
                    await new Promise((resolve) => setTimeout(resolve, 300));
                    // Step 1: Check both clean statuses in parallel
                    const [customerRes, orderRes] = await Promise.all([
                        axios.get(`${backendUrl}/api/dataset/status/${customerDataset._id}`, { withCredentials: true }),
                        axios.get(`${backendUrl}/api/dataset/status/${orderDataset._id}`, { withCredentials: true }),
                    ]);

                    const isCustomerClean = customerRes.data?.isClean;
                    const isOrderClean = orderRes.data?.isClean;

                    if (!isCustomerClean) {
                        await axios.post(`${backendUrl}/api/dataset/clean`, { customerDatasetId: customerDataset._id }, { withCredentials: true });
                    }
                    // // Step 2: Start cleaning in sequence
                    // if (!isCustomerClean) {
                    //     Swal.fire({
                    //     title: 'Cleaning Customer Dataset',
                    //     text: 'Please wait while we clean your customer data...',
                    //     allowOutsideClick: false,
                    //     allowEscapeKey: false,
                    //     didOpen: () => Swal.showLoading(),
                    //     });

                    //     await axios.post(`${backendUrl}/api/dataset/clean`, { customerDatasetId: customerDataset._id }, { withCredentials: true });
                    //     Swal.close();
                    //     await new Promise((resolve) => setTimeout(resolve, 1000));
                    // }

                    // if (!isOrderClean) {
                    //     Swal.fire({
                    //     title: 'Cleaning Order Dataset',
                    //     text: 'Please wait while we clean your order data...',
                    //     allowOutsideClick: false,
                    //     allowEscapeKey: false,
                    //     didOpen: () => Swal.showLoading(),
                    //     });

                    //     await axios.post(`${backendUrl}/api/dataset/clean`, { orderDatasetId: orderDataset._id }, { withCredentials: true });
                    //     Swal.close();
                    // }
                    // await new Promise((resolve) => setTimeout(resolve, 800));
                    // Swal.fire({
                    //     icon: 'success',
                    //     title: 'Cleaning Complete',
                    //     text: 'All datasets are now clean! Proceeding to segmentation...',
                    //     timer: 2500,
                    //     showConfirmButton: false,
                    // });

                    // setTimeout(() => {
                    //     navigate('/segmentation', { state: { selectedCustomer, selectedOrder } });
                    // }, 2500);
        
                } catch (err) {
                    console.error("Error during cleaning process:", err);
                    Swal.fire({
                    icon: "error",
                    title: "Cleaning Failed",
                    text: "An unexpected error occurred during cleaning. Please try again.",
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

    // Show progress UI while cleaning
    if (isCleaning) {
        return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="loader mb-6"></div>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Cleaning Progress: {progress}%
            </h2>
            <p className="text-sm text-gray-500 italic">{statusMessage}</p>
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
