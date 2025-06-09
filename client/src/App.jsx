import React from 'react';
import {Routes, Route} from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './pages/Home';
import UserHome from './pages/UserHome';
import Login from './pages/Login';
import EmailVerify from './pages/EmailVerify';
import ResetPassword from './pages/ResetPassword';
import DatasetTab from './pages/DatasetTab';
import MyProfile from './pages/MyProfile';
import Feedback from './pages/Feedback';
import AdminHome from './adminPage/AdminHome';
import UserList from './adminPage/UserList';
import AdminProfile from './adminPage/AdminProfile';
  
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
        <Route path='/feedback-tab' element={<Feedback/>}/>
        <Route path='/admin-home' element={<AdminHome/>}/>
        <Route path='/admin-user-list' element={<UserList />}/>
        <Route path='/admin-profile' element={<AdminProfile />}/>
        <Route></Route>
      </Routes>
    </div>
  )
}

export default App;