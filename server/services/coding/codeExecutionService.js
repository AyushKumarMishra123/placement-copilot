const vm = require('vm');

/**
 * Custom error types for Judge0 integration
 */
class Judge0Error extends Error {
  constructor(message, code = 'JUDGE0_ERROR', statusCode = 500) {
    super(message);
    this.name = 'Judge0Error';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class Judge0AuthError extends Judge0Error {
  constructor(message = 'Judge0 authentication failed. Please verify JUDGE0_API_KEY.') {
    super(message, 'JUDGE0_AUTH_ERROR', 401);
    this.name = 'Judge0AuthError';
  }
}

class Judge0RateLimitError extends Judge0Error {
  constructor(message = 'Judge0 rate limit or execution quota exceeded.') {
    super(message, 'JUDGE0_RATE_LIMIT', 429);
    this.name = 'Judge0RateLimitError';
  }
}

class Judge0UnavailableError extends Judge0Error {
  constructor(message = 'Judge0 execution service is currently unreachable.') {
    super(message, 'JUDGE0_UNAVAILABLE', 503);
    this.name = 'Judge0UnavailableError';
  }
}

/**
 * Standard Judge0 status code mapping
 */
const JUDGE0_STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT_EXCEEDED: 5,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR_SIGSEGV: 7,
  RUNTIME_ERROR_SIGXFSZ: 8,
  RUNTIME_ERROR_SIGFPE: 9,
  RUNTIME_ERROR_SIGABRT: 10,
  RUNTIME_ERROR_NZEC: 11,
  RUNTIME_ERROR_OTHER: 12,
  INTERNAL_ERROR: 13,
  EXEC_FORMAT_ERROR: 14
};

/**
 * Robust Code Execution Engine supporting:
 * 1. Remote Judge0 API (Judge0 CE, Hosted Judge0, or RapidAPI)
 * 2. Dynamic language ID discovery and version negotiation
 * 3. Asynchronous polling with token handling and synchronous fallback
 * 4. Local isolated Node.js VM sandbox for fallback/offline JavaScript
 * 5. Diagnostic health checks and error differentiation
 */
class CodeExecutionService {
  constructor() {
    this.loadConfig();
    this.defaultTimeoutMs = 3000;
    this.cachedLanguages = null;
    this.languagesCacheTime = 0;
    this.cacheTtlMs = 60 * 60 * 1000; // 1 hour
  }

  /**
   * Reload environment configuration dynamically
   */
  loadConfig() {
    const rawUrl = process.env.JUDGE0_URL || 'https://ce.judge0.com';
    this.judge0Url = rawUrl ? rawUrl.trim().replace(/\/+$/, '') : '';
    this.judge0ApiKey = (process.env.JUDGE0_API_KEY || '').trim();
    this.judge0ApiHost = (process.env.JUDGE0_API_HOST || '').trim();
    this.judge0AuthType = (process.env.JUDGE0_AUTH_TYPE || 'auto').trim().toLowerCase();
  }

  /**
   * Determine host name for RapidAPI headers
   */
  getHostname() {
    try {
      if (this.judge0ApiHost) return this.judge0ApiHost;
      if (!this.judge0Url) return '';
      const u = new URL(this.judge0Url);
      return u.host;
    } catch {
      return '';
    }
  }

