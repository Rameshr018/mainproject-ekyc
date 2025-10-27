import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";

const Modal = ({ message, onConfirm }) => (
  <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm text-center">
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
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [message, setMessage] = useState("");
  const [isNextEnabled, setIsNextEnabled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isUserVerified, setIsUserVerified] = useState(false);
  const [eyeMovement, setEyeMovement] = useState("--%");
  const [eyeColor, setEyeColor] = useState("text-gray-500");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const streamRef = useRef(null);
  const photoCapturedRef = useRef(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("verifiedEmail");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      console.log("✅ FaceAPI models loaded");
    };
    loadModels();
  }, []);

  const getCameraAccess = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      setMessage("Error accessing the camera.");
      setShowModal(true);
    }
  }, []);

  const handleEmailVerification = async () => {
    if (!email) {
      setMessage("Please enter your email.");
      setShowModal(true);
      return;
    }
    try {
      setIsVerifying(true);
      const res = await fetch("http://localhost:8000/api/check-user-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.userExists) {
        localStorage.setItem("verifiedEmail", email);
        setIsUserVerified(true);
        setMessage("User found. Please blink or move your eyes.");
        getCameraAccess();
      } else {
        setMessage("User not found. Please register first.");
        setShowModal(true);
      }
    } catch (err) {
      setMessage("Verification failed: " + err.message);
      setShowModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const photo = canvas.toDataURL("image/jpeg");
      setCapturedPhoto(photo);
      console.log("📸 Photo Captured!");
      return photo;
    }
    return null;
  }, []);

  const verifyPhoto = async (photo) => {
    if (!photo) return;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    try {
      setIsVerifying(true);
      setMessage("Verifying photo...");
      const res = await fetch("http://localhost:8000/api/verify-aadhar-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          photo_base64: photo.split(",")[1],
        }),
      });
      const data = await res.json();
      setMessage(data.message);
      setShowModal(true);
      setIsNextEnabled(data.result === "success");
    } catch (err) {
      setMessage("Verification failed: " + err.message);
      setShowModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const getEAR = (eye) => {
    const A = Math.hypot(eye[1].y - eye[5].y, eye[1].x - eye[5].x);
    const B = Math.hypot(eye[2].y - eye[4].y, eye[2].x - eye[4].x);
    const C = Math.hypot(eye[0].y - eye[3].y, eye[0].x - eye[3].x);
    return (A + B) / (2.0 * C);
  };

  const detectEyeMovement = async () => {
    if (!videoRef.current) return;
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    const overlay = overlayRef.current;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!detection) return;

    const resized = faceapi.resizeResults(detection, {
      width: overlay.width,
      height: overlay.height,
    });
    faceapi.draw.drawDetections(overlay, resized);
    faceapi.draw.drawFaceLandmarks(overlay, resized);

    const landmarks = detection.landmarks;
    const leftEAR = getEAR(landmarks.getLeftEye());
    const rightEAR = getEAR(landmarks.getRightEye());
    const ear = (leftEAR + rightEAR) / 2.0;

    const movementPercent = Math.min(Math.max((ear / 0.35) * 100, 0), 100);
    setEyeMovement(`Eye Movement: ${movementPercent.toFixed(1)}%`);

    if (movementPercent > 60) setEyeColor("text-green-600");
    else if (movementPercent > 30) setEyeColor("text-yellow-500");
    else setEyeColor("text-red-600");

    // 🔥 Capture photo when movement is less than 76%
    if (movementPercent <= 76 && !photoCapturedRef.current) {
      photoCapturedRef.current = true;
      console.log("📸 Eye movement < 76% — Capturing...");
      const photo = capturePhoto();
      if (photo) verifyPhoto(photo);
    }
  };

  useEffect(() => {
    let interval;
    if (isCameraActive) {
      const overlay = overlayRef.current;
      overlay.width = 320;
      overlay.height = 240;
      interval = setInterval(detectEyeMovement, 150);
    }
    return () => clearInterval(interval);
  }, [isCameraActive]);

  const handleNext = async () => {
    const storedEmail = localStorage.getItem("verifiedEmail");
    if (!storedEmail) {
      setMessage("No verified email found.");
      setShowModal(true);
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: storedEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("OTP sent successfully.");
        navigate("Otpverification");
      } else {
        setMessage("Failed to send OTP.");
      }
      setShowModal(true);
    } catch (err) {
      setMessage("Error sending OTP: " + err.message);
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg text-center space-y-4">
        <h2 className="text-3xl font-bold text-gray-800">Face Blink Verification</h2>

        {!isUserVerified ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isVerifying}
            />
            <button
              onClick={handleEmailVerification}
              disabled={!email || isVerifying}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg text-white font-semibold transition
                ${email && !isVerifying ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-400 cursor-not-allowed"}`}
            >
              Verify Email
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-center relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                width="320"
                height="240"
                className="rounded-lg border border-gray-300 shadow-md"
              />
              <canvas
                ref={overlayRef}
                className="absolute top-0 left-0"
                width="320"
                height="240"
              />
            </div>

            <p className={`font-semibold mt-2 ${eyeColor}`}>{eyeMovement}</p>

            <canvas ref={canvasRef} style={{ display: "none" }} />

            {isNextEnabled && (
              <button
                onClick={handleNext}
                className="px-6 py-3 mt-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
              >
                Next
              </button>
            )}
          </>
        )}

        {message && (
          <p className="text-center text-sm font-medium text-gray-600">{message}</p>
        )}
      </div>

      {showModal && <Modal message={message} onConfirm={() => setShowModal(false)} />}
    </div>
  );
};

export default Verification;
