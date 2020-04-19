'use strict';

/* Promises.all but uses an Object instead of an array.
 *
 * Usage:
 *
 * PromiseMap({
 *   'a': new Promise((resolve, reject) => resolve(1)),
 *   'b': new Promise((resolve, reject) => resolve(2))
 * }).then(result => console.log('done', result));
 *
 * The resulting promise resolves to { a: 1, b: 2 }
 */

function PromiseMap(obj) {
  let promises = [];
  for(let key in obj) {
    let promise = obj[key];
    promises.push(
      promise.then(result => [key, result])
    );
  }

  return Promise.all(promises).then(results => {
    let data = {};
    results.forEach(result => data[result[0]] = result[1]);
    return data;
  });
}

module.exports = PromiseMap;
