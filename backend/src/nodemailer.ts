import nodemailer from 'nodemailer';
import { config } from 'dotenv';
config();

export default async function sendOtpEmail(email: string, otp: string, retries = 3): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // SSL port
    secure: true, // true for SSL
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 20000, // 20 seconds
    socketTimeout: 20000, // 20 seconds
    tls: {
      rejectUnauthorized: false,
    },
    logger: true,
    debug: true,
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
      console.log('✅ OTP email sent successfully!');
      return;
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`❌ Error sending OTP email (attempt ${attempt}/${retries}): ${error.message}`);

      if (attempt === retries) {
        throw new Error(`Failed to send OTP email after ${retries} attempts: ${error.message}`);
      }

      // Exponential backoff before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
