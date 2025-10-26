const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ======================
// 🔹 TEMPORARY OTP STORE
// ======================
const otpStore = {};

// ======================
// 🔹 NODEMAILER CONFIG
// ======================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // true for port 465, false for 587
  auth: {
    user: "prajwalparikshithc@gmail.com", // your Gmail
    pass: "msqjdmqlowgezesx",             // your App Password
  },
});

// ======================
// 🔹 HELPER FUNCTIONS
// ======================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanExpiredOTPs() {
  const now = Date.now();
  for (const email in otpStore) {
    if (otpStore[email].expiresAt < now) {
      delete otpStore[email];
    }
  }
}

// Run cleanup every 1 minute
setInterval(cleanExpiredOTPs, 60 * 1000);

// ======================
// 🔹 SEND OTP ENDPOINT
// ======================
app.post("/api/send-otp", (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ success: false, message: "Email required" });

  const otp = generateOTP();
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min validity

  // Respond instantly (don't wait for Gmail)
  res.json({ success: true, message: "OTP generation initiated." });

  // Send email in background
  transporter
    .sendMail({
      from: `"OTP Verification" <prajwalparikshithc@gmail.com>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    })
    .then(() => console.log(`✅ OTP ${otp} sent to ${email}`))
    .catch((err) => console.error("❌ Error sending OTP:", err));
});

// ======================
// 🔹 VERIFY OTP ENDPOINT
// ======================
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp)
    return res.status(400).json({ success: false, message: "Email and OTP required" });

  const stored = otpStore[email];
  if (!stored)
    return res.status(400).json({ success: false, message: "No OTP found for this email." });

  if (stored.otp === otp && stored.expiresAt > Date.now()) {
    delete otpStore[email];
    return res.json({ success: true, message: "✅ OTP verified successfully!" });
  } else {
    return res.status(400).json({ success: false, message: "❌ Invalid or expired OTP" });
  }
});

// ======================
// 🔹 START SERVER
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
