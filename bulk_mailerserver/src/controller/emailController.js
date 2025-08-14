// ==================== UPDATED controllers/emailController.js ====================

const nodemailer = require('nodemailer');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Debug nodemailer
console.log('📧 Nodemailer imported successfully');
console.log('📧 Available methods:', Object.keys(nodemailer));
console.log('📧 createTransport type:', typeof nodemailer.createTransport);

const emailController = {
  emailJobs: new Map(),
  emailHistory: [],

  // ---------------------- Test Email Configuration ----------------------
  async testEmailConfig(req, res) {
    try {
      console.log('🔍 Testing email configuration...');
      const { smtpHost, smtpPort, email, password, senderName, attachments } = req.body;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: smtpPort == 465,
        auth: {
          user: email,
          pass: password
        }
      });

      console.log('🔗 Verifying SMTP connection...');
      await transporter.verify();
      console.log('✅ SMTP verification successful');

      // Map attachments if provided in Base64
      const emailAttachments = attachments
        ? attachments.map(att => ({
            filename: att.filename,
            content: Buffer.from(att.content, 'base64'),
            encoding: 'base64',
            contentType: att.contentType || undefined
          }))
        : [];

      console.log(`📎 ${emailAttachments.length} attachments prepared for test email`);

      await transporter.sendMail({
        from: `"${senderName}" <${email}>`,
        to: email,
        subject: 'Test Email Configuration - Bulk Email Sender',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">✅ Email Configuration Test Successful</h2>
            <p>Your email configuration is working properly!</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>SMTP Host:</strong> ${smtpHost}</p>
              <p><strong>SMTP Port:</strong> ${smtpPort}</p>
              <p><strong>Sender Email:</strong> ${email}</p>
              <p><strong>Sender Name:</strong> ${senderName}</p>
            </div>
            <p>You can now proceed to send bulk emails.</p>
          </div>
        `,
        attachments: emailAttachments
      });

      transporter.close();
      console.log('✅ Test email sent successfully');

      res.json({
        success: true,
        message: 'Email configuration tested successfully! Test email sent to your address.'
      });

    } catch (error) {
      console.error('❌ Email config test error:', error);
      res.status(400).json({
        success: false,
        message: `Email configuration failed: ${error.message}`
      });
    }
  },

  // ---------------------- Start Bulk Emails ----------------------
  async sendBulkEmails(req, res) {
    try {
      console.log('📧 Starting bulk email sending process...');

      const {
        emailConfig,
        emailSubject,
        emailBody,
        recipients,
        personalizeEmails = false,
        attachments
      } = req.body;

      // Basic validation
      if (!emailConfig || !emailConfig.smtpHost || !emailConfig.smtpPort || !emailConfig.email || !emailConfig.password) {
        return res.status(400).json({ success: false, message: 'Invalid emailConfig' });
      }
      if (!emailSubject || !emailBody) {
        return res.status(400).json({ success: false, message: 'Missing emailSubject or emailBody' });
      }
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ success: false, message: 'Missing or empty recipients array' });
      }

      const jobId = uuidv4();
      console.log('🆔 Generated job ID:', jobId);

      const jobData = {
        id: jobId,
        status: 'started',
        totalEmails: recipients.length,
        sentCount: 0,
        failedCount: 0,
        errors: [],
        startTime: new Date(),
        endTime: null
      };

      emailController.emailJobs.set(jobId, jobData);

      // Pass attachments (Base64 or files)
      setImmediate(() => {
        emailController.processBulkEmails(
          jobId,
          emailConfig,
          emailSubject,
          emailBody,
          recipients,
          attachments || req.files || [],
          personalizeEmails
        );
      });

      res.json({
        success: true,
        message: 'Bulk email sending started',
        jobId,
        totalEmails: recipients.length
      });

    } catch (error) {
      console.error('❌ Bulk email error:', error);
      res.status(500).json({ success: false, message: `Failed to start bulk email sending: ${error.message}` });
    }
  },

  // ---------------------- Process Bulk Emails ----------------------
  async processBulkEmails(jobId, emailConfig, emailSubject, emailBody, recipients, attachments = [], personalizeEmails) {
    console.log('🔄 Processing bulk emails for job:', jobId);

    const job = emailController.emailJobs.get(jobId);
    if (!job) {
      console.error('❌ Job not found:', jobId);
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: parseInt(emailConfig.smtpPort),
        secure: emailConfig.smtpPort == 465,
        auth: {
          user: emailConfig.email,
          pass: emailConfig.password
        },
        pool: true,
        maxConnections: 5,
        rateDelta: 1000,
        rateLimit: 10
      });

      await transporter.verify();
      console.log('✅ SMTP connection verified');

      // Handle both Base64 and uploaded file attachments
      const emailAttachments = attachments
        ? attachments.map(att => {
            if (att.content) {
              return {
                filename: att.filename,
                content: Buffer.from(att.content, 'base64'),
                encoding: 'base64',
                contentType: att.contentType || undefined
              };
            } else if (att.path) {
              return {
                filename: att.filename || att.originalname,
                path: att.path,
                contentType: att.contentType || undefined
              };
            }
            return null;
          }).filter(Boolean)
        : [];

      console.log(`📎 ${emailAttachments.length} attachments prepared for bulk emails`);

      job.status = 'sending';
      emailController.emailJobs.set(jobId, job);

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        try {
          let personalizedSubject = emailSubject;
          let personalizedBody = emailBody;

          if (personalizeEmails) {
            Object.keys(recipient).forEach(key => {
              const placeholder = new RegExp(`{{${key}}}`, 'g');
              personalizedSubject = personalizedSubject.replace(placeholder, recipient[key] || '');
              personalizedBody = personalizedBody.replace(placeholder, recipient[key] || '');
            });
          }

          await transporter.sendMail({
            from: `"${emailConfig.senderName}" <${emailConfig.email}>`,
            to: recipient.email,
            subject: personalizedSubject,
            html: personalizedBody,
            attachments: emailAttachments
          });

          job.sentCount++;
          console.log(`✅ Email sent to ${recipient.email} (${job.sentCount}/${recipients.length})`);

        } catch (err) {
          console.error(`❌ Failed to send to ${recipient.email}:`, err.message);
          job.failedCount++;
          job.errors.push({ email: recipient.email, error: err.message });
        }

        emailController.emailJobs.set(jobId, job);

        if (i < recipients.length - 1) {
          await new Promise(r => setTimeout(r, 1000)); // Delay between sends
        }
      }

      transporter.close();
      job.status = 'completed';
      job.endTime = new Date();
      emailController.emailJobs.set(jobId, job);

      emailController.emailHistory.unshift({
        id: job.id,
        status: job.status,
        emailSubject,
        recipientCount: recipients.length,
        sentCount: job.sentCount,
        failedCount: job.failedCount,
        startTime: job.startTime,
        endTime: job.endTime
      });

      console.log(`🎉 Bulk email job ${jobId} completed`);

    } catch (error) {
      console.error('❌ Bulk email processing error:', error);
      job.status = 'failed';
      job.endTime = new Date();
      job.errors.push({ email: 'system', error: error.message });
      emailController.emailJobs.set(jobId, job);
    }
  },

  // ---------------------- Job Status ----------------------
  async getEmailStatus(req, res) {
    try {
      const { jobId } = req.params;
      const job = emailController.emailJobs.get(jobId);

      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      const progress = job.totalEmails > 0
        ? Math.round((job.sentCount + job.failedCount) / job.totalEmails * 100)
        : 0;

      res.json({
        success: true,
        job: {
          ...job,
          progress,
          errors: job.errors.slice(0, 10) // Limit error details
        }
      });

    } catch (error) {
      console.error('❌ Get email status error:', error);
      res.status(500).json({ success: false, message: 'Failed to get email status' });
    }
  },

  // ---------------------- History ----------------------
  async getEmailHistory(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      const history = emailController.emailHistory
        .slice(offset, offset + limit)
        .map(job => ({
          id: job.id,
          status: job.status,
          emailSubject: job.emailSubject,
          recipientCount: job.recipientCount,
          sentCount: job.sentCount,
          failedCount: job.failedCount,
          startTime: job.startTime,
          endTime: job.endTime
        }));

      res.json({
        success: true,
        history,
        total: emailController.emailHistory.length
      });

    } catch (error) {
      console.error('❌ Get email history error:', error);
      res.status(500).json({ success: false, message: 'Failed to get email history' });
    }
  }
};

module.exports = emailController;