  /**
   * Construct provider-appropriate HTTP request headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (!this.judge0ApiKey) {
      return headers;
    }

    const hostname = this.getHostname();
    const isRapidApi =
      this.judge0AuthType === 'rapidapi' ||
      (this.judge0AuthType === 'auto' && (hostname.includes('rapidapi.com') || !!this.judge0ApiHost));

    if (isRapidApi) {
      headers['X-RapidAPI-Key'] = this.judge0ApiKey;
      headers['X-RapidAPI-Host'] = this.judge0ApiHost || hostname;
    } else if (this.judge0AuthType === 'bearer') {
      headers['Authorization'] = `Bearer ${this.judge0ApiKey}`;
    } else {
      // Standard Judge0 CE auth
      headers['X-Auth-Token'] = this.judge0ApiKey;
    }

    return headers;
  }

  /**
   * Query the configured Judge0 instance's supported languages endpoint
   * Caches results to avoid excessive API calls
   */
  async fetchSupportedLanguages(forceRefresh = false) {
    if (!this.judge0Url) return [];

    const now = Date.now();
    if (!forceRefresh && this.cachedLanguages && now - this.languagesCacheTime < this.cacheTtlMs) {
      return this.cachedLanguages;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${this.judge0Url}/languages`, {
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          this.cachedLanguages = list;
          this.languagesCacheTime = now;
          return list;
        }
      }
    } catch (err) {
      console.warn(`[CodeExecutionService] Failed to fetch Judge0 languages list: ${err.message}`);
    }

    return this.cachedLanguages || [];
  }

  /**
   * Resolve language name to valid Judge0 language_id
   * Supports: 'cpp', 'c++', 'python', 'python3', 'java', 'javascript', 'js'
   */
  async resolveLanguageId(language) {
    const lang = (language || '').toLowerCase().trim();

    // Standard fallback IDs verified across Judge0 CE & Extra CE
    const fallbackIds = {
      cpp: 54, // C++ (GCC 9.2.0)
      'c++': 54,
      python: 71, // Python (3.8.1)
      python3: 71,
      java: 62, // Java (OpenJDK 13.0.1)
      javascript: 63, // JavaScript (Node.js 12.14.0)
      js: 63
    };

    // Try dynamic matching against real Judge0 /languages endpoint
    try {
      const liveLanguages = await this.fetchSupportedLanguages();
      if (liveLanguages && liveLanguages.length > 0) {
        if (lang === 'cpp' || lang === 'c++') {
          // Prioritize latest GCC or Clang C++
          const candidate =
            liveLanguages.find((l) => /C\+\+.*GCC.*14/i.test(l.name)) ||
            liveLanguages.find((l) => /C\+\+.*GCC/i.test(l.name)) ||
            liveLanguages.find((l) => /C\+\+.*Clang/i.test(l.name)) ||
            liveLanguages.find((l) => /C\+\+/i.test(l.name));
          if (candidate) return candidate.id;
        }

        if (lang === 'python' || lang === 'python3') {
          const candidate =
            liveLanguages.find((l) => /Python.*3\./i.test(l.name)) ||
            liveLanguages.find((l) => /Python.*3/i.test(l.name));
          if (candidate) return candidate.id;
        }

        if (lang === 'java') {
          const candidate =
            liveLanguages.find((l) => /Java.*OpenJDK/i.test(l.name)) ||
            liveLanguages.find((l) => /Java.*JDK/i.test(l.name)) ||
            liveLanguages.find((l) => /^Java/i.test(l.name));
          if (candidate) return candidate.id;
        }

        if (lang === 'javascript' || lang === 'js' || lang === 'node') {
          const candidate =
            liveLanguages.find((l) => /JavaScript.*Node/i.test(l.name)) ||
            liveLanguages.find((l) => /Node\.js/i.test(l.name));
          if (candidate) return candidate.id;
        }
      }
    } catch {
      // Fall through to standard default IDs
    }

    const resolved = fallbackIds[lang];
    if (resolved !== undefined) {
      return resolved;
    }

    throw new Judge0Error(
      `Unsupported programming language: "${language}". Supported languages are: C++, Python, Java, JavaScript.`,
      'UNSUPPORTED_LANGUAGE',
      400
    );
  }

  /**
   * Diagnostic health check for Judge0 connectivity
   */
  async checkHealth() {
    this.loadConfig();
    const startTime = Date.now();

    if (!this.judge0Url) {
      return {
        configured: false,
        url: '',
        reachable: false,
        latencyMs: 0,
        provider: 'none',
        error: 'JUDGE0_URL is not configured.'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Check /about endpoint or /languages
      let res = await fetch(`${this.judge0Url}/about`, {
        headers: this.getHeaders(),
        signal: controller.signal
      });

      if (!res.ok) {
        // Fallback probe to /languages if /about is disabled on some CE proxies
        res = await fetch(`${this.judge0Url}/languages`, {
          headers: this.getHeaders(),
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (res.status === 401 || res.status === 403) {
        return {
          configured: true,
          url: this.judge0Url,
          reachable: false,
          latencyMs,
          statusCode: res.status,
          error: 'Judge0 authentication failed. Check JUDGE0_API_KEY.'
        };
      }

      if (res.status === 429) {
        return {
          configured: true,
          url: this.judge0Url,
          reachable: false,
          latencyMs,
          statusCode: 429,
          error: 'Judge0 rate limit or quota exceeded.'
        };
      }

      if (!res.ok) {
        return {
          configured: true,
          url: this.judge0Url,
          reachable: false,
          latencyMs,
          statusCode: res.status,
          error: `Judge0 returned HTTP ${res.status}: ${res.statusText}`
        };
      }

      let info = {};
      try {
        info = await res.json();
      } catch {
        info = {};
      }

      const languages = await this.fetchSupportedLanguages();

      return {
        configured: true,
        url: this.judge0Url,
        reachable: true,
        latencyMs,
        version: info.version || '1.14.0',
        authConfigured: !!this.judge0ApiKey,
        authType: this.judge0AuthType,
        supportedLanguagesCount: languages.length
      };
    } catch (err) {
      return {
        configured: true,
        url: this.judge0Url,
        reachable: false,
        latencyMs: Date.now() - startTime,
        error: `Cannot connect to Judge0 at ${this.judge0Url}: ${err.message}`
      };
    }
  }

  /**
   * Main execution entry point.
   * Compiles and executes code against stdin.
   * Uses Judge0 as the primary production engine, with isolated VM fallback for JS when Judge0 is unconfigured.
   */
  async execute({ language = 'javascript', code = '', stdin = '', timeoutMs = this.defaultTimeoutMs, preferLocalSandbox = false }) {
    this.loadConfig();

    if (!code || typeof code !== 'string') {
      return {
        stdout: '',
        stderr: 'Source code is required.',
        runtimeMs: 0,
        error: 'Source code is empty.',
        status: 'Compilation Error'
      };
    }

    const lang = (language || 'javascript').toLowerCase().trim();

    // Fast local execution for JavaScript when requested (e.g. internal problem bank reference validation)
    if (preferLocalSandbox && (lang === 'javascript' || lang === 'js' || lang === 'node')) {
      return this.executeJavaScriptSandbox({ code, stdin, timeoutMs });
    }

    // 1. Try remote Judge0 execution if configured
    if (this.judge0Url) {
      try {
        return await this.executeWithJudge0({ language: lang, code, stdin, timeoutMs });
      } catch (err) {
        // If it was an explicit auth or rate limit error, propagate it
        if (err instanceof Judge0AuthError || err instanceof Judge0RateLimitError) {
          throw err;
        }

        // For non-JS languages, we cannot silently use local JS VM
        if (lang !== 'javascript' && lang !== 'js' && lang !== 'node') {
          console.warn(`[CodeExecutionService] Judge0 execution failed for ${lang}: ${err.message}`);
          throw new Judge0UnavailableError(`Judge0 execution failed for ${language}: ${err.message}`);
        }

        // For JS only, log warning and gracefully fallback to in-memory VM if network failed
        console.warn(`[CodeExecutionService] Judge0 unavailable for JS, falling back to local VM: ${err.message}`);
      }
    }

    // 2. Local isolated sandbox fallback (JavaScript only)
    if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      return this.executeJavaScriptSandbox({ code, stdin, timeoutMs });
    }

    // 3. Non-JS requested but Judge0 is not configured
    throw new Judge0UnavailableError(
      `Execution for ${language} requires Judge0 service. Please configure JUDGE0_URL or use JavaScript for local sandbox execution.`
    );
  }

  /**
   * Helper to ensure JavaScript programs using readline() or readAll() can run on Node.js in Judge0
   */
  prepareSourceCode(language, code) {
    const lang = (language || '').toLowerCase().trim();
    if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      if (code.includes('readline(') || code.includes('readAll(')) {
        return `const fs = require('fs');
let __rawInput = '';
try {
  __rawInput = fs.readFileSync(0, 'utf-8');
} catch (e) {
  __rawInput = '';
}
const __inputLines = __rawInput.split(/\\r?\\n/);
let __lineIdx = 0;
function readline() {
  if (__lineIdx >= __inputLines.length) return null;
  return __inputLines[__lineIdx++];
}
function readAll() {
  return __rawInput;
}
${code}`;
      }
    }
    return code;
  }

  /**
   * Remote Judge0 submission with synchronous wait + asynchronous polling fallback
   */
  async executeWithJudge0({ language, code, stdin, timeoutMs }) {
    this.loadConfig();
    const languageId = await this.resolveLanguageId(language);
    const processedCode = this.prepareSourceCode(language, code);

    const payload = {
      language_id: languageId,
      source_code: Buffer.from(processedCode, 'utf-8').toString('base64'),
      stdin: Buffer.from(stdin || '', 'utf-8').toString('base64'),
      cpu_time_limit: Math.max(1, Math.min(15, Math.ceil(timeoutMs / 1000))),
      wall_time_limit: Math.max(2, Math.min(20, Math.ceil(timeoutMs / 1000) * 2)),
      memory_limit: 256000
    };

    const headers = this.getHeaders();
    let res;
    let postUrl = `${this.judge0Url}/submissions?base64_encoded=true&wait=true`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs + 10000);

    try {
      res = await fetch(postUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      throw new Judge0UnavailableError(`Could not reach Judge0 at ${this.judge0Url}: ${err.message}`);
    }

    // Handle initial HTTP response status codes
    if (res.status === 401 || res.status === 403) {
      clearTimeout(timeoutId);
      throw new Judge0AuthError('Invalid Judge0 credentials or access forbidden.');
    }

    if (res.status === 429) {
      clearTimeout(timeoutId);
      throw new Judge0RateLimitError('Judge0 rate limit or quota exceeded.');
    }

    // If wait=true is not allowed on this specific provider/plan (e.g. 422 or 400), retry async with wait=false
    if (!res.ok && (res.status === 422 || res.status === 400)) {
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {}

      if (errBody.includes('wait') || errBody.includes('synchronous')) {
        postUrl = `${this.judge0Url}/submissions?base64_encoded=true&wait=false`;
        res = await fetch(postUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } else {
        clearTimeout(timeoutId);
        throw new Judge0Error(`Judge0 rejected submission (HTTP ${res.status}): ${errBody}`, 'SUBMISSION_REJECTED', res.status);
      }
    }

    if (!res.ok) {
      clearTimeout(timeoutId);
      let errBody = '';
      try {
        errBody = await res.text();
      } catch {}
      throw new Judge0Error(`Judge0 error HTTP ${res.status}: ${errBody || res.statusText}`, 'JUDGE0_HTTP_ERROR', res.status);
    }

    const data = await res.json();

    // Check if synchronous execution finished
    if (data.status && data.status.id >= JUDGE0_STATUS.ACCEPTED) {
      clearTimeout(timeoutId);
      return this.formatJudge0Result(data);
    }

    // If returned in-queue, processing, or a token without completed status, poll asynchronously
    const token = data.token;
    if (!token) {
      clearTimeout(timeoutId);
      throw new Judge0Error('Judge0 did not return a submission token.', 'INVALID_RESPONSE', 500);
    }

    const pollResult = await this.pollSubmission(token, timeoutMs, controller.signal);
    clearTimeout(timeoutId);
    return pollResult;
  }

  /**
   * Poll submission status asynchronously until execution finishes
   */
  async pollSubmission(token, timeoutMs, abortSignal) {
    const maxPollTime = Math.max(10000, timeoutMs + 10000);
    const startTime = Date.now();
    let pollInterval = 300;
    const headers = this.getHeaders();

    while (Date.now() - startTime < maxPollTime) {
      if (abortSignal?.aborted) {
        throw new Judge0Error('Execution timed out.', 'TIMEOUT', 408);
      }

      await new Promise((r) => setTimeout(r, pollInterval));

      try {
        const res = await fetch(`${this.judge0Url}/submissions/${token}?base64_encoded=true`, {
          headers,
          signal: abortSignal
        });

        if (res.status === 401 || res.status === 403) {
          throw new Judge0AuthError();
        }
        if (res.status === 429) {
          throw new Judge0RateLimitError();
        }
        if (!res.ok) {
          throw new Judge0Error(`Judge0 polling error: HTTP ${res.status}`, 'POLL_ERROR', res.status);
        }

        const data = await res.json();
        const statusId = data.status?.id;

        // If execution reached a terminal state (Accepted, Wrong Answer, TLE, CE, RE, etc.)
        if (statusId && statusId >= JUDGE0_STATUS.ACCEPTED) {
          return this.formatJudge0Result(data);
        }

        // Gradually back off interval up to 600ms
        pollInterval = Math.min(600, pollInterval + 50);
      } catch (pollErr) {
        if (pollErr instanceof Judge0Error) throw pollErr;
        // Network blip during polling: log and retry
        console.warn(`[CodeExecutionService] Polling warning: ${pollErr.message}`);
      }
    }

    return {
      stdout: '',
      stderr: 'Execution timed out in Judge0 queue.',
      compileOutput: '',
      runtimeMs: maxPollTime,
      memoryKb: 0,
      error: 'Time Limit Exceeded in execution queue.',
      status: 'Time Limit Exceeded',
      judge0Status: 'Time Limit Exceeded'
    };
  }

  /**
   * Safely decode base64 strings from Judge0
   */
  decodeBase64(str) {
    if (!str || typeof str !== 'string') return '';
    try {
      // Test if string contains non-base64 chars (already plain text)
      if (str.includes('\n') || str.includes(' ') || str.includes('\t')) {
        return str;
      }
      return Buffer.from(str, 'base64').toString('utf-8');
    } catch {
      return str;
    }
  }

  /**
   * Map Judge0 status and response to unified execution result format
   */
  formatJudge0Result(data) {
    const stdout = this.decodeBase64(data.stdout);
    const stderr = this.decodeBase64(data.stderr);
    const compileOutput = this.decodeBase64(data.compile_output);
    const message = this.decodeBase64(data.message);

    const statusId = data.status?.id || 0;
    const statusDesc = data.status?.description || 'Unknown';

    let status = 'Success';
    let errorMessage = null;

    if (statusId === JUDGE0_STATUS.ACCEPTED) {
      status = 'Success';
    } else if (statusId === JUDGE0_STATUS.TIME_LIMIT_EXCEEDED) {
      status = 'Time Limit Exceeded';
      errorMessage = 'Time Limit Exceeded';
    } else if (statusId === JUDGE0_STATUS.COMPILATION_ERROR) {
      status = 'Compilation Error';
      errorMessage = compileOutput || stderr || 'Compilation failed';
    } else if (statusId === JUDGE0_STATUS.WRONG_ANSWER) {
      status = 'Wrong Answer';
      errorMessage = stderr || message || 'Wrong Answer';
    } else if (statusId >= JUDGE0_STATUS.RUNTIME_ERROR_SIGSEGV && statusId <= JUDGE0_STATUS.RUNTIME_ERROR_OTHER) {
      status = 'Runtime Error';
      errorMessage = stderr || message || statusDesc;
    } else if (statusId === JUDGE0_STATUS.INTERNAL_ERROR) {
      status = 'Internal Judge Error';
      errorMessage = message || stderr || 'Judge internal execution error';
    } else {
      status = 'Runtime Error';
      errorMessage = stderr || compileOutput || message || statusDesc;
    }

    const runtimeMs = data.time ? Math.round(Number(data.time) * 1000) : 0;
    const memoryKb = data.memory || 0;

    return {
      stdout: stdout.trimEnd(),
      stderr: (stderr || compileOutput || '').trimEnd(),
      compileOutput: compileOutput.trimEnd(),
      runtimeMs,
      memoryKb,
      error: errorMessage,
      status,
      judge0Status: statusDesc
    };
  }

  /**
   * Evaluate a single testcase against candidate code
   */
  async evaluateTestCase({ language, code, testCase, timeoutMs = this.defaultTimeoutMs }) {
    const result = await this.execute({
      language,
      code,
      stdin: testCase.input,
      timeoutMs
    });

    if (result.status !== 'Success') {
      return {
        passed: false,
        status: result.status,
        runtimeMs: result.runtimeMs,
        memoryKb: result.memoryKb || 0,
        actualOutput: result.stdout,
        expectedOutput: testCase.expectedOutput,
        compileOutput: result.compileOutput,
        error: result.error || result.stderr
      };
    }

    const normalize = (str) =>
      (str || '')
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .join('\n')
        .trim();

    const actual = normalize(result.stdout);
    const expected = normalize(testCase.expectedOutput);
    const passed = actual === expected;

    return {
      passed,
      status: passed ? 'Accepted' : 'Wrong Answer',
      runtimeMs: result.runtimeMs,
      memoryKb: result.memoryKb || 0,
      actualOutput: result.stdout,
      expectedOutput: testCase.expectedOutput,
      compileOutput: result.compileOutput,
      error: passed ? null : `Output mismatch. Expected: "${expected}", Received: "${actual}"`
    };
  }

  /**
   * Fast, secure in-process isolated JavaScript execution using Node.js VM
   */
  executeJavaScriptSandbox({ code, stdin, timeoutMs }) {
    const startTime = Date.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';

    try {
      const sandbox = {
        console: {
          log: (...args) => {
            stdoutBuffer += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
          },
          error: (...args) => {
            stderrBuffer += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
          },
          warn: (...args) => {
            stderrBuffer += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
          },
          info: (...args) => {
            stdoutBuffer += args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
          }
        },
        JSON,
        Math,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        Array,
        Object,
        String,
        Number,
        Boolean,
        Date,
        RegExp,
        Map,
        Set,
        WeakMap,
        WeakSet,
        Promise,
        Buffer: undefined,
        process: {
          exit: () => {
            throw new Error('__SANDBOX_EXIT__');
          }
        },
        require: undefined,
        __dirname: undefined,
        __filename: undefined,
        module: undefined
      };

      const wrappedCode = `
        (function() {
          const __rawInput = ${JSON.stringify(stdin || '')};
          let __inputLines = __rawInput.split(/\\r?\\n/);
          let __lineIdx = 0;
          function readline() {
            if (__lineIdx >= __inputLines.length) return null;
            return __inputLines[__lineIdx++];
          }
          function readAll() {
            return __rawInput;
          }

          ${code}
        })();
      `;

      const context = vm.createContext(sandbox);
      const script = new vm.Script(wrappedCode);

      script.runInContext(context, {
        timeout: timeoutMs,
        displayErrors: true
      });

      const runtimeMs = Date.now() - startTime;
      return {
        stdout: stdoutBuffer.trimEnd(),
        stderr: stderrBuffer.trimEnd(),
        compileOutput: '',
        runtimeMs,
        memoryKb: 0,
        error: null,
        status: 'Success',
        judge0Status: 'Accepted (Local VM Sandbox)'
      };
    } catch (err) {
      const runtimeMs = Date.now() - startTime;
      if (err.message === '__SANDBOX_EXIT__') {
        return {
          stdout: stdoutBuffer.trimEnd(),
          stderr: stderrBuffer.trimEnd(),
          compileOutput: '',
          runtimeMs,
          memoryKb: 0,
          error: null,
          status: 'Success'
        };
      }
      const isTimeout = err.message && err.message.includes('timed out');
      return {
        stdout: stdoutBuffer.trimEnd(),
        stderr: err.message,
        compileOutput: '',
        runtimeMs,
        memoryKb: 0,
        error: err.message,
        status: isTimeout ? 'Time Limit Exceeded' : 'Runtime Error'
      };
    }
  }
}

module.exports = new CodeExecutionService();
module.exports.CodeExecutionService = CodeExecutionService;
module.exports.Judge0Error = Judge0Error;
module.exports.Judge0AuthError = Judge0AuthError;
module.exports.Judge0RateLimitError = Judge0RateLimitError;
module.exports.Judge0UnavailableError = Judge0UnavailableError;
