import React from 'react'
import { useState } from 'react';
import Navbar from './Navbar';

const AdminSidebar = () => {
  const [isOpen, setIsOpen] = useState(false); // Toggle sidebar expand/collapse

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
                href="/admin-home"
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

            {/* User tab */}
            <li>
              <a
                href="/admin-user-list"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Users"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>

                {isOpen && <span className="ml-3">Users</span>}
              </a>
            </li>

            {/* Feedback */}
            <li>
              <a
                href="/admin-feedback-list"
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                title="Feedback"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-3.555-.64l-3.71 1.153a.75.75 0 0 1-.96-.96l1.152-3.71a9.76 9.76 0 0 1-.641-3.554c0-4.97 3.693-9 8.25-9s9 4.03 9 9Z" />
                </svg>

                {isOpen && <span className="ml-3">Feedback</span>}
              </a>
            </li>
          </ul>
        </div>

        {/* Bottom "My Profile" tab */}
        <div className="px-2 py-4 border-gray-300 dark:border-gray-700">
          <a
            href="/admin-profile"
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

export default AdminSidebar
