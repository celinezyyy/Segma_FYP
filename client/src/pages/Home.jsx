import React from 'react'
import LandingNavbar from '../components/LandingNavbar'
import Header from '../components/Header'
import Footer from '../components/Footer'

const features = [
  {
    title: 'Advanced Market Segmentation',
    description: 'Discover meaningful customer groups with AI-powered clustering.',
  },
  {
    title: 'Real-time Data Sync',
    description: 'Keep your insights fresh by connecting live data sources.',
  },
  {
    title: 'Interactive Dashboards',
    description: 'Visualize customer behavior and segments with ease.',
  },
  {
    title: 'Automated Reporting',
    description: 'Generate and share detailed reports effortlessly.',
  },
]

const Home = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100'>
      <LandingNavbar />
      <Header />

      {/* Features section */}
      <div className="w-full max-w-7xl mt-12 px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {features.map(({ title, description }, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center text-center"
          >
            <h3 className="text-xl font-semibold mb-3">{title}</h3>
            <p className="text-gray-600">{description}</p>
          </div>
        ))}
      </div>

      {/* Strength message */}
      <div className="mt-10 mb-16 max-w-4xl px-8 py-12 mx-auto text-center bg-slate-50 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-4 text-indigo-700">
          Why Our System Stands Out
        </h2>
        <p className="text-lg text-slate-800 leading-relaxed">
          Our platform empowers you to understand your customers deeply, make smarter marketing decisions, and grow your business effectively. Combining advanced technology with simplicity, we turn complex data into clear, actionable insights — so you can focus on what matters most: your success.
        </p>
      </div>
       <Footer />
    </div>
  )
}
export default Home
