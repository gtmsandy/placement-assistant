import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

import handler, { createRequestHandler } from '../server.ts';

const FIXED_NOW = Date.parse('2026-01-01T00:00:00.000Z');

test('default export is a Vercel-compatible Node request handler', async () => {
  assert.equal(typeof handler, 'function');
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    assert(address && typeof address !== 'string');
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    assert.equal(response.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('request handler accepts relative request URLs', async () => {
  const request = new Request('http://blob-signer/health');
  Object.defineProperty(request, 'url', { value: '/health' });
  const response = await createRequestHandler()(request);
  assert.equal(response.status, 200);
});

function createHarness() {
  const issued: Record<string, unknown>[] = [];
  const presigned: Record<string, unknown>[] = [];
  const blobApi = {
    async issueSignedToken(options: Record<string, unknown>) {
      issued.push(options);
      return {
        delegationToken: 'test-delegation',
        clientSigningToken: 'test-signing-secret',
        validUntil: options.validUntil,
      };
    },
    async presignUrl(
      token: Record<string, unknown>,
      options: Record<string, unknown>,
    ) {
      presigned.push({ token, options });
      return { presignedUrl: 'https://example.private.blob.vercel-storage.com/signed' };
    },
  };

  return {
    issued,
    presigned,
    handler: createRequestHandler({ blobApi, now: () => FIXED_NOW }),
  };
}

function signRequest(payload: unknown, headers: Record<string, string> = {}) {
  return new Request('http://blob-signer/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

test('GET /health succeeds without exposing configuration', async () => {
  const { handler } = createHarness();
  const response = await handler(new Request('http://blob-signer/health'));

  assert.equal(response.status, 200);
  assert.deepEqual(await readJson(response), { status: 'ok' });
});

for (const [kind, pathname] of [
  ['resume', 'resumes/student-1/resume.pdf'],
  ['jd', 'job-descriptions/drive-1/jd.pdf'],
  ['excel', 'result-imports/drive-1/results.xlsx'],
] as const) {
  test(`valid ${kind} pathname is accepted`, async () => {
    const { handler } = createHarness();
    const response = await handler(
      signRequest({ kind, operation: 'put', pathname, validForSeconds: 60 }),
    );

    assert.equal(response.status, 200);
    const body = await readJson(response);
    assert.equal(body.pathname, pathname);
    assert.equal(body.operation, 'put');
  });
}

for (const pathname of [
  'resumes/../secrets.pdf',
  'resumes/%2e%2e/secrets.pdf',
]) {
  test(`traversal pathname is rejected: ${pathname}`, async () => {
    const { handler } = createHarness();
    const response = await handler(
      signRequest({
        kind: 'resume',
        operation: 'get',
        pathname,
        validForSeconds: 60,
      }),
    );

    assert.equal(response.status, 400);
  });
}

test('backslash pathname is rejected', async () => {
  const { handler } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'resume',
      operation: 'get',
      pathname: 'resumes\\student-1\\resume.pdf',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 400);
});

test('pathname outside the selected namespace is rejected', async () => {
  const { handler } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'resume',
      operation: 'get',
      pathname: 'job-descriptions/drive-1/jd.pdf',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 400);
});

test('unsupported kind is rejected', async () => {
  const { handler } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'avatar',
      operation: 'get',
      pathname: 'avatars/user-1/photo.png',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 400);
});

test('unsupported operation is rejected', async () => {
  const { handler } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'resume',
      operation: 'copy',
      pathname: 'resumes/student-1/resume.pdf',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 400);
});

test('expiry above the operation maximum is rejected', async () => {
  const { handler } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'resume',
      operation: 'get',
      pathname: 'resumes/student-1/resume.pdf',
      validForSeconds: 301,
    }),
  );

  assert.equal(response.status, 400);
});

for (const validForSeconds of [0, -1, 1.5, '60']) {
  test(`invalid expiry is rejected: ${validForSeconds}`, async () => {
    const { handler } = createHarness();
    const response = await handler(
      signRequest({
        kind: 'resume',
        operation: 'get',
        pathname: 'resumes/student-1/resume.pdf',
        validForSeconds,
      }),
    );

    assert.equal(response.status, 400);
  });
}

