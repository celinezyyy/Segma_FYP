import React, { useState, useContext } from 'react';
import Navbar from '../components/Navbar';
import UserSidebar from '../components/UserSidebar';
import Footer from '../components/Footer';
import { assets } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const Feedback = () => {
  const { userData, backendUrl } = useContext(AppContext);

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      axios.defaults.withCredentials = true;

      const res = await axios.post(`${backendUrl}/api/admin/submit-feedback`, {
        userId: userData?._id,
        subject: formData.subject,
        description: formData.description,
      });

      if (res.data.success) {
        setTimeout(() => {
        toast.success('Feedback submitted successfully!');
        setFormData({ subject: '', description: '' });
      }, 500); 
      } else {
        setTimeout(() => {
        toast.error(res.data.message || 'Submission failed');
      }, 500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'An error occurred');
    } finally {
      setIsSubmitting(false); // End loading
    }
  };
  // Determine if the form is valid
  const isFormValid = formData.subject.trim() !== '' && formData.description.trim() !== '';

  return (
    <div>
      <Navbar />
      <div className="flex min-h-screen">
        <UserSidebar />
        <main className="flex-grow px-4 md:px-8 pt-20 min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center">
          {/* Title */}
          <h2 className="text-3xl font-bold text-center mb-6 text-[#1f3f66]">
            Send Us Your Feedback
          </h2>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row max-w-4xl gap-12 bg-[#f0f4f8] p-6 rounded-lg border border-blue-100 shadow-lg w-full max-w-[90vw]"
            style={{ border: '1px solid #C3E5F1' }}
          >
            {/* Left: Feedback Icon */}
            <div className="flex flex-col items-center justify-center md:w-1/3 w-full mb-6 md:mb-0">
              <img
                src={assets.feedback}
                alt="Feedback Icon"
                className="max-w-[600px] w-auto h-auto object-contain"
              />
            </div>

            {/* Right: Form Fields */}
            <div className="md:w-2/3 flex flex-col gap-6 w-full">
              <label className="flex flex-col">
                <span className="font-semibold mb-1">Subject</span>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="border rounded px-3 py-2 w-full"
                  required
                  placeholder="Enter the subject"
                />
              </label>

              <label className="flex flex-col">
                <span className="font-semibold mb-1">Description</span>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="border rounded px-3 py-2 w-full min-w-0 resize-none h-60 overflow-y-auto"
                  required
                  placeholder="Describe your feedback here"
                />
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid}
                className={`self-center py-2.5 px-6 rounded-full text-black font-semibold transition-all border border-black ${
                  isFormValid ? 'hover:brightness-90' : 'opacity-50 cursor-not-allowed'
                }`}
                style={{ backgroundColor: '#C7EDC3' }}
              >
                Submit Feedback
              </button>
            </div>
          </form>
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default Feedback;
