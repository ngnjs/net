import Reference from '@ngnjs/plugin'
import Address from './lib/URL.js'
import NgnRequest from './lib/Request.js'
import { HOSTNAME } from './lib/constants.js'
import { coalesceb } from '@ngnjs/libdata'

const NGN = new Reference().requires('EventEmitter', 'WARN')
const { WARN } = NGN

/**
 * @class HttpClient
 * Represents an HTTP client capable of making requests to remote
 * servers. This automatically configures and processes NGN net
 * Request objects using the most common HTTP methods.
 */
export default class HttpClient extends NGN.EventEmitter {
  constructor () {
    super()
    this.name = 'HTTP Client'

    Object.defineProperties(this, {
      /**
       * @method normalizeUrl
       * Normalize a URL by removing extraneous characters,
       * applying protocol, and resolving relative links.
       * @param {string} URI
       * The URI to normalize.
       * @return {string}
       * The normalized URL.
       */
      normalizeUrl: NGN.hiddenconstant(url => (new Address(url)).toString({ username: true, password: true, urlencode: false })),

      parseRequestConfig: NGN.hiddenconstant((cfg = {}, method = 'GET') => {
        cfg = typeof cfg === 'string' ? { url: cfg } : cfg
        cfg.method = method
        cfg.url = coalesceb(cfg.url, HOSTNAME)
        return cfg
      }),

      send: NGN.hiddenconstant((method, argv) => {
        const args = argv ? Array.from(argv) : []
        const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
        const request = new NgnRequest(this.parseRequestConfig(...args, method.toUpperCase()))

        // This is a no-op by default, unless the preflight method
        // is overridden by an extension class.
        this.preflight(request)

        return request.send(callback)
      })
    })

    // Helper aliases (undocumented)
    this.alias('OPTIONS', this.options)
    this.alias('HEAD', this.head)
    this.alias('GET', this.get)
    this.alias('POST', this.post)
    this.alias('PUT', this.put)
    this.alias('DELETE', this.delete)
    this.alias('TRACE', this.trace)
    this.alias('JSON', this.json)
    this.alias('JSONP', this.jsonp)

    this.register('HttpClient', this)
  }

  /**
   * @property {Request}
   * Returns an NGN network Request.
   */
  get Request () {
    return NgnRequest
  }

  /**
   * @method request
   * Send a request. In most cases, it is easier to use one of the built-in
   * request functions (#get, #post, #put, #delete, #json, etc). This method
   * is available for creating custom requests.
   * @param  {Object} configuration
   * Provide a NGN Request configuration.
   * @param  {Function} [callback]
   * The callback to execute when the request is complete. Necessary
   * when not using the returned Promise.
   * @returns {Promise}
   * A promise representing the network request.
   */
  request (cfg = {}, callback) {
    const method = coalesceb(cfg.method, 'GET')
    delete cfg.method
    return this.send(method, [cfg, callback])
  }

  /**
   * @method options
   * Issue a `OPTIONS` request.
   * @param {string|object} url
   * The URL to issue the request to, or a configuration object.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} callback
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  options () {
    return this.send('OPTIONS', arguments)
  }

  /**
   * @method head
   * Issue a `HEAD` request.
   * @param {string|object} url
   * The URL to issue the request to, or a configuration object.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} callback
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  head () {
    return this.send('HEAD', arguments)
  }

  /**
   * @method get
   * Issue a `GET` request.
   * @param {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} callback
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  get () {
    return this.send('GET', arguments)
  }

  /**
   * @method post
   * Issue a `POST` request.
   * @param {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} callback
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  post () {
    return this.send('POST', arguments)
  }

  /**
   * @method put
   * Issue a `PUT` request.
   * @param {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} callback
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  put () {
    return this.send('PUT', arguments)
  }

  /**
   * @method delete
   * Issue a `DELETE` request.
   * @param {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} callback
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  delete () {
    return this.send('DELETE', arguments)
  }

  /**
   * @method trace
   * Issue a `TRACE` request. This is a debugging method, which
   * echoes input back to the user. It is a standard HTTP method,
   * but considered a security risk by many practioners and may
   * not be supported by remote hosts.
   * @param {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} callback
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  trace () {
    WARN('NGN.Request.method', 'An HTTP TRACE request was made.')
    return this.send('TRACE', arguments)
  }

  /**
   * @method json
   * This is a shortcut method for creating a `GET` request and
   * auto-parsing the response into a JSON object.
   * @param  {string} url
   * The URL to issue the request to.
   * @param  {Function} callback
   * This receives a JSON response object from the server.
   * @param {Error} callback.error
   * If the request cannot be completed for any reason, this argument will be
   * populated with the error. If the request is successful, this will be `null`.
   * @param {Object} callback.data
   * The JSON response from the remote URL.
   * @returns {Promise}
   * A promise representing the network request.
   */
  json (url, callback) {
    const request = new NgnRequest(url)

    request.setHeader('Accept', 'application/json, application/ld+json, application/vnd.api+json, */json, */*json;q=0.8')

    this.preflight(request)

    const response = request.send()

    if (callback) {
      response.then(r => callback(null, r.JSON)).catch(callback)
    }

    return new Promise((resolve, reject) => response.then(r => resolve(r.JSON)).catch(reject))
  }

  /**
   * @method jsonp
   * Execute a request via JSONP. JSONP is only available in browser
   * environments, since it's operation is dependent on the existance of
   * the DOM. However; this may work with some headless browsers.
   * @param {string} url
   * The URL of the JSONP endpoint.
   * @param {function} [callback]
   * Handles the response. Optional when using the returned promise.
   * @param {Error} callback.error
   * If an error occurred, this will be populated. If no error occurred, this will
   * be null.
   * @param {object|array} callback.response
   * The response.
   * @param {string} [callbackParameter=callback]
   * Optionally specify an alternative callback parameter name. This will be
   * appended to the URL query parameters when the request is made.
   * For example:
   * `https://domain.com?[callbackParameter]=generated_function_name`
   * @returns {Promise}
   * A promise representing the network request.
   * @environment browser
   */
  jsonp (url, callback, callbackParameter = 'callback') {
    return new Promise((resolve, reject) => {
      if (NGN.runtime !== 'browser') {
        const err = new Error('JSONP is not available in non-browser runtimes.')

        if (callback) {
          callback(err)
        } else {
          reject(err)
        }

        return
      }

      const fn = 'jsonp_callback_' + Math.round(100000 * Math.random())

      window[fn] = data => {
        delete window[fn]
        document.querySelector('head').removeChild(script)

        if (callback) {
          callback(null, data)
        }

        resolve(data)
      }

      const script = document.createElement('script')
      script.src = `${url}${url.indexOf('?') >= 0 ? '&' : '?'}${callbackParameter}=${fn}`
      script.addEventListener('error', e => {
        delete window[fn]
        const err = new Error('The JSONP request was blocked. This may be the result of an invalid URL, cross origin restrictions, or the remote server may not be responding.')
        if (callback) {
          callback(err)
          resolve()
        } else {
          reject(err)
        }
      })

      document.querySelector('head').appendChild(script)
    })
  }

  /**
   * @method preflight
   * This is a no-op method that runs before a request is sent.
   * This exists specicially to be overridden by class extensions.
   * @param {Request} request
   * The request to process.
   */
  preflight (request) { }
}
