import React, { useState, useRef, useEffect, useCallback } from "react";

const Modal = ({ message, onConfirm }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
    <div className="relative p-6 bg-white rounded-lg shadow-xl max-w-sm mx-auto text-center">
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

const Verification = () => {
  const [email, setEmail] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [message, setMessage] = useState("");
  const [isNextEnabled, setIsNextEnabled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUserVerified, setIsUserVerified] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const getCameraAccess = useCallback(async () => {
    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = userStream;
      if (videoRef.current) {
        videoRef.current.srcObject = userStream;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing the camera: ", err);
      setMessage("Error accessing the camera. Please check permissions.");
      setIsCameraActive(false);
      setShowModal(true);
    }
  }, []);

  const handleEmailVerification = async () => {
    if (!email) {
      setMessage("Please enter an email.");
      setShowModal(true);
      return;
    }

    try {
      setIsVerifying(true);
      setMessage("Verifying email...");
      const res = await fetch("http://localhost:8000/api/check-user-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.userExists) {
        setIsUserVerified(true);
        setMessage("User found. Please capture your photo.");
        getCameraAccess();
      } else {
        setMessage("User not found. Please try a different email.");
        setIsUserVerified(false);
        setShowModal(true);
      }
    } catch (error) {
      setMessage("Email verification failed: " + error.message);
      setIsUserVerified(false);
      setShowModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!email) {
      setMessage("Please enter an email before capturing photo.");
      setShowModal(true);
      return null;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const photoDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedPhoto(photoDataUrl);
      return photoDataUrl;
    }
    return null;
  }, [email]);

  const verifyPhoto = async (photo) => {
    if (!photo) {
      setMessage("No photo to verify.");
      setShowModal(true);
      return;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    const base64String = photo.split(",")[1];
    try {
      setIsVerifying(true);
      setMessage("Verifying photo...");
      const res = await fetch("http://localhost:8000/api/verify-aadhar-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, photo_base64: base64String }),
      });
      const data = await res.json();
      setMessage(data.message);
      setShowModal(true);
      setIsNextEnabled(data.result === "success");
    } catch (error) {
      setMessage("Verification failed: " + error.message);
      setIsNextEnabled(false);
      setShowModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (!isNextEnabled) {
      setCapturedPhoto(null);
      setMessage("");
      const reinitializeCamera = async () => {
        try {
          const userStream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = userStream;
          if (videoRef.current) {
            videoRef.current.srcObject = userStream;
            setIsCameraActive(true);
          }
        } catch (err) {
          console.error("Error re-initializing camera: ", err);
          setMessage("Failed to re-initialize camera.");
          setIsCameraActive(false);
          setShowModal(true);
        }
      };
      reinitializeCamera();
    }
  };

  const handleCaptureAndVerify = () => {
    if (!isCameraActive) {
      setMessage("Camera not active. Please check permissions.");
      setShowModal(true);
      return;
    }
    setMessage("Capturing photo in 5 seconds...");
    let currentCountdown = 4;
    const timer = setInterval(() => {
      if (currentCountdown >= 0) {
        setMessage(`Capturing photo in ${currentCountdown} seconds...`);
        currentCountdown--;
      } else {
        clearInterval(timer);
        const photo = capturePhoto();
        if (photo) {
          verifyPhoto(photo);
        }
      }
    }, 1000);
  };

  const handleNext = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("OTP sent to your email or phone.");
        setShowModal(true);
        // Optional: navigate("/otp-verification"); if using React Router
      } else {
        setMessage("Failed to send OTP.");
        setShowModal(true);
      }
    } catch (error) {
      setMessage("Error sending OTP: " + error.message);
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 font-sans antialiased">
      <div className="w-full max-w-lg p-8 bg-white rounded-2xl shadow-xl space-y-6">
        <h2 className="text-3xl font-bold text-center text-gray-800">Verify User</h2>
        <p className="text-center text-gray-500">
          First, enter your email. If the user exists, you will be prompted for a photo.
        </p>

        {!isUserVerified ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-full"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMessage("");
              }}
              disabled={isVerifying}
            />
            <button
              onClick={handleEmailVerification}
              disabled={!email || isVerifying}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg text-white font-semibold transition-all duration-300 transform
                ${email && !isVerifying
                  ? "bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg"
                  : "bg-gray-400 cursor-not-allowed"
                }`}
            >
              Verify Email
            </button>
          </div>
        ) : (
          <div>
            <div className="w-full flex justify-center mt-6">
              {isVerifying ? (
                <div className="flex flex-col items-center justify-center w-full h-[240px] bg-gray-200 rounded-xl shadow-lg border-2 border-gray-200">
                  <svg className="animate-spin h-10 w-10 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-4 text-gray-600 font-semibold">Verifying...</p>
                </div>
              ) : capturedPhoto ? (
                <img
                  src={capturedPhoto}
                  alt="Captured verification"
                  className="max-w-full rounded-xl shadow-lg border-2 border-gray-200"
                  style={{ width: '320px', height: '240px' }}
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="rounded-xl shadow-lg border-2 border-gray-200 w-full"
                  style={{ width: '320px', height: '240px' }}
                />
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div className="w-full flex justify-center pt-4 gap-4">
              <button
                onClick={handleCaptureAndVerify}
                disabled={isVerifying || !streamRef.current}
                className={`w-full max-w-xs px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform
                  ${!isVerifying && streamRef.current
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg"
                    : "bg-gray-400 text-white cursor-not-allowed"
                  }`}
              >
                Capture & Verify
              </button>

              {isNextEnabled && (
                <button
                  onClick={handleNext}
                  className="w-full max-w-xs px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}

        {message && (
          <p
            className={`text-center font-medium mt-4
              ${message.toLowerCase().includes("success") || message.toLowerCase().includes("verifying")
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
          onConfirm={handleModalClose}
        />
      )}
    </div>
  );
};

export default Verification;
