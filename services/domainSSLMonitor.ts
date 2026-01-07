import tls from 'tls';
import whois, { WhoisResult } from 'whois';
import { performance } from 'perf_hooks';

export const runDomainSslMonitor = async (hostname: string) => {
  const startTime = performance.now();

  let domain_expiry: string | null = null;
  let ssl_expiry: string | null = null;
  let ssl_issuer: string | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      whois.lookup(hostname, (err, data: string | WhoisResult[]) => {
        if (err) return reject(err);

        const text =
          typeof data === 'string' ? data : data.map((r) => r.data).join('\n');

        const match =
          text.match(/Registry Expiry Date:\s*(.*)/i) ||
          text.match(/Expiration Date:\s*(.*)/i) ||
          text.match(/paid-till:\s*(.*)/i);

        if (match?.[1]) {
          domain_expiry = new Date(match[1]).toDateString();
        }

        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      const socket = tls.connect(
        443,
        hostname,
        { servername: hostname },
        () => {
          const cert = socket.getPeerCertificate();

          if (!cert?.valid_to) {
            socket.end();
            return reject(new Error('No SSL certificate found'));
          }

          ssl_expiry = new Date(cert.valid_to).toDateString();
          ssl_issuer = cert.issuer?.O || cert.issuer?.CN || null;

          socket.end();
          resolve();
        }
      );

      socket.on('error', reject);
    });

    return {
      status: domain_expiry && ssl_expiry ? 'UP' : 'DOWN',
      success: Boolean(domain_expiry && ssl_expiry),
      hostname,
      domain_valid_until: domain_expiry,
      ssl_valid_until: ssl_expiry,
      ssl_issuer,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: null
    };
  } catch (error: any) {
    return {
      status: 'DOWN',
      success: false,
      hostname,
      domain_valid_until: domain_expiry,
      ssl_valid_until: ssl_expiry,
      ssl_issuer,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: error?.message ?? 'Domain / SSL check failed'
    };
  }
};

export const getSSLCertificateExpiry = (domain: string): Promise<Date | null> =>
  new Promise((resolve) => {
    const socket = tls.connect(443, domain, { servername: domain }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(cert?.valid_to ? new Date(cert.valid_to) : null);
    });

    socket.on('error', () => resolve(null));
  });

export const getDomainExpiryDate = (domain: string): Promise<Date | null> => {
  return new Promise((resolve) => {
    whois.lookup(domain, (err, data) => {
      if (err || !data) {
        resolve(null);
        return;
      }

      const patterns = [
        /Registry Expiry Date:\s*(.+)/i,
        /Registrar Registration Expiration Date:\s*(.+)/i,
        /Expiration Date:\s*(.+)/i,
        /Expiry Date:\s*(.+)/i,
        /paid-till:\s*(.+)/i
      ];

      for (const pattern of patterns) {
        const match = data.match(pattern);
        if (match?.[1]) {
          const date = new Date(match[1].trim());
          if (!isNaN(date.getTime())) {
            resolve(date);
            return;
          }
        }
      }

      resolve(null);
    });
  });
};
