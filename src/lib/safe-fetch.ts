import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { isIP, type LookupFunction } from "node:net";
import { request as httpsRequest } from "node:https";

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 1_000_000;
const DNS_TIMEOUT_MS = 5_000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface SafeHttpResponse {
  status: number;
  contentType: string;
  body: string;
}

interface PinnedAddress {
  address: string;
  family: 4 | 6;
}

/**
 * Fetch a public HTTP(S) page without allowing redirects or DNS rebinding to
 * route the server-side request to a private or reserved address.
 */
export async function fetchPublicHttpUrl(
  input: URL,
  timeoutMs: number,
): Promise<SafeHttpResponse> {
  const deadline = Date.now() + timeoutMs;
  let current = new URL(input);

  for (let redirects = 0; ; redirects += 1) {
    assertAllowedUrl(current);
    const pinned = await resolvePublicAddress(current.hostname, remaining(deadline));
    const response = await requestPinned(current, pinned, remaining(deadline));

    if (!REDIRECT_STATUSES.has(response.status) || !response.location) {
      return {
        status: response.status,
        contentType: response.contentType,
        body: response.body,
      };
    }
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("Too many redirects.");
    }
    current = new URL(response.location, current);
  }
}

/** True only for globally routable unicast IPv4/IPv6 addresses. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIpv4(address);
  if (family === 6) return isPublicIpv6(address);
  return false;
}

function assertAllowedUrl(url: URL): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP(S) links can be fetched.");
  }
  if (url.username || url.password) {
    throw new Error("Links with embedded credentials are not allowed.");
  }
  // The importer is for normal web pages, not a general-purpose port scanner.
  if (url.port && url.port !== (url.protocol === "https:" ? "443" : "80")) {
    throw new Error("Only standard HTTP(S) ports are allowed.");
  }
}

async function resolvePublicAddress(hostname: string, timeoutMs: number): Promise<PinnedAddress> {
  const host = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
  const normalized = host.toLowerCase().replace(/\.$/, "");
  if (
    !normalized ||
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    throw new Error("Local hostnames cannot be fetched.");
  }

  const literalFamily = isIP(normalized);
  let records: Array<{ address: string; family: number }>;
  if (literalFamily) {
    records = [{ address: normalized, family: literalFamily }];
  } else {
    const dnsTimeout = Math.min(timeoutMs, DNS_TIMEOUT_MS);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      records = await Promise.race([
        dnsLookup(normalized, { all: true, verbatim: true }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("DNS lookup timed out.")), dnsTimeout);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  if (!records.length || records.some((record) => !isPublicAddress(record.address))) {
    throw new Error("The hostname does not resolve exclusively to public addresses.");
  }
  const record = records.find((entry) => entry.family === 4) ?? records[0];
  return { address: record.address, family: record.family as 4 | 6 };
}

function requestPinned(
  url: URL,
  pinned: PinnedAddress,
  timeoutMs: number,
): Promise<SafeHttpResponse & { location?: string }> {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const lookup: LookupFunction = (_hostname, options, callback) => {
      const result = { address: pinned.address, family: pinned.family };
      if (options.family && options.family !== pinned.family) {
        const error = Object.assign(new Error("Pinned address family mismatch."), {
          code: "EAI_ADDRFAMILY",
        });
        process.nextTick(callback, error, "", 0);
        return;
      }
      if (options.all) {
        process.nextTick(callback, null, [result]);
      } else {
        process.nextTick(callback, null, result.address, result.family);
      }
    };

    const request = transport(url, {
      method: "GET",
      headers: {
        "User-Agent": "MuseVibe/1.0 (design reference fetch)",
        Accept: "text/html,text/plain;q=0.9,*/*;q=0.1",
        Connection: "close",
      },
      lookup,
      signal: AbortSignal.timeout(timeoutMs),
    });

    request.once("error", reject);
    request.once("response", (response) => {
      const status = response.statusCode ?? 0;
      const contentType = response.headers["content-type"] ?? "";
      const location = response.headers.location;

      if (REDIRECT_STATUSES.has(status) || status < 200 || status >= 300) {
        response.destroy();
        resolve({ status, contentType, body: "", location });
        return;
      }

      const declaredLength = Number(response.headers["content-length"] ?? 0);
      if (declaredLength > MAX_RESPONSE_BYTES) {
        response.destroy();
        reject(new Error("Reference page exceeded the response size limit."));
        return;
      }

      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.length;
        if (received > MAX_RESPONSE_BYTES) {
          response.destroy(new Error("Reference page exceeded the response size limit."));
          return;
        }
        chunks.push(buffer);
      });
      response.once("error", reject);
      response.once("end", () => {
        resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8"), location });
      });
    });
    request.end();
  });
}

function remaining(deadline: number): number {
  const milliseconds = deadline - Date.now();
  if (milliseconds <= 0) throw new Error("Reference fetch timed out.");
  return milliseconds;
}

function isPublicIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b, c] = parts;
  // Private, loopback, link-local, shared, documentation, benchmarking,
  // protocol-assignment, multicast, and reserved IPv4 ranges.
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPublicIpv6(address: string): boolean {
  const bytes = parseIpv6(address);
  if (!bytes) return false;
  // Default-deny anything outside IPv6 global unicast (2000::/3).
  if ((bytes[0] & 0xe0) !== 0x20) return false;
  // Special-purpose, documentation, and 6to4 space is not a destination for
  // this importer, even when an operating system labels it globally scoped.
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] <= 0x01) return false; // 2001::/23
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return false; // 2001:db8::/32
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return false; // 2002::/16 (6to4)
  return true;
}

function parseIpv6(address: string): number[] | null {
  if (isIP(address) !== 6) return null;
  let input = address.toLowerCase();
  const ipv4Tail = input.match(/(?:^|:)(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (ipv4Tail) {
    const parts = ipv4Tail.split(".").map(Number);
    if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    input = input.slice(0, input.length - ipv4Tail.length) +
      ((parts[0] << 8) | parts[1]).toString(16) + ":" +
      ((parts[2] << 8) | parts[3]).toString(16);
  }

  const halves = input.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array(missing).fill("0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.flatMap((group) => {
    const value = Number.parseInt(group, 16);
    return [value >> 8, value & 0xff];
  });
}
