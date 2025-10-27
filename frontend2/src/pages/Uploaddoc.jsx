import React, { useState } from "react";
import axios from "axios";

const Uploaddoc = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // ===============================
  // 🔹 SEND OTP
  // ===============================
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg("");
    if (!email) {
      setError("Please enter a valid email.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:3000/api/send-otp", { email });
      if (res.data.success) {
        setOtpSent(true);
        setSuccessMsg("OTP sent successfully! Check your email.");
      } else {
        setError(res.data.message || "Failed to send OTP. Try again.");
      }
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🔹 VERIFY OTP
  // ===============================
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg("");

    if (!otp) {
      setError("Please enter the OTP.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:3000/api/verify-otp", { email, otp });
      if (res.data.success) {
        setOtpVerified(true);
        setSuccessMsg("✅ OTP verified successfully! You can now upload your Aadhaar card.");
      } else {
        setError(res.data.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      setError("Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🔹 UPLOAD AADHAAR DOCUMENT
  // ===============================
  const handleUpload = async (e) => {
    e.preventDefault();
    setError(null);
    setUploaded(false);
    setSuccessMsg("");
    setUploadProgress(0);

    const formData = new FormData(e.target);
    const file = formData.get("document");

    // ✅ Append verified email
    formData.append("email", email);

    // ✅ Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!file || !allowedTypes.includes(file.type)) {
      setError("Please upload only Aadhaar card (PDF, JPG, or PNG).");
      return;
    }

    try {
      setLoading(true);
      console.log("Uploading file:", file.name, "for email:", email);
      const res = await axios.post("http://127.0.0.1:8000/api/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });

      if (res.data.success || !res.data.error) {
        setUploaded(true);
        setSuccessMsg("✅ Aadhaar verified and registered successfully!");
      } else {
        setError(res.data.error || "Failed to verify document.");
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.error || "Something went wrong during upload.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 🔹 UI
  // ===============================
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100">
      <div className="bg-white shadow-2xl rounded-3xl p-8 w-full max-w-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Aadhaar Verification
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Verify your email before uploading your Aadhaar card.
        </p>

        {/* Step 1: Email + OTP */}
        {!otpVerified && (
          <div className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-gray-700 font-medium mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>

            {/* Send OTP Button */}
            {!otpSent && (
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-2 rounded-xl font-semibold text-lg shadow-md hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            )}

            {/* OTP Verification Section */}
            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Enter OTP</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter the OTP sent to your email"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-2 rounded-xl font-semibold text-lg shadow-md hover:bg-green-700 transition disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Step 2: Aadhaar Upload (after OTP verified) */}
        {otpVerified && (
          <form onSubmit={handleUpload} className="space-y-6 mt-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Upload Aadhaar Card</label>
              <input
                type="file"
                name="document"
                accept=".pdf,image/*"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
              />
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-xl font-semibold text-lg shadow-md hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {loading ? "Uploading..." : "Upload & Verify"}
            </button>
          </form>
        )}

        {/* Message Blocks */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-400 text-red-600 text-center p-3 rounded-xl font-medium">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-6 bg-green-50 border border-green-400 text-green-700 text-center p-3 rounded-xl font-semibold">
            {successMsg}
          </div>
        )}
        {uploaded && !error && (
          <div className="mt-6 bg-green-50 border border-green-400 text-green-700 text-center p-3 rounded-xl font-semibold">
            ✅ Aadhaar verified and registered successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default Uploaddoc;
