const _ = require('lodash');

const cache = new Map();

// Wrapper function for Lodash's memoize that includes cache expiration
function memoizeWithExpiration(func, expirationTimeMs) {
  const resolver = (...args) => {
    return JSON.stringify(args);
  };

  const memoizedFunc = _.memoize(func, resolver);

  return (...args) => {
    const cacheKey = resolver(...args);

    if (!cache.has(cacheKey)) {
      const result = memoizedFunc(...args);
      cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }

    const cachedEntry = cache.get(cacheKey);

    if (Date.now() - cachedEntry.timestamp > expirationTimeMs) {
      const result = memoizedFunc(...args);
      cache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
    return cachedEntry.result;
  };
}

module.exports = {
  memoizeWithExpiration,
};
