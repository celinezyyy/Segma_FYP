import React from 'react';
import {Routes, Route} from 'react-router-dom';
import Home from './pages/Home';
import UserHome from './pages/UserHome';
import Login from './pages/Login';
import EmailVerify from './pages/EmailVerify';
import ResetPassword from './pages/ResetPassword';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatasetTab from './pages/DatasetTab';
import MyProfile from './pages/MyProfile';
  
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
        <Route></Route>
      </Routes>
    </div>
  )
}

export default App;