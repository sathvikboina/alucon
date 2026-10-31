require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Configure Brevo API Key
const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

// Transactional email instance
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (emailOptions) => {
  try {
    const emailData = {
      sender: {
        name: "AlumniConnect",
        email: "no-reply@alumniconnect.in.net", // your verified domain email
      },
      to: [
        {
          email: emailOptions.to,
        },
      ],
      subject: emailOptions.subject,
      htmlContent: emailOptions.html || `<p>${emailOptions.text || "Default message"}</p>`,
    };

    await apiInstance.sendTransacEmail(emailData);

    console.log("✅ Email sent to:", emailOptions.to);

  } catch (err) {
    console.error(
      "❌ Email error:",
      err.response?.body || err.message
    );
  }
};

module.exports = sendEmail;