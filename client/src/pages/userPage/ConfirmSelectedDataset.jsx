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
    const { selectedCustomer, selectedOrder } = location.state || {};   // Datasets passed from navigation state
    const [customerDataset, setCustomerDataset] = useState(null);
    const [orderDataset, setOrderDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentProgress, setCurrentProgress] = useState(0);
    const [targetProgress, setTargetProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("Preparing cleaning process...");

    // Check dataset is selected or not
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

    // Connect to socket once
    useEffect(() => {
        const socket = io(backendUrl, { withCredentials: true });

        socket.on('connect', () => {
        console.log("🟢 Connected to cleaning socket:", socket.id);
        if (userData?._id) {
            socket.emit('register', { userId: userData._id });
        }
        });

        // Listen for progress updates from backend
        socket.on('cleaning-progress', ({ stage, message, progress }) => {
            if (message) 
                setStatusMessage(message);
            if (progress !== undefined) 
                setTargetProgress(progress);
        });

        socket.on('disconnect', () => console.log("🔴 Disconnected from socket"));

        return () => socket.disconnect();
    }, [backendUrl, userData]);
   
    // Animate progress gradually toward target
    useEffect(() => {
        if (currentProgress >= targetProgress) return; // wait until backend updates next target

        let step = 1; // default increment
        let intervalSpeed = 30; // default speed in ms

        // Adjust speed per stage (optional)
        if (statusMessage.includes("Analyzing")) {
            intervalSpeed = 1000;
            step = 1;
        } else {
            intervalSpeed = 30;
            step = 2;
        }

        const interval = setInterval(() => {
            setCurrentProgress((prev) => {
            if (prev >= targetProgress) {
                clearInterval(interval);
                return targetProgress;
            }
            return Math.min(prev + step, targetProgress);
            });
        }, intervalSpeed);

        return () => clearInterval(interval);
    }, [targetProgress]);

    // Update Swal modal whenever progress or message change
    useEffect(() => {
        const bar = document.getElementById("swal-progress-bar");
        const msg = document.getElementById("swal-progress-message");
        const text = document.getElementById("swal-progress-text");
        if (bar) bar.style.width = `${currentProgress}%`;
        if (msg) msg.textContent = statusMessage;
        if (text) text.textContent = currentProgress;
    }, [currentProgress, statusMessage]);

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
            text: 'We will check and validate both datasets. This may take a few moments.', 
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

                    if (!isCustomerClean) {
                        // Show progress modal
                        Swal.fire({
                            title: "Customer Dataset Cleaning in Progress",
                            html: `
                            <div style="width:100%; text-align:left;">
                                <div style="margin-bottom:10px; font-weight:500; color:#444;">
                                <span id="swal-progress-message">${statusMessage}</span>
                                </div>
                                <div style="background:#e0e0e0; border-radius:8px; height:18px; width:100%;">
                                <div id="swal-progress-bar" style="height:18px; width:${currentProgress}%; background:#66a868; border-radius:8px; transition: width 0.3s;"></div>
                                </div>
                                <div style="margin-top:5px; font-size:12px; color:#666;"><span id="swal-progress-text">${currentProgress}</span>%</div>
                            </div>
                            `,
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showConfirmButton: false,
                            didOpen: () => Swal.showLoading(),
                        });
                        await axios.post(`${backendUrl}/api/dataset/clean`, { customerDatasetId: customerDataset._id }, { withCredentials: true });
                        Swal.close();
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Customer Dataset Cleaned!',
                        text: 'We are now checking for Order dataset...',
                        timer: 3000,
                        showConfirmButton: false,
                    });

                    if (!isOrderClean) {
                        Swal.fire({
                            title: "Order dataset Cleaning in Progress",
                            html: `
                            <div style="width:100%; text-align:left;">
                                <div style="margin-bottom:10px; font-weight:500; color:#444;">
                                <span id="swal-progress-message">${statusMessage}</span>
                                </div>
                                <div style="background:#e0e0e0; border-radius:8px; height:18px; width:100%;">
                                <div id="swal-progress-bar" style="height:18px; width:${currentProgress}%; background:#66a868; border-radius:8px; transition: width 0.3s;"></div>
                                </div>
                                <div style="margin-top:5px; font-size:12px; color:#666;"><span id="swal-progress-text">${currentProgress}</span>%</div>
                            </div>
                            `,
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showConfirmButton: false,
                            didOpen: () => Swal.showLoading(),
                        });
                        await axios.post(`${backendUrl}/api/dataset/clean`, { orderDatasetId: orderDataset._id }, { withCredentials: true });
                        Swal.close();
                    }
                    
                    Swal.fire({
                        icon: 'success',
                        title: 'Cleaned!',
                        text: 'All datasets already clean! Check your summarize report...',
                        timer: 2500,
                        showConfirmButton: false,
                    });

                    const customerReportRes = await axios.get(`${backendUrl}/api/dataset/dataset-report/${customerDataset._id}`, { withCredentials: true });
                    const orderReportRes = await axios.get(`${backendUrl}/api/dataset/dataset-report/${orderDataset._id}`, { withCredentials: true });
                    
                    console.log("🧼 Customer Clean API Response:", customerReportRes);
                    console.log("🧼 Order Clean API Response:", orderReportRes);

                    setTimeout(() => {
                        navigate('/cleaning-summarize-report', { 
                            state: { 
                                selectedCustomer, 
                                selectedOrder, 
                                customerReport: customerReportRes.data.report, 
                                orderReport: orderReportRes.data.report 
                            } 
                        });
                    }, 2500);
        
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