for (const unsafeOverride of [
  { maximumSizeInBytes: 1 },
  { allowedContentTypes: ['text/plain'] },
]) {
  test(`caller constraint override is rejected: ${Object.keys(unsafeOverride)[0]}`, async () => {
    const { handler } = createHarness();
    const response = await handler(
      signRequest({
        kind: 'resume',
        operation: 'put',
        pathname: 'resumes/student-1/resume.pdf',
        validForSeconds: 60,
        ...unsafeOverride,
      }),
    );

    assert.equal(response.status, 400);
  });
}

test('resume PUT receives server-defined size and content-type constraints', async () => {
  const { handler, issued, presigned } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'resume',
      operation: 'put',
      pathname: 'resumes/student-1/resume.docx',
      validForSeconds: 900,
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(issued[0].maximumSizeInBytes, 5 * 1024 * 1024);
  assert.deepEqual(issued[0].allowedContentTypes, [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-word',
    'application/x-ole-storage',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]);
  const urlOptions = presigned[0].options as Record<string, unknown>;
  assert.equal(urlOptions.maximumSizeInBytes, 5 * 1024 * 1024);
  assert.deepEqual(urlOptions.allowedContentTypes, issued[0].allowedContentTypes);
  assert.equal(urlOptions.access, 'private');
});

test('JD PUT receives the current PDF-only 10 MiB policy', async () => {
  const { handler, issued } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'jd',
      operation: 'put',
      pathname: 'job-descriptions/drive-1/jd.pdf',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(issued[0].maximumSizeInBytes, 10 * 1024 * 1024);
  assert.deepEqual(issued[0].allowedContentTypes, ['application/pdf']);
});

test('Excel PUT receives the current workbook 5 MiB policy', async () => {
  const { handler, issued } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'excel',
      operation: 'put',
      pathname: 'result-imports/drive-1/results.xlsm',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(issued[0].maximumSizeInBytes, 5 * 1024 * 1024);
  assert.deepEqual(issued[0].allowedContentTypes, [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12',
  ]);
});

test('GET token is scoped to read-only GET for one exact pathname', async () => {
  const { handler, issued, presigned } = createHarness();
  const pathname = 'resumes/student-1/resume.pdf';
  const response = await handler(
    signRequest({
      kind: 'resume',
      operation: 'get',
      pathname,
      validForSeconds: 300,
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(issued[0].operations, ['get']);
  assert.equal(issued[0].pathname, pathname);
  assert.equal('maximumSizeInBytes' in issued[0], false);
  const urlOptions = presigned[0].options as Record<string, unknown>;
  assert.equal(urlOptions.operation, 'get');
  assert.equal(urlOptions.pathname, pathname);
});

test('DELETE token is scoped to delete-only and two minutes maximum', async () => {
  const { handler, issued } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'jd',
      operation: 'delete',
      pathname: 'job-descriptions/drive-1/jd.pdf',
      validForSeconds: 120,
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(issued[0].operations, ['delete']);
  assert.equal(issued[0].validUntil, FIXED_NOW + 120_000);
});

test('invalid extensions are rejected for their namespace', async () => {
  const { handler } = createHarness();
  const response = await handler(
    signRequest({
      kind: 'jd',
      operation: 'put',
      pathname: 'job-descriptions/drive-1/jd.docx',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 400);
});

test('malformed JSON and non-JSON requests are rejected', async () => {
  const { handler } = createHarness();
  const malformed = await handler(
    new Request('http://blob-signer/sign', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }),
  );
  const wrongType = await handler(
    new Request('http://blob-signer/sign', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: '{}',
    }),
  );

  assert.equal(malformed.status, 400);
  assert.equal(wrongType.status, 415);
});

test('all unrecognized method and route combinations return 404', async () => {
  const { handler } = createHarness();

  assert.equal(
    (await handler(new Request('http://blob-signer/unknown'))).status,
    404,
  );
  assert.equal(
    (await handler(new Request('http://blob-signer/sign'))).status,
    404,
  );
});

test('provider failures are sanitized', async () => {
  const handler = createRequestHandler({
    blobApi: {
      async issueSignedToken() {
        throw new Error('credential details must not escape');
      },
      async presignUrl() {
        throw new Error('not reached');
      },
    },
    now: () => FIXED_NOW,
  });
  const response = await handler(
    signRequest({
      kind: 'resume',
      operation: 'get',
      pathname: 'resumes/student-1/resume.pdf',
      validForSeconds: 60,
    }),
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await readJson(response), {
    error: 'Unable to sign Blob operation.',
  });
});
