import cron from 'node-cron';
import nodemailer from 'nodemailer';
import TicketEvent from '../models/ticketEvent.model';
import User from '../models/user.model';
import { config } from 'dotenv';
config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const OFFLINE_THRESHOLD_HOURS: number = Number(process.env.OFFLINE_THRESHOLD_HOURS) || 24;  // Configurable

cron.schedule('0 6 * * *', async () => {
  console.log('Starting offline email cron at 6 AM');

  try {
    const now = new Date();
    const threshold = new Date(now.getTime() - OFFLINE_THRESHOLD_HOURS * 60 * 60 * 1000);

    const offlineUsers = await User.find({ logging: { $lt: threshold } });

    if (offlineUsers.length === 0) {
      console.log('No offline users');
      return;
    }

    for (const user of offlineUsers) {
      if (!user) continue;

      const missedEvents = await TicketEvent.find({
        timestamp: { $gt: user.logging },
        sentTo: { $nin: [user._id] }
      })
      .sort({ timestamp: -1 })
      .limit(20);

      if (missedEvents.length === 0) continue;

      const subject = `Missed Ticket Updates (${missedEvents.length} events)`;
      let body = `
        <h2>Hi ${user.email},</h2>
        <p>Missed updates since your last visit on ${user.logging.toLocaleString()}:</p>
        <ul>
      `;

      missedEvents.forEach(event => {
        body += `<li> ${event.timestamp.toLocaleString()}</li>`;
      });

      body += `
        </ul>
        <p><a href="http://localhost:3000/dashboard">Log in to view</a></p>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject,
        html: body,
      });

      console.log(`Email sent to ${user.email}`);

      await TicketEvent.updateMany(
        { _id: { $in: missedEvents.map(e => e._id) } },
        { $addToSet: { sentTo: user._id } }
      );
    }

    console.log('Cron completed');
  } catch (error) {
    console.error('Cron error:', error);
  }
});

export { transporter };
