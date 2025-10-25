const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Temporary OTP store
const otpStore = {};

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "prajwalparikshithc@gmail.com", // your Gmail
    pass: "msqjdmqlowgezesx",             // Gmail App Password
  },
});

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ Send OTP
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ success: false, message: "Email required" });

  const otp = generateOTP();
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min expiry

  console.log(`📨 Sending OTP ${otp} to ${email}`);

  try {
    await transporter.sendMail({
      from: `"OTP Verification" <prajwalparikshithc@gmail.com>`, // sender
      to: email,                                                // recipient
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.json({ success: true, message: "✅ OTP sent to your email!" });
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP." });
  }
});

// ✅ Verify OTP
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
