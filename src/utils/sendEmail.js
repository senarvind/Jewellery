const nodemailer = require("nodemailer");
const dns = require("dns");
require("dotenv").config();

try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignored in runtimes without this method
}

/**
 * Returns HTML template for password reset email
 */
function getResetEmailHtml(otpCode, userName = "Valued Customer") {
  return `
    <div style="font-family: Arial, sans-serif; background-color: #FFF8F0; padding: 30px; border-radius: 16px; color: #35191C; max-width: 500px; margin: 0 auto; border: 1px solid #E8CFC5;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #7C1B2A; margin: 0; font-size: 26px;">✦ Keshar Jewellers ✦</h1>
        <p style="color: #D4AF37; font-size: 14px; margin-top: 4px;">Exquisite Heritage & Fine Craftsmanship</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #E8CFC5; margin: 20px 0;" />
      <h2 style="color: #7C1B2A; font-size: 20px;">Hello ${userName},</h2>
      <p style="font-size: 15px; line-height: 1.5;">You requested to reset your password for your Keshar Jewellers account.</p>
      <p style="font-size: 14px; color: #6F4A4A;">Use the 6-digit verification code below to reset your password. This code is valid for <strong>15 minutes</strong>.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7C1B2A; background-color: #FFF0EA; padding: 12px 28px; border-radius: 12px; border: 2px dashed #D4AF37; display: inline-block;">
          ${otpCode}
        </span>
      </div>

      <p style="font-size: 13px; color: #777;">If you did not request this password reset, please ignore this email or contact our support.</p>
      <hr style="border: 0; border-top: 1px solid #E8CFC5; margin: 20px 0;" />
      <p style="text-align: center; font-size: 12px; color: #999;">© ${new Date().getFullYear()} Keshar Jewellers. All rights reserved.</p>
    </div>
  `;
}

let cachedBrevoSender = null;

async function getBrevoSender(apiKey) {
  if (process.env.BREVO_SENDER_EMAIL) {
    return process.env.BREVO_SENDER_EMAIL.trim();
  }
  if (cachedBrevoSender) {
    return cachedBrevoSender;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/senders", {
      headers: { "api-key": apiKey.trim() },
    });
    if (res.ok) {
      const data = await res.json();
      const activeSender = data.senders?.find((s) => s.active);
      if (activeSender?.email) {
        cachedBrevoSender = activeSender.email;
        return cachedBrevoSender;
      }
    }
  } catch (err) {
    // Fall back to known default verified sender
  }
  return "arvindsen1075@gmail.com";
}

/**
 * Sends email via Brevo REST API (HTTPS port 443 - Works on Render Free Tier!)
 */
async function sendViaBrevo(toEmail, otpCode, userName) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const senderEmail = await getBrevoSender(apiKey);
  const htmlContent = getResetEmailHtml(otpCode, userName);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey.trim(),
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Keshar Jewellers", email: senderEmail },
        replyTo: { name: "Keshar Jewellers Support", email: "kesharjewellers2003@gmail.com" },
        to: [{ email: toEmail, name: userName }],
        subject: "✦ Keshar Jewellers - Password Reset OTP Code",
        htmlContent,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`✅ Reset OTP Email sent via Brevo HTTPS API to ${toEmail} (Sender: ${senderEmail})`);
      return { success: true, mode: "brevo" };
    }
    console.error("❌ Brevo API error:", data);
    return { success: false, error: data.message || "Brevo email sending failed" };
  } catch (err) {
    console.error("❌ Brevo fetch error:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends email via Resend REST API (HTTPS port 443 - Works on Render Free Tier!)
 */
async function sendViaResend(toEmail, otpCode, userName) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const sender = process.env.RESEND_FROM || "Keshar Jewellers <onboarding@resend.dev>";
  const html = getResetEmailHtml(otpCode, userName);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: [toEmail],
        subject: "✦ Keshar Jewellers - Password Reset OTP Code",
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`✅ Reset OTP Email sent via Resend HTTPS API to ${toEmail}`);
      return { success: true, mode: "resend" };
    }
    console.error("❌ Resend API error:", data);
    return { success: false, error: data.message || "Resend email sending failed" };
  } catch (err) {
    console.error("❌ Resend fetch error:", err.message);
    return { success: false, error: err.message };
  }
}

