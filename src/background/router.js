/**
 * Message router registry — maps message.action to a handler function and
 * wires a single chrome.runtime.onMessage listener.
 */

const handlers = {};

export function register(action, handler) {
  handlers[action] = handler;
}

export function registerAll(map) {
  for (const [action, handler] of Object.entries(map)) {
    register(action, handler);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = handlers[message.action];
  if (handler) {
    handler(message, sender, sendResponse);
    return true;
  }
  return undefined;
});
