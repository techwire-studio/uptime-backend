import { env } from '@/configs/env';
import logger from '@/utils/logger';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_PASS
  }
});

export const sendIncidentAlertOnEmail = async (
  to: string,
  title: string,
  reportedAt: Date
) => {
  logger.info(`Sending mail for incident at ${title}`);

  try {
    const mailOptions = {
      from: `"Uptime Alert" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Incident Alert: ${title}`,
      text: `
        Incident Report

        Title: ${title}
        Reported At: ${reportedAt}

        Please take the necessary action immediately.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Mail sent successfully');
    return info;
  } catch (error) {
    logger.info('Failed to send incident email');
    throw new Error('Failed to send incident email');
  }
};

export const sendRecoveryAlertOnEmail = async (
  to: string,
  title: string,
  recoveredAt: Date
) => {
  logger.info(`Sending recovery mail for incident at ${title}`);

  try {
    const mailOptions = {
      from: `"Uptime Alert" <${process.env.GMAIL_USER}>`,
      to,
      subject: `Recovery Alert: ${title}`,
      text: `
        Recovery Notification

        Title: ${title}
        Recovered At: ${recoveredAt}

        The incident has been resolved and systems are back to normal.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Recovery mail sent successfully');
    return info;
  } catch (error) {
    logger.info('Failed to send recovery email');
    throw new Error('Failed to send recovery email');
  }
};

export const sendEmailForVerification = async (to: string, token: string) => {
  const verificationUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  logger.info(`Sending email verification to ${to} with ${verificationUrl}`);

  try {
    const mailOptions = {
      from: `"Uptime Alert" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Verify your email address',
      text: `
        Email Verification

        Please verify your email address by clicking the link below:

        ${verificationUrl}

        If you did not create an account, you can safely ignore this email.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Verification email sent successfully');
    return info;
  } catch (error) {
    logger.info('Failed to send verification email');
    throw new Error('Failed to send verification email');
  }
};
