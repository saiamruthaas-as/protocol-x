import { createApp } from '../../server/src/app';
import { CatchUpApiClient, ApiClientError } from '../services/apiClient';
import http from 'http';

export async function runServerTests(assert: (cond: boolean, name: string) => void): Promise<void> {
  console.log('\n--- SECTION 6: BACKEND & API CLIENT INTEGRATION SUITE (PROMPT 4.9) ---');

  const app = createApp();
  // Listen on ephemeral port (port 0) for isolated, clash-free automated testing
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number };
  const testPort = address.port;
  const baseUrl = `http://127.0.0.1:${testPort}/api/v1`;

  const testClient = new CatchUpApiClient(baseUrl);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Health endpoint returns 200 and valid schema
    // -------------------------------------------------------------------------
    const health = await testClient.checkHealth();
    assert(health.status === 'healthy', 'Backend 1: Health status is healthy');
    assert(health.version === '1.0.0', 'Backend 1: Health reports version 1.0.0');
    assert(health.services.api === 'online', 'Backend 1: API service is online');
    assert(typeof health.uptime === 'number', 'Backend 1: Server uptime is reported');

    // -------------------------------------------------------------------------
    // TEST 2: Confirmation that secrets and API keys are NEVER exposed
    // -------------------------------------------------------------------------
    const healthRaw = await fetch(`${baseUrl}/health`).then(r => r.text());
    assert(!healthRaw.includes('gsk_'), 'Backend 2: Groq API key is NEVER exposed in health output');
    assert(!healthRaw.includes('GROQ_API_KEY'), 'Backend 2: Environment variable names not leaked');

    // -------------------------------------------------------------------------
    // TEST 3: Invalid request body (missing text) returns 400
    // -------------------------------------------------------------------------
    const resMissingText = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: 'conv_test_1' })
    });
    const jsonMissingText = await resMissingText.json();
    assert(resMissingText.status === 400, 'Backend 3: Missing required text field returns HTTP 400');
    assert(jsonMissingText.success === false, 'Backend 3: Response success is false');
    assert(jsonMissingText.error?.code === 'INVALID_TEXT_PAYLOAD', 'Backend 3: Error code is INVALID_TEXT_PAYLOAD');

    // -------------------------------------------------------------------------
    // TEST 4: Disallowed fields are strictly rejected
    // -------------------------------------------------------------------------
    const resRogueField = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'conv_test_2',
        text: 'Hello world',
        rogue_injected_field: 'malicious'
      })
    });
    const jsonRogueField = await resRogueField.json();
    assert(resRogueField.status === 400, 'Backend 4: Disallowed fields rejected with HTTP 400');
    assert(jsonRogueField.error?.code === 'DISALLOWED_FIELD', 'Backend 4: Error code is DISALLOWED_FIELD');

    // -------------------------------------------------------------------------
    // TEST 5: Unsupported media type (non-JSON) returns 415
    // -------------------------------------------------------------------------
    const resBadContentType = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'plain text content'
    });
    const jsonBadContentType = await resBadContentType.json();
    assert(resBadContentType.status === 415, 'Backend 5: Non-JSON Content-Type returns HTTP 415');
    assert(jsonBadContentType.error?.code === 'UNSUPPORTED_MEDIA_TYPE', 'Backend 5: Error code is UNSUPPORTED_MEDIA_TYPE');

    // -------------------------------------------------------------------------
    // TEST 6: Malformed JSON syntax in request body returns 400 without stack trace
    // -------------------------------------------------------------------------
    const resMalformedJson = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ broken json: true,'
    });
    const jsonMalformed = await resMalformedJson.json();
    assert(resMalformedJson.status === 400, 'Backend 6: Malformed JSON returns HTTP 400');
    assert(jsonMalformed.error?.code === 'MALFORMED_JSON', 'Backend 6: Error code is MALFORMED_JSON');
    assert(!jsonMalformed.error?.stack, 'Backend 6: Stack traces are NEVER returned to browser');

    // -------------------------------------------------------------------------
    // TEST 7: Oversized payload (> 1 MB) returns 413 Payload Too Large
    // -------------------------------------------------------------------------
    const oversizedText = 'A'.repeat(1024 * 1024 + 100); // > 1 MB
    const resOversized = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: 'conv_big', text: oversizedText })
    });
    assert(resOversized.status === 413, 'Backend 7: Payloads exceeding 1 MB return HTTP 413 Payload Too Large');

    // -------------------------------------------------------------------------
    // TEST 8: AI Endpoint validates and handles unconfigured / configured state safely
    // -------------------------------------------------------------------------
    const resAiValid = await fetch(`${baseUrl}/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'conv_valid_1',
        text: 'Alice: We have a project launch tomorrow at 10 AM.'
      })
    });
    const jsonAiValid = await resAiValid.json();
    // In unconfigured mode, returns 503 AI_SERVICE_UNCONFIGURED. If key provided, returns 200 acknowledged or completed.
    assert(
      (resAiValid.status === 503 && jsonAiValid.error?.code === 'AI_SERVICE_UNCONFIGURED') ||
      (resAiValid.status === 200 && (jsonAiValid.data?.status === 'acknowledged' || jsonAiValid.data?.status === 'completed')),
      'Backend 8: Valid AI request handled cleanly according to server configuration'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Frontend API Client isAvailable() returns true for live server
    // -------------------------------------------------------------------------
    const isAvail = await testClient.isAvailable();
    assert(isAvail === true, 'Backend 9: Frontend API client detects online server');

    // -------------------------------------------------------------------------
    // TEST 10: Frontend API Client handles offline / unavailable server gracefully
    // -------------------------------------------------------------------------
    const offlineClient = new CatchUpApiClient('http://127.0.0.1:49999/api/v1');
    const isOfflineAvail = await offlineClient.isAvailable(1000);
    assert(isOfflineAvail === false, 'Backend 10: isAvailable() returns false for offline server without throwing');

    let threwAsExpected = false;
    try {
      await offlineClient.checkHealth(1000);
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.code === 'BACKEND_UNAVAILABLE') {
        threwAsExpected = true;
      }
    }
    assert(threwAsExpected, 'Backend 10: checkHealth() throws structured BACKEND_UNAVAILABLE error for offline server');

    // -------------------------------------------------------------------------
    // TEST 11: Request cancellation via AbortSignal / timeout
    // -------------------------------------------------------------------------
    const controller = new AbortController();
    controller.abort(); // pre-abort
    let abortedCleanly = false;
    try {
      await testClient.requestAiAnalysis(
        { conversationId: 'c1', text: 'sample' },
        controller.signal
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError && (err.code === 'REQUEST_TIMEOUT' || err.code === 'BACKEND_UNAVAILABLE')) {
        abortedCleanly = true;
      }
    }
    assert(abortedCleanly, 'Backend 11: Frontend client supports request cancellation via AbortSignal');

    // -------------------------------------------------------------------------
    // TEST 12: Unknown routes return structured 404
    // -------------------------------------------------------------------------
    const resUnknown = await fetch(`${baseUrl}/non_existent_route`);
    const jsonUnknown = await resUnknown.json();
    assert(resUnknown.status === 404, 'Backend 12: Unknown route returns HTTP 404');
    assert(jsonUnknown.error?.code === 'NOT_FOUND', 'Backend 12: Error code is NOT_FOUND');

  } finally {
    // Cleanly close test server
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

// Standalone runner if executed directly
if (process.argv[1]?.includes('runServerSuite')) {
  let passedCount = 0;
  let failedCount = 0;
  runServerTests((cond, name) => {
    if (cond) {
      console.log(`✅ PASS: ${name}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failedCount++;
    }
  }).then(() => {
    console.log(`\nServer Suite Summary: ${passedCount} PASSED, ${failedCount} FAILED\n`);
    if (failedCount > 0) process.exit(1);
  }).catch((err) => {
    console.error('Server Test Suite Error:', err);
    process.exit(1);
  });
}
