import { createContext, useState, useEffect } from "react";
import Swal from 'sweetalert2';
import axios from 'axios';

export const AppContext = createContext();

export const AppContextProvider = (props) => {

    axios.defaults.withCredentials = true;

    const backendUrl = import.meta.env.VITE_API_URL;
    const [isLoggedin, setIsLoggedin] = useState(false);
    const [userData, setUserData] = useState(null);

    const getAuthState = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/auth/is-auth');
            if (data.success) {
                setIsLoggedin(true);
                getUserData();
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message,
            });
        }
    }

    const getUserData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/user/data');
            if (data.success) {
                setUserData(data.userData);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: data.message,
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: error.message,
            });
        }
    }

    useEffect(() => {
        // Register interceptor once
        const interceptorId = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error?.response?.status;
                if (status === 401) {
                    const msg = error?.response?.data?.message || 'Not Authorized. Session Expired, Please Login Again';
                    try {
                        Swal.fire({ icon: 'error', title: 'Session expired', text: msg });
                    } catch {}
                    // Reset client auth state and send user to login
                    try { setIsLoggedin(false); setUserData(null); } catch {}
                    if (window.location.pathname !== '/api/auth/login') {
                        window.location.href = '/api/auth/login';
                    }
                }
                return Promise.reject(error);
            }
        );

        getAuthState();

        // Cleanup on unmount
        return () => axios.interceptors.response.eject(interceptorId);
    }, []);

    const value = {
        backendUrl,
        isLoggedin, setIsLoggedin,
        userData, setUserData,
        getUserData
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}