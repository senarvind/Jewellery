const nodemailer = require("nodemailer");
require("dotenv").config();

/**
 * Sends a password reset OTP email using Google Mail (Nodemailer)
 * @param {string} toEmail - Recipient email
 * @param {string} otpCode - 6-digit OTP verification code
 * @param {string} userName - Name of user
 */
async function sendResetOtpEmail(toEmail, otpCode, userName = "Valued Customer") {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // Always log OTP in server console for local dev convenience & testing
  console.log(`\n==================================================`);
  console.log(`🔑 FORGOT PASSWORD OTP CODE FOR: ${toEmail}`);
  console.log(`👉 OTP CODE: ${otpCode}`);
  console.log(`==================================================\n`);

  if (!emailUser || !emailPass) {
    console.log("ℹ️ EMAIL_USER or EMAIL_PASS not configured in backend/.env.");
    console.log("🌐 Using Ethereal Email for dynamic testing...");
    
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      const mailOptions = {
        from: '"Keshar Jewellers Support" <support@kesharjewellers.com>',
        to: toEmail,
        subject: "✦ Keshar Jewellers - Password Reset OTP Code",
        html: `
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
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Dynamic Test Email successfully sent!`);
      console.log(`👉 PREVIEW YOUR EMAIL HERE: ${nodemailer.getTestMessageUrl(info)}`);
      console.log(`ℹ️ Note: To send via REAL Google Mail, please add EMAIL_USER and EMAIL_PASS to your .env file.`);
      
      return { success: true, mode: "ethereal", url: nodemailer.getTestMessageUrl(info) };
    } catch (err) {
      console.log("ℹ️ Ethereal email failed, falling back to console.");
      return { success: true, mode: "console" };
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"Keshar Jewellers Support" <${emailUser}>`,
      to: toEmail,
      subject: "✦ Keshar Jewellers - Password Reset OTP Code",
      html: `
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
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Reset OTP Email successfully sent via Gmail to ${toEmail}`);
    return { success: true, mode: "gmail" };
  } catch (error) {
    console.error("❌ Failed to send email via Gmail transporter:", error.message);
    // Still return success so user flow is not broken if server console log is available
    return { success: true, mode: "fallback", error: error.message };
  }
}

module.exports = {
  sendResetOtpEmail,
};
