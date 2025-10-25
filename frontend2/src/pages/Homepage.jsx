import React from 'react';
import { NavLink } from 'react-router-dom';
const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md transition-all duration-300 transform hover:scale-105">
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-center text-gray-900">
          Welcome
        </h1>
        <p className="text-lg sm:text-xl text-center mb-8 text-gray-500">
          Please choose an option to get started.
        </p>
        
        <div className="w-full flex flex-col space-y-4">
          <NavLink to='/register'
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            Register
          </NavLink>
          <NavLink to='/verification'
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 transform hover:translate-y-[-2px] hover:shadow-lg"
          >
            verification
          </NavLink>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
