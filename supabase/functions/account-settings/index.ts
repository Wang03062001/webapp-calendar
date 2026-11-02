import { createAccountHandler } from '../_shared/account-handler.js';
import { createSmtpSender } from '../_shared/account-mailer.js';
import nodemailer from 'npm:nodemailer@10.3.1';

const smtpUser = Deno.env.get('SMTP_USER');
const smtpSender = createSmtpSender({
  user: smtpUser, password: Deno.env.get('SMTP_PASS'),
  host: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
  port: Number(Deno.env.get('SMTP_PORT') || '465'),
  from: Deno.env.get('EMAIL_FROM') || smtpUser,
}, options => nodemailer.createTransport(options));
Deno.serve(createAccountHandler({
  url: Deno.env.get('SUPABASE_URL'), serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  publicKey: Deno.env.get('SUPABASE_ANON_KEY'), sendEmail: smtpSender,
  mailKey: Deno.env.get('RESEND_API_KEY'), mailFrom: Deno.env.get('EMAIL_FROM'),
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || 'https://wang03062001.github.io').split(',').map(value => value.trim()),
}));
