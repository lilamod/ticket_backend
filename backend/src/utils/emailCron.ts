import cron from 'node-cron';
import sgMail from '@sendgrid/mail';
import TicketEvent from '../models/ticketEvent.model';
import User from '../models/user.model';
import { config } from 'dotenv';
config();

// Set SendGrid API key
if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set in environment variables');
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


const OFFLINE_THRESHOLD_HOURS = Number(process.env.OFFLINE_THRESHOLD_HOURS) || 12;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

if (OFFLINE_THRESHOLD_HOURS > 0) {
  cron.schedule('0 6 * * *', async () => { 
    console.log('Starting offline email cron at 6 AM');

    try {
      const now = new Date();
      const threshold = new Date(now.getTime() - OFFLINE_THRESHOLD_HOURS * 60 * 60 * 1000);

      const offlineUsers = await User.find({
        logging: { $lt: threshold },
        email: { $exists: true, $ne: null }  
      }).select('email logging _id');

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
          .select('timestamp description ticketId'); 

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
                ${event || 'No description'} (Ticket: ${event.ticketId || 'N/A'})
              </li>
            `;
          });

          body += `
            </ul>
            <p><a href="${APP_URL}/dashboard">Log in to view full details</a></p>
            <p>Best,<br>Your Team</p>
          `;

          const msg = {
            from: process.env.EMAIL_FROM as string, 
            to: user.email,
            subject,
            html: body,
          };

          await sgMail.send(msg);
          console.log(`Email sent to ${user.email} for ${missedEvents.length} events`);

          await TicketEvent.updateMany(
            { _id: { $in: missedEvents.map(e => e._id) } },
            { $addToSet: { sentTo: user._id } }
          );

        } catch (userError) {
          console.error(`Error processing user ${user.email}:`, userError);
        }
      }

      console.log('Offline email cron completed successfully');
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });

  console.log('Offline email cron scheduled');
} else {
  console.log('Cron not scheduled: OFFLINE_THRESHOLD_HOURS is 0 or invalid');
}

export { sgMail as transporter };  
