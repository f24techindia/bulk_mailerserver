const nodemailer = require('nodemailer');

class EmailConfig {
  createTransporter(config) {
    return nodemailer.createTransporter({
      host: config.smtpHost,
      port: parseInt(config.smtpPort),
      secure: config.smtpPort == 465,
      auth: {
        user: config.email,
        pass: config.password
      },
      pool: true,
      maxConnections: 5,
      rateDelta: parseInt(process.env.EMAIL_RATE_DELTA) || 1000,
      rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT) || 10
    });
  }

  async verifyTransporter(transporter) {
    return await transporter.verify();
  }
}

module.exports = new EmailConfig();
