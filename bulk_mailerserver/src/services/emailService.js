const emailConfig = require('../config/email');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.emailJobs = new Map();
    this.emailHistory = [];
  }

  async testEmailConfiguration(config) {
    const transporter = emailConfig.createTransporter(config);
    
    try {
      await emailConfig.verifyTransporter(transporter);
      
      await transporter.sendMail({
        from: `"${config.senderName}" <${config.email}>`,
        to: config.email,
        subject: 'Test Email Configuration - Bulk Email Sender',
        html: this.getTestEmailTemplate(config)
      });

      transporter.close();
      return { success: true, message: 'Test email sent successfully' };
    } catch (error) {
      transporter.close();
      throw error;
    }
  }

  async sendBulkEmails(jobId, emailConfig, emailSubject, emailBody, recipients, attachments = [], personalizeEmails = false) {
    const job = {
      id: jobId,
      status: 'started',
      totalEmails: recipients.length,
      sentCount: 0,
      failedCount: 0,
      errors: [],
      startTime: new Date(),
      endTime: null
    };

    this.emailJobs.set(jobId, job);

    try {
      const transporter = emailConfig.createTransporter(emailConfig);
      
      const emailAttachments = attachments ? attachments.map(file => ({
        filename: file.originalname,
        path: file.path
      })) : [];

      job.status = 'sending';
      this.emailJobs.set(jobId, job);

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
          const { personalizedSubject, personalizedBody } = this.personalizeContent(
            emailSubject, emailBody, recipient, personalizeEmails
          );

          await transporter.sendMail({
            from: `"${emailConfig.senderName}" <${emailConfig.email}>`,
            to: recipient.email,
            subject: personalizedSubject,
            html: personalizedBody,
            attachments: emailAttachments
          });

          job.sentCount++;
          logger.info(`Email sent successfully to ${recipient.email}`);
          
        } catch (emailError) {
          job.failedCount++;
          job.errors.push({
            email: recipient.email,
            error: emailError.message
          });
          logger.error(`Failed to send email to ${recipient.email}:`, emailError);
        }

        this.emailJobs.set(jobId, job);

        // Rate limiting delay
        if (i < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      transporter.close();
      job.status = 'completed';
      job.endTime = new Date();
      
      this.emailJobs.set(jobId, job);
      this.addToHistory(job, emailSubject, recipients.length);

      logger.info(`Bulk email job ${jobId} completed: ${job.sentCount} sent, ${job.failedCount} failed`);

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.errors.push({ email: 'system', error: error.message });
      this.emailJobs.set(jobId, job);
      logger.error(`Bulk email job ${jobId} failed:`, error);
    }
  }

  personalizeContent(subject, body, recipient, personalizeEmails) {
    let personalizedSubject = subject;
    let personalizedBody = body;
    
    if (personalizeEmails) {
      Object.keys(recipient).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        personalizedSubject = personalizedSubject.replace(placeholder, recipient[key] || '');
        personalizedBody = personalizedBody.replace(placeholder, recipient[key] || '');
      });
    }

    return { personalizedSubject, personalizedBody };
  }

  getJob(jobId) {
    return this.emailJobs.get(jobId);
  }

  getHistory(limit = 50, offset = 0) {
    return {
      history: this.emailHistory.slice(offset, offset + limit),
      total: this.emailHistory.length
    };
  }

  addToHistory(job, emailSubject, recipientCount) {
    this.emailHistory.unshift({
      id: job.id,
      status: job.status,
      emailSubject,
      recipientCount,
      sentCount: job.sentCount,
      failedCount: job.failedCount,
      startTime: job.startTime,
      endTime: job.endTime
    });

    // Keep only last 1000 history items
    if (this.emailHistory.length > 1000) {
      this.emailHistory = this.emailHistory.slice(0, 1000);
    }
  }

  getTestEmailTemplate(config) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">✅ Email Configuration Test Successful</h2>
        <p>Your email configuration is working properly!</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>SMTP Host:</strong> ${config.smtpHost}</p>
          <p><strong>SMTP Port:</strong> ${config.smtpPort}</p>
          <p><strong>Sender Email:</strong> ${config.email}</p>
          <p><strong>Sender Name:</strong> ${config.senderName}</p>
        </div>
        <p>You can now proceed to send bulk emails.</p>
        <p style="color: #666; font-size: 12px;">This is an automated test email from Bulk Email Sender.</p>
      </div>
    `;
  }
}

module.exports = new EmailService();