function getGmailIpv4() {
  return new Promise((resolve) => {
    dns.lookup("smtp.gmail.com", { family: 4 }, (err, address) => {
      if (err || !address) {
        resolve("smtp.gmail.com");
      } else {
        resolve(address);
      }
    });
  });
}

/**
 * Sends a password reset OTP email
 * Tries in order:
 * 1. Brevo HTTP API (Port 443 - Never blocked)
 * 2. Resend HTTP API (Port 443 - Never blocked)
 * 3. Gmail Nodemailer SMTP (Localhost / Paid Render)
 */
async function sendResetOtpEmail(toEmail, otpCode, userName = "Valued Customer") {
  // Always log OTP in server console for convenience
  console.log(`\n==================================================`);
  console.log(`🔑 FORGOT PASSWORD OTP CODE FOR: ${toEmail}`);
  console.log(`👉 OTP CODE: ${otpCode}`);
  console.log(`==================================================\n`);

  // 1. Try Brevo HTTPS API if configured
  if (process.env.BREVO_API_KEY) {
    const brevoResult = await sendViaBrevo(toEmail, otpCode, userName);
    if (brevoResult && brevoResult.success) return brevoResult;
    console.warn("⚠️ Brevo sending failed or rejected, trying fallbacks...");
  }

  // 2. Try Resend HTTPS API if configured
  if (process.env.RESEND_API_KEY) {
    const resendResult = await sendViaResend(toEmail, otpCode, userName);
    if (resendResult && resendResult.success) return resendResult;
    console.warn("⚠️ Resend sending failed or rejected, trying fallbacks...");
  }

  // 3. Fallback to Gmail SMTP (Localhost or Paid Render)
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const isProduction = process.env.NODE_ENV === "production";

  if (!emailUser || !emailPass) {
    console.log("ℹ️ No email credentials configured in backend environment.");
    if (isProduction) {
      return {
        success: false,
        error: "Email service is not configured on the server. Please configure BREVO_API_KEY or EMAIL_USER.",
      };
    }

    return { success: true, mode: "console" };
  }

  try {
    const cleanPass = emailPass.replace(/\s+/g, "");
    const cleanUser = emailUser.trim();
    const smtpHost = await getGmailIpv4();

    const createGmailTransporter = (port, secure) => {
      return nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: cleanUser,
          pass: cleanPass,
        },
        tls: {
          servername: "smtp.gmail.com",
        },
        connectionTimeout: 10000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
      });
    };

    const mailOptions = {
      from: `"Keshar Jewellers Support" <${cleanUser}>`,
      to: toEmail,
      subject: "✦ Keshar Jewellers - Password Reset OTP Code",
      html: getResetEmailHtml(otpCode, userName),
    };

    try {
      const transporter465 = createGmailTransporter(465, true);
      await transporter465.sendMail(mailOptions);
      console.log(`✅ Reset OTP Email successfully sent via Gmail (port 465) to ${toEmail}`);
      return { success: true, mode: "gmail-465" };
    } catch (primaryErr) {
      console.warn(`⚠️ Port 465 failed (${primaryErr.message}), falling back to port 587...`);
      const transporter587 = createGmailTransporter(587, false);
      await transporter587.sendMail(mailOptions);
      console.log(`✅ Reset OTP Email successfully sent via Gmail (port 587) to ${toEmail}`);
      return { success: true, mode: "gmail-587" };
    }
  } catch (error) {
    console.error("❌ Failed to send email via SMTP transporter:", error.message);
    const friendlyError = error.message.includes("timeout") || error.message.includes("ENETUNREACH")
      ? "Outbound SMTP blocked by cloud host. Please configure BREVO_API_KEY or RESEND_API_KEY."
      : error.message;
    return { success: false, mode: "smtp-failed", error: friendlyError };
  }
}

module.exports = {
  sendResetOtpEmail,
};
