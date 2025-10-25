import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import {Link,NavLink} from 'react-router-dom'
const Uploaddoc = () => {
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();
  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append('email', data.email);
    if (data.document && data.document[0]) {
      formData.append('document', data.document[0]);
    }
  
    try {
      setLoading(true);
      setError(null);
  
      const res = await axios.post('http://localhost:8000/api/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });
  
      if (res.data.error) {
        // Backend returned an error message
        setError(res.data.error);
        setUploaded(false);
      } else {
        // Successful upload
        setUploaded(true);
        setError(null);
      }
    } catch (err) {
      console.error('Upload error:', err);
      const message =
        err.response?.data?.message || 'Something went wrong during upload.';
      setError(message);
      setUploaded(false);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          e-KYC Verification
        </h2>
        <p className="text-sm text-center text-gray-500">
           complete the verification process.
        </p>

        {uploaded ? (
  <>
     <div className="mt-8 p-6 text-center text-green-700 bg-green-100 rounded-lg">
  <p className="font-semibold mb-4">✅ Document uploaded successfully!</p>
</div>

<div className="flex justify-center">
  <NavLink
    to="/"
    className="mt-4 px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition duration-200 shadow-md"
  >
back  </NavLink>
</div>

  </>
): (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)} encType="multipart/form-data">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="relative block w-full px-3 py-2 mt-1 placeholder-gray-400 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address',
                  },
                })}
              />
              {errors.email && <p className="mt-2 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="document" className="block text-sm font-medium text-gray-700">
                Upload Document
              </label>
              <input
                id="document"
                type="file"
                className="relative block w-full py-2 px-3 mt-1 text-gray-900 border border-gray-300 rounded-md cursor-pointer bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                {...register('document', {
                  required: 'Document is required',
                })}
              />
              {errors.document && <p className="mt-2 text-xs text-red-600">{errors.document.message}</p>}
            </div>

            {error && (
              <div className="p-2 mt-2 text-sm text-center text-red-600 bg-red-100 rounded">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md group focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                }`}
              >
                {loading ? 'Uploading...' : 'Submit for Verification'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Uploaddoc;
