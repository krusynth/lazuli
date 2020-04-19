'use strict';

const PromiseMap = require('../helpers/PromiseMap');
const pLimit = require('p-limit');

// Wrapper class for http operations.
// Since we're frequently having to swap out the engine here, we use a wrapper class.

module.exports = class Getter {
  options = {
    engine: null,
    limit: 5 // Only get this many files at one time.
  };
  getter = null;
  limit = null;

  constructor(options) {
    if(typeof options === 'object') {
      this.options = Object.assign(this.options, options);
    }
    if(!this.options.engine) {
      this.options.engine = require('./engines/HttpEngine');
    }
    this.getter = new this.options.engine(this.options);

    this.limit = pLimit(this.options.limit);
  }

  async init(args) {
    return this.getter.init(args);
  }

  async shutdown(args) {
    return this.getter.shutdown(args);
  }

  /*
   * @returns Promise(string)
   */
  get(url) {
    return this.getter.get(url);
  }

  /*
   * @returns Promise(string[])
   */
  getMany(list) {
    let promises = [];
    for(let i = 0; i < list.length; i++) {
      promises.push(this.limit(() => this.get(list[i])));
    }
    return Promise.all(promises);
  }

  /*
   * @returns Promise(Object)
   */
  getManyObj(obj) {
    let promises = {};
    for(let key in obj) {
      promises[key] = this.limit(() => this.get(obj[key]));
    }
    return PromiseMap(promises);
  }

  /*
   * @returns Promise()
   */
  download(url, dest) {
    return this.getter.download(url, dest);
  }

  /*
   * @returns Promise(string[])
   */
  downloadMany(list, dest) {
    let promises = [];
    for(let i = 0; i < list.length; i++) {
      promises.push(this.limit(() => this.download(list[i], dest)));
    }
    return Promise.all(promises);
  }

  /*
   * @returns Promise(Object)
   */
  downloadManyObj(obj, dest) {
    let promises = {};
    for(let key in obj) {
      promises[key] = this.limit(() => this.download(obj[key], dest));
    }
    return PromiseMap(promises);
  }
}