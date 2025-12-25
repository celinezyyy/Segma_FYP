import React from 'react'
import LandingNavbar from '../../components/LandingNavbar'
import Header from '../../components/Header'
import Footer from '../../components/Footer'

const features = [
  {
    title: '🎯 Advanced Market Segmentation',
    description: 'Discover meaningful customer groups with AI-powered clustering.',
  },
  {
    title: '📊 Interactive Dashboards',
    description: 'Visualize customer behavior and segments with ease. Interact with it to gain more insights',
  },
  {
    title: '📝 Automated Reporting',
    description: 'Generate and share detailed reports effortlessly.',
  },
]

const Home = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100'>
      <LandingNavbar />
      <Header />

      {/* Features section */}
    <div className="w-full max-w-7xl mt-12 px-4">
      <h2 className="text-3xl font-bold text-center mb-8">Key Features</h2>
      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
    </div>

      {/* Strength message */}
      <div className="mt-16 mb-20 max-w-5xl px-10 py-14 mx-auto text-center bg-gradient-to-br from-slate-100 to-white rounded-2xl shadow-xl border border-slate-200">
        <h2 className="text-4xl font-extrabold mb-6 text-slate-900 tracking-tight">
          Why Our System Stands Out ?
        </h2>
        <p className="text-lg text-slate-700 leading-relaxed max-w-3xl mx-auto">
          Our platform empowers you to understand your customers deeply, make smarter marketing decisions, and grow your business effectively.
          Combining advanced technology with simplicity, we turn complex data into clear, actionable insights —
          so you can focus on what matters most: <br /><span className="font-semibold text-sky-600">YOUR SUCCESS</span>.
        </p>
      </div>
      <Footer />
    </div>
  )
}
export default Home
