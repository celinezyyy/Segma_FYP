import React from 'react';
import {Routes, Route} from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './pages/userPage/Home';
import UserHome from './pages/userPage/UserHome';
import Login from './pages/userPage/Login';
import EmailVerify from './pages/userPage/EmailVerify';
import ResetPassword from './pages/userPage/ResetPassword';
import DatasetTab from './pages/userPage/DatasetTab';
import MyProfile from './pages/userPage/MyProfile';
import SubmitFeedback from './pages/userPage/SubmitFeedback';
import ViewFeedbackStatus from './pages/userPage/ViewFeedbackStatus';
import DatasetSelection from './pages/userPage/DatasetSelection';
import ConfirmSelectedDataset from './pages/userPage/ConfirmSelectedDataset';
import CleaningSummarizeReport from './pages/userPage/CleaningSummarizeReport';
import Segmentation from './pages/userPage/Segmentation';

import AdminHome from './pages/adminPage/AdminHome';
import UserList from './pages/adminPage/UserList';
import AdminProfile from './pages/adminPage/AdminProfile';
import FeedbackList from './pages/adminPage/FeedbackList';
  
const App = () => {
  return(
    <div>
      <ToastContainer/>
      <Routes>
        <Route path='/' element={<Home/>}/> 
        <Route path="/user-home" element={<UserHome />} />
        <Route path='/login' element={<Login/>}/>
        <Route path="/register" element={<Login />} />
        <Route path='/verify-account' element={<EmailVerify/>}/>
        <Route path='/reset-password' element={<ResetPassword/>}/>
        <Route path='/dataset-tab' element={<DatasetTab/>}/>
        <Route path='/my-profile' element={<MyProfile/>}/>
        <Route path='/submit-feedback' element={<SubmitFeedback/>}/>
        <Route path='/view-feedback-status' element={<ViewFeedbackStatus/>}/>
        <Route path='/admin-home' element={<AdminHome/>}/>
        <Route path='/admin-user-list' element={<UserList />}/>
        <Route path='/admin-profile' element={<AdminProfile />}/>
        <Route path='/admin-feedback-list' element={<FeedbackList />}/>
        <Route path='/dataset-selection' element={<DatasetSelection />}/>
        <Route path='/confirm-selected-dataset' element={<ConfirmSelectedDataset />}/>
        <Route path='/cleaning-summarize-report' element={<CleaningSummarizeReport />}/>
        <Route path='/segmentation' element={<Segmentation />}/>
        <Route></Route>
      </Routes>
    </div>
  )
}

export default App;