import { Resend } from "resend";

const hasResend = !!process.env.RESEND_API_KEY;
const resend = hasResend ? new Resend(process.env.RESEND_API_KEY) : null;
const MAIL_FROM = process.env.MAIL_FROM || "no-reply@goonies.local";

export async function sendResetEmail(to, resetUrl) {
  if (!to) return;
  const subject = "Réinitialisation de votre mot de passe — Goonies";
  const html = `
    <p>Bonjour,</p>
    <p>Pour réinitialiser votre mot de passe, cliquez sur le lien ci-dessous :</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Ce lien expirera dans 1 heure.</p>
    <p>— L'équipe Goonies</p>
  `;

  if (!hasResend) {
    console.log("📧 [DEV] Reset email ->", { to, resetUrl });
    return;
  }

  await resend.emails.send({
    from: MAIL_FROM,
    to,
    subject,
    html,
  });
}
