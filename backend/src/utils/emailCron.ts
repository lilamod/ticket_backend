import cron from 'node-cron';
import nodemailer, { Transporter } from 'nodemailer';  // Import Transporter type for better typing
import TicketEvent from '../models/ticketEvent.model';
import User from '../models/user.model';
import { config } from 'dotenv';
config();
const transporter: Transporter = nodemailer.createTransport({  // Fixed: createTransport (not createTransporter)
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
// Test transporter on startup (optional, for debugging)
transporter.verify((error: Error | null, success: boolean) => {  // Fixed: Explicit types for parameters
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email transporter ready');
  }
});
const OFFLINE_THRESHOLD_HOURS = Number(process.env.OFFLINE_THRESHOLD_HOURS) || 24;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Ensure cron is scheduled only if threshold > 0
if (OFFLINE_THRESHOLD_HOURS > 0) {
  cron.schedule('0 6 * * *', async () => {  // 6 AM daily (UTC; adjust timezone if needed)
    console.log('Starting offline email cron at 6 AM');

    try {
      const now = new Date();
      const threshold = new Date(now.getTime() - OFFLINE_THRESHOLD_HOURS * 60 * 60 * 1000);

      const offlineUsers = await User.find({
        logging: { $lt: threshold },
        email: { $exists: true, $ne: null }  // Ensure user has a valid email
      }).select('email logging _id');  // Optimize: only fetch needed fields

      if (offlineUsers.length === 0) {
        console.log('No offline users found');
        return;
      }

      console.log(`Found ${offlineUsers.length} offline users`);

      for (const user of offlineUsers) {
        try {
          const missedEvents = await TicketEvent.find({
            timestamp: { $gt: user.logging },
            sentTo: { $nin: [user._id] }
          })
          .sort({ timestamp: -1 })
          .limit(20)
          .select('timestamp description ticketId');  // Fetch more details for email

          if (missedEvents.length === 0) {
            console.log(`No missed events for ${user.email}`);
            continue;
          }

          const subject = `Missed Ticket Updates (${missedEvents.length} events)`;
          let body = `
            <h2>Hi ${user.email.split('@')[0]},</h2>  <!-- Personalize without full email -->
            <p>You've missed some updates since your last visit on ${user.logging.toLocaleString()}:</p>
            <ul>
          `;

          missedEvents.forEach(event => {
            body += `
              <li>
                <strong>${event.timestamp.toLocaleString()}</strong><br>
                ${'No description'} (Ticket: ${event.ticketId || 'N/A'})
              </li>
            `;
          });

          body += `
            </ul>
            <p><a href="${APP_URL}/dashboard">Log in to view full details</a></p>
            <p>Best,<br>Your Team</p>
          `;

          const mailOptions = {
            from: `"Ticket System" <${process.env.EMAIL_USER}>`,  // Nicer from name
            to: user.email,
            subject,
            html: body,
          };

          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${user.email} for ${missedEvents.length} events`);

          // Mark events as sent to this user
          await TicketEvent.updateMany(
            { _id: { $in: missedEvents.map(e => e._id) } },
            { $addToSet: { sentTo: user._id } }
          );

        } catch (userError) {
          console.error(`Error processing user ${user.email}:`, userError);
          // Don't halt the loop for one user
        }
      }

      console.log('Offline email cron completed successfully');
    } catch (error) {
      console.error('Cron job error:', error);
      // Optional: Log to a service like Sentry for monitoring
    }
  });

  console.log('Offline email cron scheduled');
} else {
  console.log('Cron not scheduled: OFFLINE_THRESHOLD_HOURS is 0 or invalid');
}

export { transporter };