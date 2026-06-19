// naturalCommands.js - Natural Language Command Detection
module.exports = {
  async detect(sockInstance, message, text, ctx) {
    // Natural commands are now handled directly in server.js handleNaturalAction
    // This module can be extended for ML-based intent detection
    return { handled: false };
  }
};
