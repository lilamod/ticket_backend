import nodemailer from 'nodemailer';
import { config } from 'dotenv';
config();

export default async (email: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    tls: {
      rejectUnauthorized: false,  // Allow self-signed certs if needed, but secure in production
    },
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 20000,
    socketTimeout: 20000,
    logger: true,
    debug: true,
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
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
