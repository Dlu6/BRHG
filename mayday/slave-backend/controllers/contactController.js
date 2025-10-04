import nodemailer from "nodemailer";
import fetch from "node-fetch";

export const submitContactForm = async (req, res) => {
  const { name, email, subject, message, recaptchaToken } = req.body;

  if (!name || !email || !subject || !message || !recaptchaToken) {
    return res
      .status(400)
      .json({ message: "All fields, including reCAPTCHA, are required." });
  }

  try {
    // 1. Verify reCAPTCHA token
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;

    const recaptchaVerification = await fetch(verificationURL, {
      method: "POST",
    });
    const recaptchaData = await recaptchaVerification.json();

    if (!recaptchaData.success) {
      console.error(
        "reCAPTCHA verification failed:",
        recaptchaData["error-codes"]
      );
      return res
        .status(400)
        .json({ message: "reCAPTCHA verification failed. Please try again." });
    }

    // 2. If reCAPTCHA is valid, send email using Nodemailer
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail", // e.g., 'gmail', 'sendgrid', 'Outlook365'
      auth: {
        user: process.env.EMAIL_USER, // Your email address from .env
        pass: process.env.EMAIL_PASS, // Your email password or app password from .env
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM_ADDRESS, // Sender address (e.g., "Your Website <no-reply@yourdomain.com>")
      to: "medhi.matovu@gmail.com", // Your email address where you want to receive messages
      replyTo: email, // Set the user's email as Reply-To
      subject: `New Contact Form Submission: ${subject}`,
      html: `
        <p>You have a new contact form submission:</p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Subject:</strong> ${subject}</li>
        </ul>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({
      message: "Message sent successfully! We will get back to you soon.",
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    res.status(500).json({
      message: "Server error. Failed to send message. Please try again later.",
    });
  }
};
