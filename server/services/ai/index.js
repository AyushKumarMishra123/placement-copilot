const GeminiProvider = require('./GeminiProvider');
const RuleOnlyProvider = require('./RuleOnlyProvider');
const OllamaProvider = require('./OllamaProvider');

let currentAIProvider = null;

function getAIProvider() {
  if (currentAIProvider) return currentAIProvider;

  const providerType = (process.env.AI_PROVIDER || 'rules_only').toLowerCase();

  if (providerType === 'ollama') {
    currentAIProvider = new OllamaProvider();
  } else if (providerType === 'gemini' && process.env.GEMINI_API_KEY) {
    currentAIProvider = new GeminiProvider();
  } else if (providerType === 'rule-only' || providerType === 'rules_only' || !process.env.GEMINI_API_KEY) {
    currentAIProvider = new RuleOnlyProvider();
  } else {
    // Default fallback
    currentAIProvider = new RuleOnlyProvider();
  }

  return currentAIProvider;
}

function setAIProvider(provider) {
  currentAIProvider = provider;
}

module.exports = {
  getAIProvider,
  setAIProvider,
  GeminiProvider,
  RuleOnlyProvider,
  OllamaProvider
};
