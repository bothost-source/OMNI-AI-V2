/**
 * OMNI HTTP Retry Utility
 * Created by: lordtarrific
 */

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function requestWithRetry(axiosInstance, config, options = {}) {
  const retries = options.retries || 3;
  const backoff = options.backoff || 2500;
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      return await axiosInstance(config);
    } catch (error) {
      lastError = error;
      if (i < retries) {
        if (options.onRetry) await options.onRetry(error, i + 1, backoff * (i + 1));
        await delay(backoff * (i + 1));
      }
    }
  }
  throw lastError;
}

module.exports = { requestWithRetry };
