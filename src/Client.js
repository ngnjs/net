import Reference from '@ngnjs/plugin'
import Address from './lib/URL.js'
import NgnRequest from './lib/Request.js'
import { HOSTNAME } from './lib/constants.js'
import { coalesceb } from '@ngnjs/libdata'

const NGN = new Reference().requires('EventEmitter', 'WARN')
const { WARN } = NGN
export const HTTP_METHODS = new Set([
  'OPTIONS',
  'HEAD',
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'TRACE',
  'JSON',
  'JSONP'
])

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
      httpmethods: NGN.hiddenconstant(HTTP_METHODS),

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
        const cfg = this.parseRequestConfig(...args, method.toUpperCase())
        const request = new NgnRequest(cfg)

        // This is a no-op by default, unless the preflight method
        // is overridden by an extension class.
        this.preflight(request, cfg)

        return request.send(callback)
      })
    })

    // Helper aliases (undocumented)
    HTTP_METHODS.forEach(m => this.alias(m, this[m.toLowerCase()]))

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
   * @param {Function} [callback]
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
   * @param {Function} [callback]
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
   * @param {Function} [callback]
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
   * @param {Function} [callback]
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  post () {
    let args = Array.from(arguments)
    if (args.length > 1 && typeof args[0] === 'string' && typeof args[1] === 'object') {
      args = [Object.assign({ url: args[0] }, args[1])]
    }
    return this.send('POST', args)
  }

  /**
   * @method put
   * Issue a `PUT` request.
   * @param {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} [callback]
   * A callback method to run when the request is complete.
   * This receives the response object as the only argument.
   * @returns {Promise}
   * A promise representing the network request.
   */
  put () {
    let args = Array.from(arguments)
    if (args.length > 1 && typeof args[0] === 'string' && typeof args[1] === 'object') {
      args = [Object.assign({ url: args[0] }, args[1])]
    }
    return this.send('PUT', args)
  }

  /**
   * @method delete
   * Issue a `DELETE` request.
   * @param {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param {Function} [callback]
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
   * @param {Function} [callback]
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
   * @param  {string|object} url
   * The URL to issue the request to.
   * The configuration object accepts all of the NGN Request
   * configuration options (except method, which is defined automatically).
   * @param  {Function} [callback]
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
    const cfg = typeof url === 'string' ? { url } : {}

    cfg.headers = {
      'Accept': 'application/json, application/ld+json, application/vnd.api+json, */json, */*json;q=0.8'
    }

    const wrapper = new Promise((resolve, reject) => {
      this.send('GET', cfg).then(r => resolve(r.JSON)).catch(reject)
    })

    if (callback) {
      return wrapper.then(data => callback(null, data)).catch(callback)
    }

    return wrapper
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
  preflight (request, configuration) { }
}

// #encodingproxy = null
//   #cryptoproxy = (key, value, ignoredMethods = []) => {
//   if (this.#encodingproxy === null) {
//     this.#encodingproxy = new Proxy(this, {
//       get(target, prop) {
//         const property = prop.trim().toUpperCase()
//         if (!HTTP_METHODS.has(property)) {
//           return target[prop]
//         }

//         // Pass OPTIONS and HEAD requests through unchanged
//         if (property === 'OPTIONS' || property === 'HEAD') {
//           return target.options
//         }

//         // Ignore specified HTTP methods
//         if (ignoredMethods.indexOf(property) >= 0) {
//           throw new Error(`"${key}" cannot be set for HTTP ${property} requests.`)
//         }

//         // Auto-apply crypto key attributes to request objects
//         return function () {
//           const args = Array.from(arguments)

//           if (typeof args[args.length - 1] === 'object') {
//             args[args.length - 1][key] = value
//           } else {
//             args.push(Object.defineProperty({}, key, { value }))
//           }

//           return target[prop.toLowerCase()](...args)
//         }
//       }
//     })
//   }

//   return this.#encodingproxy
// }

// /**
//  * Encrypt the body of an HTTP request using the specified key.
//  * @warning JSON bodies are automatically converted to strings
//  * before encrypting. The HTTP `content-type` header will reflect
//  * `application/octet-stream` with a `content-encoding` header
//  * including the encryption algorithm.
//  * @param {string} key
//  * The _shared encryption key_ or _public key_ (PEM) used to encrypt
//  * the body.
//  * @returns {HttpClient}
//  * Returns a modified instance of the HTTP client.
//  */
// encrypt(key) {
//   return this.#cryptoproxy('encryptionKey', key, ['GET', 'HEAD', 'JSON', 'JSONP'])
// }

// /**
//  * Decrypt the body of an HTTP response, using the specified key.
//  * @param {string} [key]
//  * The _shared encryption key_ or _private key_ (PEM) used to decrypt
//  * the body.
//  * @returns {HttpClient}
//  * Returns a modified instance of the HTTP client.
//  */
// decrypt(key) {
//   return this.#cryptoproxy('decryptionKey', key, ['DELETE'])
// }

// /**
//    * Sign the body of an HTTP request using the signing key.
//    * This adds a `signature` HTTP request header.
//    * @param {string} privateKey
//    * The privateKey (PEM) used to sign the content.
//    * @returns {HttpClient}
//    * Returns a modified instance of the HTTP client.
//    */
// sign(key) {
//   return this.#cryptoproxy('signingKey', key, ['GET', 'DELETE'])
// }

// /**
//  * Verify the body of an HTTP response using the verification key.
//  * This only works if a `signature` HTTP request header is provided
//  * in the HTTP response.
//  * @param {string} publicKey
//  * The publicKey (PEM) used to sign the content.
//  * @returns {HttpClient}
//  * Returns a modified instance of the HTTP client.
//  */
// verify(key) {
//   return this.#cryptoproxy('verifcationKey', key)
// }
