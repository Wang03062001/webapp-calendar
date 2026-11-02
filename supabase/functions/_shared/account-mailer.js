// SMTP credentials and the transport stay inside the Edge Function.
export function createSmtpSender(config, createTransport) {
  const { user, password, host = 'smtp.gmail.com', port = 465, from = user } = config;
  if (!user || !password || !from || ![465, 587].includes(Number(port)) || /[\r\n]/.test(`${host}${from}`)) return null;
  const transport = createTransport({
    host, port: Number(port), secure: Number(port) === 465, requireTLS: true,
    auth: { user, pass: host === 'smtp.gmail.com' ? password.replace(/\s/g, '') : password },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    logger: false, debug: false,
  });
  return async message => {
    const result = await transport.sendMail({ ...message, from, disableFileAccess: true, disableUrlAccess: true });
    return result.accepted?.some(address => String(address).toLowerCase() === message.to.toLowerCase()) === true;
  };
}
