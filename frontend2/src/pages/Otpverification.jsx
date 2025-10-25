import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Modal = ({ message, onConfirm }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl text-center max-w-sm">
      <p className="text-lg font-semibold mb-4">{message}</p>
      <button
        onClick={onConfirm}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        OK
      </button>
    </div>
  </div>
);

const OtpVerification = () => {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const storedEmail = localStorage.getItem("verifiedEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      setMessage("No email found. Please verify again.");
      setShowModal(true);
    }
  }, []);

  const handleVerifyOtp = async () => {
    if (!otp) {
      setMessage("Please enter the OTP.");
      setShowModal(true);
      return;
    }

    try {
      setIsVerifying(true);
      const res = await fetch("http://localhost:8000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("✅ OTP verified successfully!");
        setShowModal(true);

        // Navigate to next page after a short delay
        setTimeout(() => {
          navigate("/success"); // update route if needed
        }, 1000);
      } else {
        setMessage("❌ Invalid or expired OTP. Please try again.");
        setShowModal(true);
      }
    } catch (error) {
      setMessage("Error verifying OTP: " + error.message);
      setShowModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-sans p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Verify OTP
        </h2>
        <p className="text-center text-gray-500">
          Enter the 6-digit OTP sent to{" "}
          <span className="font-medium text-gray-700">{email}</span>
        </p>

        <div className="flex flex-col items-center space-y-4">
          <input
            type="text"
            maxLength="6"
            placeholder="Enter OTP"
            className="w-full text-center p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xl tracking-widest"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={isVerifying}
          />

          <button
            onClick={handleVerifyOtp}
            disabled={isVerifying || otp.length !== 6}
            className={`w-full py-3 rounded-lg text-white font-semibold transition-all duration-300 ${
              otp.length === 6 && !isVerifying
                ? "bg-indigo-600 hover:bg-indigo-700 shadow-md"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
          </button>
        </div>

        {message && (
          <p
            className={`text-center font-medium mt-4 ${
              message.includes("success")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {showModal && (
        <Modal
          message={message}
          onConfirm={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default OtpVerification;
