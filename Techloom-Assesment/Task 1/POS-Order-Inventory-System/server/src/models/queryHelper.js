/**
 * Creates a thenable Promise query object that supports .sort() and .limit()
 * chaining both before and after await.
 */
function createQueryPromise(executor) {
  let sortCriteria = null;
  let limitCount = null;

  const promise = new Promise((resolve, reject) => {
    process.nextTick(async () => {
      try {
        const results = await executor({ sortCriteria, limitCount });
        // Attach chainable no-op helpers on the resolved array as well
        if (Array.isArray(results)) {
          results.sort = function (comparator) {
            if (typeof comparator === 'function') {
              return Array.prototype.sort.call(results, comparator);
            }
            return results;
          };
          results.limit = function (num) {
            return results.slice(0, num);
          };
        }
        resolve(results);
      } catch (err) {
        reject(err);
      }
    });
  });

  promise.sort = function (criteria) {
    sortCriteria = criteria;
    return promise;
  };

  promise.limit = function (limit) {
    limitCount = limit;
    return promise;
  };

  return promise;
}

module.exports = {
  createQueryPromise,
};
