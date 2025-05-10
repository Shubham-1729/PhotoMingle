const sgMail = require('@sendgrid/mail');

// Set SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send email using SendGrid
 * @param {Object} messageData - Email message data
 * @returns {Promise} - SendGrid response
 */
const sendEmail = async (messageData) => {
  try {
    const msg = {
      from: process.env.EMAIL_FROM,
      ...messageData
    };
    return await sgMail.send(msg);
  } catch (error) {
    console.error('SendGrid Error:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw error;
  }
};

module.exports = {
  sendEmail
};