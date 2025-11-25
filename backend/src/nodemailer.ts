import sgMail from '@sendgrid/mail';
import { config } from 'dotenv';
config();

// Ensure API key is set
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set in environment variables');
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function sendOtpEmail(
  email: string,
  otp: string,
  retries = 3
): Promise<void> {
  // Validate inputs
  if (!email || !otp) {
    throw new Error('Email and OTP are required');
  }
console.log("email", email)
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM as string,
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
      const result = await sgMail.send(msg);
      console.log('✅ OTP email sent successfully!', result);
      return;
    } catch (err: any) {
      console.error(
        `❌ Error sending OTP email (attempt ${attempt}/${retries}):`,
        err.response?.body || err.message
      );

      if (attempt === retries) {
        throw new Error(
          `Failed to send OTP email after ${retries} attempts: ${err.message}`
        );
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}
