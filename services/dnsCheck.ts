import {
  DnsRecordEnum,
  DnsRecordType,
  MonitorCheckStatus
} from '@/types/monitor';
import dns from 'dns';
import { performance } from 'perf_hooks';

export const runDnsMonitor = async (monitor: {
  hostname: string;
  records: DnsRecordType[];
  timeout_ms?: number;
}) => {
  const timeoutMilliseconds = monitor.timeout_ms ?? 5000;
  const startTime = performance.now();

  const resolverMap: Record<DnsRecordEnum, Function> = {
    A: dns.resolve4,
    AAAA: dns.resolve6,
    CNAME: dns.resolveCname,
    MX: dns.resolveMx,
    TXT: dns.resolveTxt,
    NS: dns.resolveNs,
    SOA: dns.resolveSoa,
    SRV: dns.resolveSrv,
    PTR: dns.resolvePtr
  };

  const results: any[] = [];
  let dns_lookup_ms: number | null = null;

  try {
    const lookups = monitor.records.map((record) => {
      return new Promise<void>((resolve, reject) => {
        const lookupStart = performance.now();

        resolverMap[record.type](monitor.hostname, (err: any, records: any) => {
          if (err) return reject(err);

          dns_lookup_ms = Math.round(performance.now() - lookupStart);

          const normalized = JSON.stringify(records).toLowerCase();
          const matched = normalized.includes(record.value.toLowerCase());

          results.push({
            type: record.type,
            expected: record.value,
            matched,
            records
          });

          resolve();
        });
      });
    });

    await Promise.race([
      Promise.all(lookups),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DNS timeout')), timeoutMilliseconds)
      )
    ]);

    const allMatched = results.every((r) => r.matched);

    return {
      status: allMatched ? MonitorCheckStatus.UP : MonitorCheckStatus.DOWN,
      success: allMatched,
      hostname: monitor.hostname,
      results,
      dns_lookup_ms,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: allMatched ? null : 'One or more DNS records not found'
    };
  } catch (error: any) {
    return {
      status: MonitorCheckStatus.DOWN,
      success: false,
      hostname: monitor.hostname,
      results,
      dns_lookup_ms,
      response_time_ms: Math.round(performance.now() - startTime),
      error_message: error?.message ?? 'DNS check failed'
    };
  }
};
