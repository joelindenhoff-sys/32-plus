import 'server-only';
import { connect, type TLSSocket } from 'node:tls';

type ContactEmail = {
  name: string;
  email: string;
  user_type: string;
  subject: string;
  message: string;
};

type SmtpResponse = { code: number; text: string };

function smtpReader(socket: TLSSocket) {
  let buffer = '';
  const lines: string[] = [];
  const waiters: Array<(line: string) => void> = [];

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let end = buffer.indexOf('\r\n');
    while (end >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const waiter = waiters.shift();
      if (waiter) waiter(line); else lines.push(line);
      end = buffer.indexOf('\r\n');
    }
  });

  const nextLine = () => new Promise<string>((resolve) => {
    const line = lines.shift();
    if (line !== undefined) resolve(line); else waiters.push(resolve);
  });

  return async function readResponse(): Promise<SmtpResponse> {
    const first = await nextLine();
    const code = Number(first.slice(0, 3));
    if (!Number.isInteger(code)) throw new Error('Invalid SMTP response');
    const response = [first];
    if (first[3] === '-') {
      let line = await nextLine();
      response.push(line);
      while (!line.startsWith(`${code} `)) {
        line = await nextLine();
        response.push(line);
      }
    }
    return { code, text: response.join('\n') };
  };
}

function expect(response: SmtpResponse, codes: number[]) {
  if (!codes.includes(response.code)) throw new Error(`SMTP rejected request (${response.code})`);
}

function headerValue(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(headerValue(value), 'utf8').toString('base64')}?=`;
}

function dotStuff(value: string) {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

export async function sendContactEmail(input: ContactEmail) {
  const host = process.env.SMTP_HOST || 'gmadm1046.siteground.biz';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || 'support@32-plus.com';
  const password = process.env.SMTP_PASSWORD;
  const recipient = process.env.SUPPORT_EMAIL || 'support@32-plus.com';
  if (!password) throw new Error('SMTP is not configured');

  const socket = connect({ host, port, servername: host, rejectUnauthorized: true });
  socket.setTimeout(10_000);
  const readResponse = smtpReader(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
    socket.once('timeout', () => reject(new Error('SMTP connection timed out')));
  });

  const command = async (value: string, codes: number[]) => {
    socket.write(`${value}\r\n`);
    const response = await readResponse();
    expect(response, codes);
  };

  try {
    expect(await readResponse(), [220]);
    await command('EHLO 32-plus.com', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(user).toString('base64'), [334]);
    await command(Buffer.from(password).toString('base64'), [235]);
    await command(`MAIL FROM:<${user}>`, [250]);
    await command(`RCPT TO:<${recipient}>`, [250, 251]);
    await command('DATA', [354]);

    const body = [
      'New enquiry received through 32-plus.com',
      '',
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `User type: ${input.user_type}`,
      `Subject: ${input.subject}`,
      '',
      input.message,
    ].join('\r\n');
    const headers = [
      `From: 32+ Website <${user}>`,
      `To: ${recipient}`,
      `Reply-To: ${headerValue(input.email)}`,
      `Subject: ${encodeHeader(`32+ enquiry: ${input.subject}`)}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 8bit',
    ].join('\r\n');
    socket.write(`${headers}\r\n\r\n${dotStuff(body)}\r\n.\r\n`);
    expect(await readResponse(), [250]);
    await command('QUIT', [221]);
  } finally {
    socket.end();
  }
}
