import { env } from '@/configs/env';
import { WorkspaceMembersRole } from '@/types/workspace';
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
  logger.info(`Sending mail for incident at ${to}`);

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

export const sendInviteEmail = async (
  to: string,
  inviterName: string,
  role: WorkspaceMembersRole
) => {
  const inviteUrl = `${env.CLIENT_URL}/accept-invite?email=${encodeURIComponent(to)}`;
  logger.info(`Sending invite email to ${to} with ${inviteUrl}`);

  let roleMessage = '';
  let subject = '';

  switch (role) {
    case WorkspaceMembersRole.NOTIFY_ONLY:
      subject = 'You have been added as a notify-only member';
      roleMessage = `
You have been added as a notify-only member. 
You will receive alerts but no login is required.`;
      break;
    case WorkspaceMembersRole.READER:
      subject = 'You have been invited as a Reader';
      roleMessage = `
You have been invited as a Reader. 
You can log in, view projects, and monitor uptime.`;
      break;
    case WorkspaceMembersRole.EDITOR:
      subject = 'You have been invited as an Editor';
      roleMessage = `
You have been invited as an Editor. 
You can log in, manage projects, and collaborate with your team.`;
      break;
    default:
      subject = 'You have been invited to join Uptime Alert';
      roleMessage = '';
  }

  try {
    const mailOptions = {
      from: `"Uptime Alert" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text: `
Hi there,

${inviterName} has invited you to join Uptime Alert.${roleMessage}

Accept the invitation by clicking the link below:

${inviteUrl}

If you were not expecting this invitation, you can safely ignore this email.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info('Invite email sent successfully');
    return info;
  } catch (error) {
    logger.error('Failed to send invite email', error);
    throw new Error('Failed to send invite email');
  }
};
