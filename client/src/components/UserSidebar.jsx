import React, { useState } from 'react';
import Navbar from '../components/Navbar';

const UserSidebar = () => {
  const [isOpen, setIsOpen] = useState(false); // Toggle sidebar expand/collapse
  const [segOpen, setSegOpen] = useState(false); // Toggle segmentation submenu
  const [feedbackOpen, setFeedbackOpen] = useState(false); // Toggle feedback submenu

  return (
    <div className="flex">
      <Navbar />

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`fixed top-16 left-0 z-40 flex flex-col justify-between h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-800 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-16'
        }`}
      >

        <div className="px-2 py-4 overflow-y-auto">
          <ul className="pt-2 space-y-2 font-medium">
            {/* Home */}
            <li>
              <a
                href="/user-home"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Home"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 12l9-9 9 9M4.5 10.5v9.75a.75.75 0 00.75.75h4.5v-4.875A1.125 1.125 0 0111.625 15h.75A1.125 1.125 0 0113.5 16.125V21h4.5a.75.75 0 00.75-.75V10.5"
                  />
                </svg>
                {isOpen && <span className="ml-3">Home</span>}
              </a>
            </li>

            {/* Dataset */}
            <li>
              <a
                href="/dataset-tab"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Dataset"
              >
                <svg xmlns="http://www.w3.org/2000/svg" 
                  fill="none" viewBox="0 0 24 24" 
                  strokeWidth="1.5" 
                  stroke="currentColor" 
                  className="w-6 h-6">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>

                {isOpen && <span className="ml-3">Dataset</span>}
              </a>
            </li>

            {/* Segmentation with toggle */}
            <li>
              <a
                href="/dataset-selection"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Dataset"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>

                {isOpen && <span className="ml-3">Segmentation</span>}
              </a>
            </li>

            {/* Report */}
            <li>
              <a
                href="/reports"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Report"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>

                {isOpen && <span className="ml-3">Report</span>}
              </a>
            </li>

            {/* Feedback */}
            <li>
              <button
                type="button"
                onClick={() => setFeedbackOpen(!feedbackOpen)}
                className="flex items-center w-full p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Feedback"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-3.555-.64l-3.71 1.153a.75.75 0 0 1-.96-.96l1.152-3.71a9.76 9.76 0 0 1-.641-3.554c0-4.97 3.693-9 8.25-9s9 4.03 9 9Z" />
                </svg>

                {isOpen && (
                  <>
                    <span className="ml-3 flex-1 text-left">Feedback</span>
                    <svg
                      className={`w-3 h-3 ml-auto transition-transform duration-200 ${
                        feedbackOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 10 6"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1l4 4 4-4" />
                    </svg>
                  </>
                )}
              </button>

              {isOpen && (
                <ul className={`${feedbackOpen ? 'block' : 'hidden'} py-2 space-y-2 pl-11`}>
                  <li>
                    <a href="/submit-feedback" className="block p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                      Submit Feedback
                    </a>
                  </li>
                  <li>
                    <a href="/view-feedback-status" className="block p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
                      View Feedback Status
                    </a>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>

        {/* Bottom "My Profile" tab */}
        <div className="px-2 py-4 border-gray-300 dark:border-gray-700">
          <a
            href="/my-profile"
            className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
            title="My Profile"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
              />
            </svg>
            {isOpen && <span className="ml-3">My Profile</span>}
          </a>
        </div>
      </aside>

      {/* Backdrop overlay below navbar when drawer is open */}
      {isOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0 bg-black/30 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Content area, adjust margin-left depending on sidebar width */}
      <main className={`flex-grow transition-all duration-300 ml-16`}>
        {/* Your main content goes here */}
      </main>
    </div>
  );
};

export default UserSidebar;
