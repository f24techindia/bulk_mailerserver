const Joi = require('joi');

const validateEmailConfig = (req, res, next) => {
  const schema = Joi.object({
    smtpHost: Joi.string().required().messages({
      'string.empty': 'SMTP host is required',
      'any.required': 'SMTP host is required'
    }),
    smtpPort: Joi.number().integer().min(1).max(65535).required().messages({
      'number.base': 'SMTP port must be a number',
      'number.min': 'SMTP port must be between 1 and 65535',
      'number.max': 'SMTP port must be between 1 and 65535',
      'any.required': 'SMTP port is required'
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    }),
    senderName: Joi.string().required().messages({
      'string.empty': 'Sender name is required',
      'any.required': 'Sender name is required'
    })
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }

  next();
};

const validateBulkEmailRequest = (req, res, next) => {
  const schema = Joi.object({
    emailConfig: Joi.object({
      smtpHost: Joi.string().required(),
      smtpPort: Joi.number().integer().min(1).max(65535).required(),
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      senderName: Joi.string().required()
    }).required(),
    emailSubject: Joi.string().required().messages({
      'string.empty': 'Email subject is required',
      'any.required': 'Email subject is required'
    }),
    emailBody: Joi.string().required().messages({
      'string.empty': 'Email body is required',
      'any.required': 'Email body is required'
    }),
    recipients: Joi.array().items(
      Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().allow('')
      }).unknown(true)
    ).min(1).max(10000).required().messages({
      'array.min': 'At least one recipient is required',
      'array.max': 'Maximum 10,000 recipients allowed per batch',
      'any.required': 'Recipients list is required'
    }),
    personalizeEmails: Joi.boolean().default(false),
    attachments: Joi.array().items(
      Joi.object({
        filename: Joi.string().required(),
        path: Joi.string().optional(),
        contentType: Joi.string().optional(),
        encoding: Joi.string().optional().valid('base64'),
        content: Joi.string().optional() // ✅ now accepts base64 string
      })
    ).optional()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(detail => detail.message)
    });
  }

  next();
};

module.exports = {
  validateEmailConfig,
  validateBulkEmailRequest
};
