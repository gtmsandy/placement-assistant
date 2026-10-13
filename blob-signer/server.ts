import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';

import { issueSignedToken, presignUrl } from '@vercel/blob';

const MEBIBYTE = 1024 * 1024;
const MAX_BODY_BYTES = 4096;
const MAX_PATHNAME_LENGTH = 950;

const POLICIES = {
  resume: {
    prefix: 'resumes/',
    extensions: ['.pdf', '.doc', '.docx'],
    maximumSizeInBytes: 5 * MEBIBYTE,
    allowedContentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.ms-word',
      'application/x-ole-storage',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  jd: {
    prefix: 'job-descriptions/',
    extensions: ['.pdf'],
    maximumSizeInBytes: 10 * MEBIBYTE,
    allowedContentTypes: ['application/pdf'],
  },
  excel: {
    prefix: 'result-imports/',
    extensions: ['.xlsx', '.xlsm'],
    maximumSizeInBytes: 5 * MEBIBYTE,
    allowedContentTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroenabled.12',
    ],
  },
} as const;

const MAX_EXPIRY_SECONDS = {
  put: 15 * 60,
  get: 5 * 60,
  head: 5 * 60,
  delete: 2 * 60,
} as const;

const REQUEST_KEYS = new Set([
  'kind',
  'operation',
  'pathname',
  'validForSeconds',
]);

type Kind = keyof typeof POLICIES;
type Operation = keyof typeof MAX_EXPIRY_SECONDS;

type SignRequest = {
  kind: Kind;
  operation: Operation;
  pathname: string;
  validForSeconds: number;
};

type BlobApi = {
  issueSignedToken(options: Record<string, unknown>): Promise<Record<string, unknown>>;
  presignUrl(
    token: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Promise<{ presignedUrl: string }>;
};

class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

async function readBoundedBody(request: Request) {
  if (!request.body) {
    return '';
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new RequestError(413, 'Request body is too large.');
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let body = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new RequestError(413, 'Request body is too large.');
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

function validatePathname(kind: Kind, pathname: unknown): asserts pathname is string {
  if (
    typeof pathname !== 'string' ||
    pathname.length === 0 ||
    pathname.length > MAX_PATHNAME_LENGTH ||
    pathname !== pathname.trim() ||
    pathname.startsWith('/') ||
    pathname.includes('\\') ||
    pathname.includes('%') ||
    pathname.includes('?') ||
    pathname.includes('#') ||
    pathname.includes('*') ||
    /[\u0000-\u001f\u007f]/u.test(pathname)
  ) {
    throw new RequestError(400, 'Invalid pathname.');
  }

  const segments = pathname.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new RequestError(400, 'Invalid pathname.');
  }

  const policy = POLICIES[kind];
  if (!pathname.startsWith(policy.prefix) || pathname.length === policy.prefix.length) {
    throw new RequestError(400, 'Invalid pathname.');
  }

  const lowercasePathname = pathname.toLowerCase();
  if (!policy.extensions.some((extension) => lowercasePathname.endsWith(extension))) {
    throw new RequestError(400, 'Invalid pathname.');
  }
}

function validatePayload(payload: unknown): SignRequest {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new RequestError(400, 'Invalid request.');
  }

  const input = payload as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.length !== REQUEST_KEYS.size || keys.some((key) => !REQUEST_KEYS.has(key))) {
    throw new RequestError(400, 'Invalid request.');
  }

  const { kind, operation, pathname, validForSeconds } = input;
  if (typeof kind !== 'string' || !(kind in POLICIES)) {
    throw new RequestError(400, 'Invalid request.');
  }
  if (typeof operation !== 'string' || !(operation in MAX_EXPIRY_SECONDS)) {
    throw new RequestError(400, 'Invalid request.');
  }
  if (
    !Number.isInteger(validForSeconds) ||
    Number(validForSeconds) <= 0 ||
    Number(validForSeconds) > MAX_EXPIRY_SECONDS[operation as Operation]
  ) {
    throw new RequestError(400, 'Invalid request.');
  }

  validatePathname(kind as Kind, pathname);

  return {
    kind: kind as Kind,
    operation: operation as Operation,
    pathname,
    validForSeconds: Number(validForSeconds),
  };
}

export function createRequestHandler({
  blobApi = { issueSignedToken, presignUrl } as BlobApi,
  now = Date.now,
}: {
  blobApi?: BlobApi;
  now?: () => number;
} = {}) {
  return async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url, 'http://blob-signer.internal');

    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ status: 'ok' });
    }
    if (request.method !== 'POST' || url.pathname !== '/sign') {
      return jsonResponse({ error: 'Not found.' }, 404);
    }

    const mediaType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
    if (mediaType !== 'application/json') {
      return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
    }

    try {
      const rawBody = await readBoundedBody(request);
      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new RequestError(400, 'Malformed JSON.');
      }

      const input = validatePayload(parsed);
      const policy = POLICIES[input.kind];
      const validUntil = now() + input.validForSeconds * 1000;
      const uploadConstraints =
        input.operation === 'put'
          ? {
              maximumSizeInBytes: policy.maximumSizeInBytes,
              allowedContentTypes: [...policy.allowedContentTypes],
            }
          : {};

      const token = await blobApi.issueSignedToken({
        pathname: input.pathname,
        operations: [input.operation],
        validUntil,
        ...uploadConstraints,
      });
      const { presignedUrl } = await blobApi.presignUrl(token, {
        operation: input.operation,
        pathname: input.pathname,
        access: 'private',
        validUntil,
        ...(input.operation === 'put'
          ? {
              ...uploadConstraints,
              addRandomSuffix: false,
              allowOverwrite: false,
            }
          : {}),
      });

      return jsonResponse({
        presignedUrl,
        pathname: input.pathname,
        operation: input.operation,
        expiresAt: new Date(validUntil).toISOString(),
      });
    } catch (error) {
      if (error instanceof RequestError) {
        return jsonResponse({ error: error.message }, error.status);
      }
      return jsonResponse({ error: 'Unable to sign Blob operation.' }, 502);
    }
  };
}

function headersFromNodeRequest(rawHeaders: string[]) {
  const headers = new Headers();
  for (let index = 0; index < rawHeaders.length; index += 2) {
    headers.append(rawHeaders[index], rawHeaders[index + 1]);
  }
  return headers;
}

export function createNodeRequestHandler() {
  const handleRequest = createRequestHandler();
  return async function nodeRequestHandler(request, response) {
    try {
      const origin = `http://${request.headers.host ?? 'localhost'}`;
      const init: RequestInit & { duplex?: 'half' } = {
        method: request.method,
        headers: headersFromNodeRequest(request.rawHeaders),
      };
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        init.body = request as unknown as BodyInit;
        init.duplex = 'half';
      }

      const result = await handleRequest(
        new Request(new URL(request.url ?? '/', origin), init),
      );
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Internal service error.' }));
    }
  };
}

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  return createServer(createNodeRequestHandler()).listen(port);
}

export default createNodeRequestHandler();

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entrypoint) {
  startServer();
}
