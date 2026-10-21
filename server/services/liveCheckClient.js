const crypto = require('crypto');
const { getStorageProvider } = require('./storage');

class LiveCheckClient {
  constructor(baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Dispatches live check request to Python Playwright service
   * Stores captured screenshots in MongoDB GridFS securely under userId
   * @param {string} url
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async checkLiveLink(url, userId) {
    const endpoint = `${this.baseUrl}/check-live-link`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        let errBody = '';
        try {
          const json = await response.json();
          errBody = json.message || json.detail || response.statusText;
        } catch (_) {
          errBody = response.statusText;
        }

        return {
          attempted: true,
          url,
          reachable: false,
          error: `Live link checker returned error (${response.status}): ${errBody}`,
          claimVerification: {
            status: 'Unable to verify',
            explanation: errBody,
            confidence: 1.0
          }
        };
      }

      const result = await response.json();

      // If blocked destination (SSRF)
      if (result.errorCode === 'BLOCKED_DESTINATION' || result.errorCode === 'BLOCKED_REDIRECT') {
        return {
          attempted: true,
          url,
          reachable: false,
          errorCode: result.errorCode,
          error: result.message || 'This URL cannot be checked because it does not point to an allowed public website.',
          claimVerification: {
            status: 'Unable to verify',
            explanation: result.message || 'URL blocked by security policies.',
            confidence: 1.0
          }
        };
      }

      let desktopScreenshotId = null;
      let mobileScreenshotId = null;
      const storage = getStorageProvider();

      // Persist desktop screenshot to GridFS if captured
      if (result.desktop?.screenshotBase64 && userId) {
        try {
          const buf = Buffer.from(result.desktop.screenshotBase64, 'base64');
          const docId = crypto.randomUUID();
          const uploadRes = await storage.uploadFile({
            buffer: buf,
            originalFilename: `desktop_${docId}.jpeg`,
            mimeType: 'image/jpeg',
            userId,
            documentId: docId
          });
          desktopScreenshotId = uploadRes.storageId;
        } catch (storageErr) {
          console.warn('[LiveCheckClient] Could not save desktop screenshot to storage:', storageErr.message);
        }
      }

      // Persist mobile screenshot to GridFS if captured
      if (result.mobile?.screenshotBase64 && userId) {
        try {
          const buf = Buffer.from(result.mobile.screenshotBase64, 'base64');
          const docId = crypto.randomUUID();
          const uploadRes = await storage.uploadFile({
            buffer: buf,
            originalFilename: `mobile_${docId}.jpeg`,
            mimeType: 'image/jpeg',
            userId,
            documentId: docId
          });
          mobileScreenshotId = uploadRes.storageId;
        } catch (storageErr) {
          console.warn('[LiveCheckClient] Could not save mobile screenshot to storage:', storageErr.message);
        }
      }

      return {
        attempted: true,
        url,
        reachable: Boolean(result.reachable),
        httpStatus: result.httpStatus || null,
        finalUrl: result.finalUrl || url,
        pageTitle: result.pageTitle || '',
        hasReadableContent: Boolean(result.hasReadableContent),
        visibleTextSnippet: result.visibleTextSnippet || '',
        desktopScreenshotId,
        mobileScreenshotId,
        consoleErrors: result.desktop?.consoleErrors || [],
        pageErrors: result.desktop?.pageErrors || [],
        loadDurationMs: result.performance?.loadDurationMs || 0
      };
    } catch (err) {
      console.warn(`[LiveCheckClient] Call failed to ${endpoint}: ${err.message}`);
      return {
        attempted: true,
        url,
        reachable: false,
        error: `Could not reach live website checking microservice: ${err.message}`,
        claimVerification: {
          status: 'Unable to verify',
          explanation: 'Live checking service was temporarily unavailable.',
          confidence: 1.0
        }
      };
    }
  }
}

module.exports = new LiveCheckClient();
