require('dotenv').config();
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTP(email) {
  const otp = generateOTP();
  
  const msg = {
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: 'Your OTP for Student Ride Sharing',
    text: `Your OTP is: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #80cbc4;">Student Ride Sharing - Email Verification</h2>
        <p>Hello!</p>
        <p>Your verification code is:</p>
        <h1 style="color: #1e1e1e; background: #f5f5f5; padding: 10px; text-align: center; letter-spacing: 5px;">
          ${otp}
        </h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return otp;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send OTP');
  }
}

module.exports = { sendOTP };