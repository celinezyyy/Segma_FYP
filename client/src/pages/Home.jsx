import React from 'react'
import LandingNavbar from '../components/LandingNavbar'
import Header from '../components/Header'

const Home = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen '>
      <LandingNavbar/>
      <Header />
    </div>
  )
}

export default Home
