import nodemailer from 'nodemailer';
import { config } from 'dotenv';
config();

export default async (email: string, otp: string, retries = 3) => {
  // Gmail SMTP configuration (using port 465 for SSL)
  const transporter = nodemailer.createTransporter({
    host: 'smtp.gmail.com',
    port: 465,  // Use 465 for SSL (secure: true)
    secure: true,  // Full SSL encryption
    auth: {
      user: process.env.EMAIL_USER,  // Your Gmail address (e.g., yourapp@gmail.com)
      pass: process.env.EMAIL_PASS,  // App Password (NOT your regular password)
    },
    connectionTimeout: 10000,  // 10 seconds
    socketTimeout: 10000,  // 10 seconds
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Verification',
    html: `
      <p>Hello,</p>
      <p>Your One-Time Password (OTP) for verification is: <strong>${otp}</strong></p>
      <p>This OTP is valid for a limited time.</p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      console.log('OTP email sent successfully!');
      return;  // Success, exit
    } catch (error) {
      console.error(`Error sending OTP email (attempt ${attempt}/${retries}):`, error.message);
      if (attempt === retries) {
        throw new Error(`Failed to send OTP email after ${retries} attempts: ${error.message}`);
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
