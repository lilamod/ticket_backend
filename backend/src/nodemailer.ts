import nodemailer from 'nodemailer';
import { config } from 'dotenv';
config();

export default async (email: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false,  // Use TLS on port 587
    auth: {
      user: 'apikey',
      pass: process.env.SENDGRID_API_KEY,
    },
    connectionTimeout: 20000,
    socketTimeout: 20000,
    logger: true,
    debug: true,
  });

  const mailOptions = {
    from: 'your-verified-sender@example.com',  // Use a verified sender in SendGrid
    to: email,
    subject: 'Your OTP for Verification',
    html: `<p>Hello,</p><p>Your One-Time Password (OTP) for verification is: <strong>${otp}</strong></p><p>This OTP is valid for a limited time.</p><p>If you did not request this, please ignore this email.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully!');
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};
