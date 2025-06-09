import React from 'react'

const Footer = () => {
  return (
      <footer
        className="text-center text-gray-600 text-sm py-4 w-full border-t border-gray-300 bg-gray-300"
      >
        &copy; {new Date().getFullYear()} Segma. All rights reserved.
      </footer>
  )
}
export default Footer
