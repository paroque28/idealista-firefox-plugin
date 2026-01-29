// Browser polyfill for Chrome compatibility
// Maps browser.* APIs to chrome.* APIs with Promise support

(function() {
  'use strict';

  // Skip if browser API already exists (Firefox)
  if (typeof globalThis.browser !== 'undefined') {
    return;
  }

  // Create a wrapper that converts Chrome's callback-based APIs to Promises
  function wrapAsyncFunction(fn) {
    return function(...args) {
      return new Promise((resolve, reject) => {
        fn(...args, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });
    };
  }

  // Create browser namespace
  globalThis.browser = {
    runtime: {
      sendMessage: wrapAsyncFunction(chrome.runtime.sendMessage.bind(chrome.runtime)),
      onMessage: {
        addListener: chrome.runtime.onMessage.addListener.bind(chrome.runtime.onMessage)
      },
      onInstalled: {
        addListener: chrome.runtime.onInstalled.addListener.bind(chrome.runtime.onInstalled)
      }
    },
    storage: {
      sync: {
        get: wrapAsyncFunction(chrome.storage.sync.get.bind(chrome.storage.sync)),
        set: wrapAsyncFunction(chrome.storage.sync.set.bind(chrome.storage.sync)),
        remove: wrapAsyncFunction(chrome.storage.sync.remove.bind(chrome.storage.sync))
      },
      local: {
        get: wrapAsyncFunction(chrome.storage.local.get.bind(chrome.storage.local)),
        set: wrapAsyncFunction(chrome.storage.local.set.bind(chrome.storage.local)),
        remove: wrapAsyncFunction(chrome.storage.local.remove.bind(chrome.storage.local))
      }
    }
  };

  console.log('Browser polyfill loaded for Chrome compatibility');
})();
