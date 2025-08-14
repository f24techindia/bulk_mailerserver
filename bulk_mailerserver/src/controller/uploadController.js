const csv = require('csv-parser');
const fs = require('fs-extra');

class UploadController {
  async uploadAndParseCSV(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No CSV file uploaded'
        });
      }

      const csvFilePath = req.file.path;
      const recipients = [];
      const errors = [];

      return new Promise((resolve) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on('data', (row, index) => {
            try {
              if (!row.email || !this.isValidEmail(row.email)) {
                errors.push(`Row ${index + 2}: Invalid or missing email address`);
                return;
              }

              const recipient = {
                email: row.email.trim().toLowerCase(),
                name: row.name ? row.name.trim() : '',
                ...Object.keys(row).reduce((acc, key) => {
                  if (key !== 'email' && key !== 'name' && row[key]) {
                    acc[key.trim()] = row[key].toString().trim();
                  }
                  return acc;
                }, {})
              };

              recipients.push(recipient);

            } catch (error) {
              errors.push(`Row ${index + 2}: ${error.message}`);
            }
          })
          .on('end', async () => {
            try {
              await fs.remove(csvFilePath);
            } catch (cleanupError) {
              console.error('Failed to cleanup CSV file:', cleanupError);
            }

            const uniqueRecipients = recipients.filter((recipient, index, self) => 
              index === self.findIndex(r => r.email === recipient.email)
            );

            const duplicatesRemoved = recipients.length - uniqueRecipients.length;

            resolve(res.json({
              success: true,
              message: 'CSV file parsed successfully',
              data: {
                totalRows: recipients.length + errors.length,
                validRecipients: uniqueRecipients.length,
                duplicatesRemoved,
                errors: errors.length,
                errorDetails: errors.slice(0, 10),
                recipients: uniqueRecipients.slice(0, 100),
                columns: uniqueRecipients.length > 0 ? Object.keys(uniqueRecipients[0]) : []
              }
            }));
          })
          .on('error', (error) => {
            resolve(res.status(400).json({
              success: false,
              message: `Failed to parse CSV file: ${error.message}`
            }));
          });
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({
        success: false,
        message: `Failed to process CSV file: ${error.message}`
      });
    }
  }

  async getSampleCSV(req, res) {
    try {
      const sampleCSV = 'email,name,company,position\n' +
                       'john.doe@example.com,John Doe,Acme Corp,Manager\n' +
                       'jane.smith@example.com,Jane Smith,Tech Inc,Developer\n' +
                       'bob.wilson@example.com,Bob Wilson,StartupXYZ,CEO';

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sample_recipients.csv');
      res.send(sampleCSV);

    } catch (error) {
      console.error('Sample CSV error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate sample CSV'
      });
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = new UploadController();