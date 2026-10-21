/**
 * Python Document Processing Service Client
 * Calls the FastAPI /parse-resume endpoint.
 */
class PythonParserClient {
  constructor(baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Send file buffer to Python FastAPI service for PyMuPDF/docx extraction
   * @param {Buffer} fileBuffer
   * @param {string} originalFilename
   * @param {string} mimeType
   * @returns {Promise<Object>} Structured parsed resume JSON
   */
  async parseResume(fileBuffer, originalFilename, mimeType) {
    const url = `${this.baseUrl}/parse-resume`;

    try {
      // Use standard Node.js Blob and FormData
      const blob = new Blob([fileBuffer], { type: mimeType });
      const formData = new FormData();
      formData.append('file', blob, originalFilename);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          // fetch automatically sets correct multipart boundary with FormData
        }
      });

      const responseData = await response.json();

      if (!response.ok) {
        const error = new Error(responseData.message || `Python parser failed with status ${response.status}`);
        error.code = responseData.errorCode || 'PARSING_FAILED';
        error.status = response.status;
        error.details = responseData.details;
        throw error;
      }

      return responseData;
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
        const connError = new Error(
          `Cannot connect to Python Document Processing Service at ${this.baseUrl}. Please verify the ai-service is running on port 8000.`
        );
        connError.code = 'AI_SERVICE_UNAVAILABLE';
        throw connError;
      }
      throw err;
    }
  }

  /**
   * Check health of Python parsing service
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        return await response.json();
      }
      return { status: 'unhealthy', code: response.status };
    } catch (err) {
      return { status: 'unreachable', error: err.message };
    }
  }
}

module.exports = new PythonParserClient();
