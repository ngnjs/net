import Reference from '@ngnjs/plugin'
import Client from './Client.js'
import Address from './lib/URL.js'
import Request from './lib/Request.js'
import { HOSTNAME, HTTP_METHODS, REDIRECT_MODES } from './lib/constants.js'
import { coalesce, coalesceb, forceBoolean } from '@ngnjs/libdata'

const NGN = new Reference().requires('WARN')
const { WARN } = NGN

// Force boolean values
const bool = v => v === null ? null : forceBoolean(v)

// Used to map resource configuration attributes to request attributes
const REQUEST_ATTRIBUTES = new Set(['proxyUsername', 'hash', 'redirect', 'port', 'path', 'host', 'hostname', 'referrerPolicy', 'mode', 'cache', 'proxyAuthType', 'authType'])


/**
 * @class Resource
 * Represents a remote web resource, such as a backend web server or
 * an API server. This class inherits everything from the NGN net Client, extending
 * it with customizable options for working with specific remote resources.
 *
 * This class was designed for use in applications where multiple requests
 * are made to multiple backends. For example, a common single page application
 * may make multiple requests for resources (media, templates, CSS, etc)
 * as well as multiple requests to an API server.
 *
 * For example:
 *
 * ```js
 * let server = new Resource({
 *   credentials: {
 *     username: 'username',
 *     password: 'password'
 *   },
 *   headers: {
 *     'x-source': 'mydomain.com'
 *   }
 * })
 *
 * let API = new Resource({
 *   credentials: {
 *     token: 'secret_token'
 *   },
 *   headers: {
 *     'user-agent': 'mobile'
 *   },
 *   baseUrl: 'https://api.mydomain.com'
 * })
 *
 * server.get('./templates/home.html', (response) => { ... })
 * API.json('/user', (data) => { ... })
 * ```
 *
 * Both `server` and `API` in the example above are instances of
 * the Resource class. They each use different credentials to
 * access the remote endpoint, using different global headers and
 * a different base URL.
 *
 * This can be incredibly useful anytime a migration is required,
 * such as running code in dev ==> staging ==> production or
 * switching servers. It is also useful for creating connections
 * to different remote services, creating custom API clients,
 * and generally organizing/standardizing how an application connects
 * to remote resources.
 * @extends Client
 */
export default class Resource extends Client {
  #baseUrl
  #request
  #secret
  #accessToken
  #accessTokenTimer
  #accessTokenExpiration
  #accessTokenType
  #accessTokenRenewalDuration = 0
  #accessTokenRenewalTimer
  #nocache
  #unique
  #tlsonly
  #useragent
  #uniqueagent
  #mode
  #credentials
  #cache
  #redirect
  #referrer
  #referrerPolicy
  #signKey
  #verifyKey
  #encryptKey
  #decryptKey
  #encryptAll
  #decryptAll
  #signAll
  #verifyAll
  #cryptokey = function (seed, update, allow = true, keywords) {
    if (!coalesceb(allow, true)) {
      return null
    }

    const value = coalesceb(coalesceb(...seed), update)

    if (allow && value === null) {
      throw new Error(`cannot ${keywords[0]} ${keywords[1]} body without a ${keywords[2]}`)
    }

    return value
  }

  constructor (cfg = {}) {
    super()
    this.name = 'HTTP Resource'

    cfg = typeof cfg === 'string' ? { baseUrl: cfg } : cfg

    /**
     * @cfg {string} [baseUrl=window.loction.origin]
     * The root domain/base URL to apply to all requests to relative URL's.
     * This was designed for uses where a backend API may be served on
     * another domain (such as api.mydomain.com instead of www.mydomain.com).
     * The root will only be applied to relative paths that do not begin
     * with a protocol. For example, `./path/to/endpoint` **will** have
     * the root applied (`{root}/path/to/endpoint`) whereas `https://domain.com/endpoint`
     * will **not** have the root applied.
     */
    this.#baseUrl = new Address(coalesce(cfg.baseURL, cfg.baseUrl, cfg.baseurl, globalThis.location ? globalThis.location.origin : `http://${HOSTNAME}/`))
    this.#request = new Request({
      url: this.#baseUrl.href,
      headers: coalesceb(cfg.headers, {}),
      username: cfg.username,
      password: cfg.password,
      accessToken: coalesceb(cfg.token, cfg.accessToken, cfg.accesstoken),
      /**
       * @cfgproperty {string} [redirect=follow] (follow,error,manual)
       * The redirect mode to use:
       * - `follow`: automatically follow redirects
       * - `error`: abort with an error if a redirect occurs
       * - `manual`: handle redirects manually
       */
      redirect: coalesce(cfg.redirect, this.#redirect, 'follow')
    })

    /**
     * @cfgproperty {string} [mode] (cors,no-cors,same-origin)
     * The mode to use when making a request.
     */
    if (cfg.mode) {
      this.#request.mode = cfg.mode
    }

    /**
     * @cfgproperty {string} [credentials] (omit,same-origin,include)
     * The request credentials to use for the request.
     * To automatically send cookies for the current domain,
     * this option must be provided. In browsers, starting with
     * Chrome 50, this property also takes a FederatedCredential
     * instance or a PasswordCredential instance.
     */
    if (cfg.credentials) {
      this.#request.credentials = cfg.credentials
    }

    /**
     * @cfgproperty {string} [referrer]
     * A USVString specifying the referrer of the request.
     * This can be a same-origin URL, `about:client`, or an empty
     * string.
     */
    if (cfg.referrer) {
      this.#request.referrer = cfg.referrer
    }

    /**
     * @cfgproperty {string} [referrerPolicy=no-referrer-when-downgrade] (no-referrer,no-referrer-when-downgrade,same-origin,origin,strict-origin,origin-when-cross-origin,strict-origin-when-cross-origin,unsafe-url)
     * Identify the referrer policy to use in requests.
     * Node.js environments do not natively support referrerPolicy.
     * The NGN [libnet-node](https://github.com/ngnjs/libnet-node) module
     * is available to add support for this functionality.
     */
    if (cfg.referrerPolicy) {
      this.#request.referrerPolicy = cfg.referrerPolicy
    }

    this.#secret = coalesceb(cfg.password)

    // Optionally enforce encrypted protocol
    if (coalesce(cfg.httpsOnly, cfg.httpsonly, false)) {
      this.#baseUrl.protocol = 'https'
      this.#request.url = this.#baseUrl.href
      this.#tlsonly = true
    }

    // Apply query parameters
    for (const [key, value] of Object.entries(coalesceb(cfg.query, {}))) {
      this.#request.setQueryParameter(key, value, true)
    }

    /**
     * @cfgproperty {object} headers
     * Common headers (key/value) applied to all requests.
     */

    /**
     * @cfgproperty {string} username
     * Username to be applied to all requests.
     */

    /**
     * @cfgproperty {string} password
     * Password to be applied to all requests.
     */

    /**
     * @cfgproperty {string} accessToken
     * Access token to be applied to all requests.
     * Setting this overrides any existing username/password credentials.
     */

    /**
     * @cfg {object} query
     * Contains common query parameters to be applied to all requests. All values
     * are automatically url-encoded.
     */

    /**
     * @cfg {boolean} [httpsOnly=false]
     * Set this to true to rewrite all URL's to use HTTPS.
     */

    /**
     * @cfg {boolean} [nocache=false]
     * This sets the `Cache-Control` header to `no-cache`.
     * Servers are _supposed_ to honor these headers and serve non-cached
     * content, but is not guaranteed. Some servers
     * perform caching by matching on URL's. In this case, the #unique
     * attribute can be set to `true` to apply unique characters to the URL.
     */
    this.#nocache = coalesce(cfg.nocache, false)

    /**
     * @cfgproperty {string} [cache=default] (default,no-store,reload,no-cache,force-cache,only-if-cached)
     * Identify the caching mechanism to be used. This option is ignored
     * when #nocache is specified. See the [list of options](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)
     * for details.
     */
    if (!this.#nocache) {
      this.#cache = cfg.cache
    } else {
      this.#cache = 'no-cache'
    }

    /**
     * @cfg {boolean} [unique=false]
     * Set this to `true` to add a unique URL parameter to all requests.
     * This guarantees a unique request. This can be used for
     * cache-busting, though setting #nocache to `true` is
     * recommended for these purposes. Only use this feature
     * for cache busting when the server does not honor `Cache-Control`
     * headers.
     */
    this.#unique = coalesce(cfg.unique, false)

    /**
     * @cfg {string} [useragent]
     * Specify a custom user agent to identify each request made
     * with the resource.
     * @nodeonly
     */
    this.#useragent = coalesce(cfg.useragent)

    /**
     * @cfg {boolean} [uniqueagent=false]
     * Guarantees each user agent is unique by appending a unique ID to the
     * user agent string.
     * @nodeonly
     */
    this.#uniqueagent = coalesce(cfg.uniqueagent, false)

    /**
     * @cfg {numeric} [tokenRenewalNotice=10000]
     * Trigger an event, `token.pending.expiration`, before it expires.
     * The tokenRenewalNotice is the lead time, i.e. the number of
     * milliseconds before the token actually expires. Use this
     * feature to be alerted when a token needs to be renewed.
     * Must be an integer greater than 0 (anything else prevents
     * this feature from triggering the event). Defaults to 10 seconds
     * before token expiration.
     */
    this.#accessTokenRenewalDuration = Math.floor(coalesce(cfg.tokenRenewalNotice, cfg.tokenrenewalNotice, cfg.tokenRenewalnotice, cfg.tokenrenewalnotice, 0))

    // Crypto keys
    this.#signKey = coalesceb(cfg.signingKey)
    this.#verifyKey = coalesceb(cfg.verificationKey)
    this.#encryptKey = coalesceb(cfg.encryptionKey, cfg.encryptKey)
    this.#decryptKey = coalesceb(cfg.decryptionKey, cfg.decryptKey)

    /**
     * @cfg {boolean} [encryptAll]
     * Automatically attempt to encrypt all request bodies.
     */
    this.#encryptAll = bool(coalesceb(cfg.encryptAll, cfg.encryptall))

    /**
     * @cfg {boolean} [decryptAll]
     * Automatically attempt to decrypt all response bodies.
     */
    this.#decryptAll = bool(coalesceb(cfg.decryptAll, cfg.decryptall))

    /**
     * @cfg {boolean} [signAll]
     * Automatically sign all request bodies.
     */
    this.#signAll = bool(coalesceb(cfg.signAll, cfg.signall))

    /**
     * @cfg {boolean} [verifyAll]
     * Automatically attempt to verify all response bodies.
     * Throws an error if the body cannot be verified with
     * the value found in the HTTP response `signature` header.
     */
    this.#verifyAll = bool(coalesceb(cfg.verifyAll, cfg.verifyall))

    this.on('token.expired', () => {
      clearTimeout(this.#accessTokenTimer)
      clearTimeout(this.#accessTokenRenewalTimer)
      this.removeHeader('Authorization')
      WARN(`${this.name} HTTP client access token expired.`)
    })

    this.#request.relay('*', this)

    this.register('HttpResource', this)
  }

  /**
   * @property {boolean} encryptAll
   * Auto-encrypt all requests by default.
   * @writeonly
   */
  set encryptAll (value) {
    this.#encryptAll = bool(value)
  }

  /**
   * @property {boolean} decryptAll
   * Auto-decrypt all responses by default.
   * @writeonly
   */
  set decryptAll (value) {
    this.#decryptAll = bool(value)
  }

  /**
   * @property {boolean} signAll
   * Auto-sign all request bodies by default.
   * @writeonly
   */
  set signAll (value) {
    this.#signAll = bool(value)
  }

  /**
   * @property {boolean} verifyAll
   * Auto-verify all response bodies by default.
   * @writeonly
   */
  set verifyAll (value) {
    this.#verifyAll = bool(value)
  }

  /**
   * @cfgproperty {string} signingKey
   * The private key used to sign requests. This can
   * be an RSA or ECDSA key in PEM format.
   */
  get signingKey () {
    return this.#signKey
  }

  set signingKey (value) {
    this.#signKey = value
  }

  /**
   * @cfgproperty {string} verificationKey
   * he public key used to verify requests. This can
   * be an RSA or ECDSA key in PEM format.
   */
  get verificationKey () {
    return this.#verifyKey
  }

  set verificationKey (value) {
    this.#verifyKey = value
  }

  /**
   * @cfgproperty {string} encryptionKey
   * The encryption key is a shared key (string) or private key (PEM) used
   * to encrypt the body of a request. RSA and ECDSA keys are supported.
   */
  get encryptionKey () {
    return this.#encryptKey
  }

  set encryptionKey (value) {
    this.#encryptKey = value
  }

  /**
   * @cfgproperty {string} decryptionKey
   * The decryption key is a shared key (string) or public key (PEM) used
   * to decrypt the body of a request. RSA and ECDSA keys are supported.
   * If decryption is requested and no decryption key is specified, the
   * encryption key will be used (assumes shared key).
   */
  get decryptionKey () {
    return this.#decryptKey
  }

  set decryptionKey (value) {
    this.#decryptKey = value
  }

  get baseUrl () {
    return this.#request.href
  }

  set baseUrl (value) {
    const old = this.#baseUrl
    const uri = new Address(value)
    this.#baseUrl = uri

    WARN(`The ${this.name} HTTP resource base URL changed from "${old.toString()}" to "${uri.toString()}"`)
  }

  get username () {
    return this.#request.username
  }

  set username (value) {
    this.#request.username = value
  }

  set password (value) {
    this.#request.password = value
  }

  get cache () { return this.#cache }
  set cache (value) { this.#request.cache = value }

  get mode () { return this.#mode }
  set mode (value) { this.#request.mode = value }

  get credentials () { return this.#credentials }
  set credentials (value) { this.#request.credentials = value }

  get redirect () { return this.#redirect }
  set redirect (value) {
    if (value !== this.#redirect) {
      if (!REDIRECT_MODES.has(value)) {
        throw UnacceptableParameterTypeError() // eslint-disable-line no-undef
      }
      this.#request.redirect = value
    }
  }

  get referrer () { return this.#referrer }
  set referrer (value) {
    this.#request.referrer = value
  }

  get referrerPolicy () { return this.#referrerPolicy }
  set referrerPolicy (value) {
    this.#request.referrerPolicy = value
  }

  /**
   * @property {Headers} headers
   * Represents the current common headers.
   *
   * This is commonly used when a remote resource requires a specific
   * header on every call.
   *
   * **Example**
   *
   * ```js
   * let resource = new Resource(...)
   *
   * resource.headers = {
   *   'user-agent': 'my custom agent name'
   * }
   * ```
   */
  get headers () {
    return this.#request.headers
  }

  set headers (value) {
    this.#request.headers = value
  }

  /**
   * @property {string} token
   * The token value. Setting this value is the same as executing
   * `setToken(token, 'bearer', null)` (a bearer token with no
   * expiration).
   * @writeonly
   */
  set accessToken (value) {
    this.setAccessToken(value)
  }

  /**
   * @param {string} [token=null]
   * The token value.
   * @param {string} [type=bearer]
   * The type of token. This is passed to the `Authorization` HTTP header.
   * The most common type of token is the `bearer` token.
   * @param {date|number} [expiration]
   * Specify a date/time or the number of milliseconds until the
   * token expires/invalidates. Setting this will expire the request
   * at this time. Requests made after this will not have the token
   * applied to them.
   */
  setAccessToken (token = null, type = 'Bearer', expiration = null) {
    if (token === this.#accessToken &&
      (token === null ? true : this.getHeader('Authorization') === `${type} ${token}`) &&
      this.#accessTokenExpiration === expiration) {
      return
    }

    this.#request.accessToken = token
    this.#accessTokenType = type

    clearTimeout(this.#accessTokenTimer)
    clearTimeout(this.#accessTokenRenewalTimer)

    if (expiration) {
      if (!isNaN(expiration)) {
        expiration = new Date(expiration)
      }

      this.#accessTokenExpiration = expiration
      expiration = expiration.getTime() - (new Date()).getTime()

      if (expiration <= 0) {
        this.emit('token.expired', { manually: false })
      } else {
        this.emit('token.update', { expires: this.#accessTokenExpiration })
        this.#accessTokenTimer = setTimeout(() => this.emit('token.expired', { manually: false }), expiration)
        if (this.#accessTokenRenewalDuration > 0) {
          this.#accessTokenRenewalTimer = setTimeout(() => this.emit('token.expiration.pending', this), this.#accessTokenRenewalDuration)
        }
      }
    }
  }

  /**
   * @property {QueryParameters} query
   * Represents the current global query paramaters.
   *
   * This is commonly used when a remote resource requires a specific
   * query paramater on every call.
   *
   * **Example**
   *
   * ```js
   * let resource = new Resource(...)
   *
   * resource.query = {
   *   'user_id': '12345'
   * }
   *
   * console.log(resource.query.get('user_id'))
   * ```
   *
   * All parameter values are automatically URL-encoded.
   */
  get query () {
    return this.#request.query
  }

  set query (value) {
    this.#request.query = value
  }

  /**
   * @method route
   * Route requests to a specific path. For example:
   *
   * ```javascript
   * const API = new Resource({ baseUrl: 'https://api.domain.com' })
   * const v1 = API.route('/v1')
   * const v2 = API.route('/v2')
   *
   * API.GET('/endpoint', ...) // GET https://api.domain.com/endpoint
   * v1.GET('/endpoint', ...) // GET https://api.domain.com/v1/endpoint
   * v2.GET('/endpoint', ...) // GET https://api.domain.com/v2/endpoint
   * v1.GET('https://different.com', ...) // GET https://different.com
   * ```
   *
   * The route method provides a way to organize resources by path.
   * @note The special `Resource` object returned by this method only
   * affects the request path. All other properties, such as credentials,
   * headers, and query parameters are proxied to the original resource.
   * For example, changing the credentials will impact all other instances:
   *
   * ```javascript
   * API.accessToken = 'newtoken'
   * v1.GET(...) // Uses "newtoken"!
   * v2.accessToken = 'different'
   * v1.GET(...) // Uses "different"!
   * ```
   *
   * Remember, routes are a _(sub)instance of the original resource_.
   * This allows developers to easily configure/change multiple requests
   * very easily. If a resource needs uniquely different properties,
   * create a new resource instead of using routes, i.e.
   *
   * ```javascript
   * const API = new Resource({ baseUrl: 'https://api.domain.com' })
   * const v1 = new Resource({ baseUrl: 'https://api.domain.com/v1' })
   * const v2 = API.clone({ baseUrl: 'https://api.domain.com/v2' })
   * ```
   * @note If you need a distinctly different resource, consider
   * using the #clone method.
   * @param {string} path
   * The path/subroute to apply to requests.
   * @return {Resource}
   * Returns a reference to the original resource, with a path modifier.
   */
  route (path) {
    return new Proxy(this, {
      get (target, prop) {
        // Base properties
        switch (prop) {
          case 'baseUrl':
            return target.prepareUrl(path)

          case 'prepareUrl':
            return uri => new URL(uri, target.prepareUrl(path)).href
        }

        // Pseudo-middleware for client, which modifies the request path.
        if ((HTTP_METHODS.has(prop.toUpperCase())) && typeof target[prop] === 'function') {
          return function () {
            const args = Array.from(arguments)
            return target[prop](path + '/' + args.shift(), ...args)
          }
        } else if (prop.toUpperCase() === 'REQUEST') {
          return (cfg = {}, callback) => {
            cfg.url = path + '/' + arguments[0]
            return target.request(cfg, callback)
          }
        }

        // All other attributes
        return target[prop]
      }
    })
  }

  /**
   * @method prepareUrl
   * Prepare a URL by applying the base URL (only when appropriate).
   * @param  {string} uri
   * The universal resource indicator (URI/URL) to prepare.
   * @return {string}
   * Returns a fully qualified URL.
   * @private
   */
  prepareUrl (uri) {
    const input = uri
    uri = new Address(new URL(uri, this.#baseUrl.href))

    if (!/^\.{2}/.test(input)) {
      uri.path = `${this.#baseUrl.path}/${uri.path}`.replace(/\/{2,}|\\/gi, '/')
    }

    if (this.#tlsonly) {
      uri.protocol = 'https'
    }

    return uri.href
  }

  /**
   * @method preflight
   * Prepares a request before it is sent.
   * @param {Request} request
   * The request object.
   * @private
   */
  preflight (req, cfg) {
    // Support automatic request body encryption
    req.encryptionKey = this.#cryptokey(
      [cfg.encryptionKey, cfg.encryptKey],
      this.#encryptKey,
      coalesce(cfg.encrypt, this.#encryptAll),
      ['encrypt', 'request', 'encryption key']
    )

    // Support automatic response body decryption
    req.decryptionKey = this.#cryptokey(
      [cfg.decryptionKey, cfg.decryptKey],
      coalesceb(this.#decryptKey, this.#encryptKey),
      coalesce(cfg.decrypt, this.#decryptAll),
      ['decrypt', 'response', 'decryption key']
    )

    // Support automatic request body signing
    req.signingKey = this.#cryptokey(
      [cfg.signingKey, cfg.signKey],
      this.#signKey,
      coalesce(cfg.sign, this.#signAll),
      ['sign', 'request', 'private key']
    )

    // Support automatic response body verification
    req.verificationKey = this.#cryptokey(
      [cfg.verificationKey, cfg.verifyKey],
      this.#verifyKey,
      coalesce(cfg.verify, this.#verifyAll),
      ['verify', 'response', 'public key']
    )

    req.url = this.prepareUrl(req.configuredURL)
    req.assign(this.#request, false)

    // Set no-cache header if configured.
    if (this.#nocache) {
      req.cache = 'no-cache'
    }

    // Apply configured query parameters
    for (const [param, value] of Object.entries(coalesceb(cfg.query, {}))) {
      req.setQueryParameter(param, value)
    }

    // Apply configured headers
    for (const [header, value] of Object.entries(coalesceb(cfg.headers, {}))) {
      req.setHeader(header, value)
    }

    // Force unique URL
    if (this.#unique) {
      req.setQueryParameter('nocache' + (new Date()).getTime().toString() + Math.random().toString().replace('.', ''), '')
    }

    // Use custom user agents
    let useragent = coalesce(this.#useragent)
    if (this.#uniqueagent) {
      useragent += ` ID#${(new Date()).getTime().toString() + Math.random().toString().replace('.', '')}`
    }

    if (useragent) {
      if (NGN.runtime !== 'browser') {
        req.setHeader('User-Agent', useragent.trim())
      } else {
        req.removeHeader('user-agent')
        WARN(`Cannot set user agent to "${useragent.trim()}" in a browser. Browsers consider this an unsafe operation and will block the request.`)
      }
    }

    // Additional request configuration ovrrides
    if (coalesceb(cfg.accessToken)) {
      req.accessToken = cfg.accessToken
    } else {
      if (coalesceb(cfg.username)) {
        req.username = cfg.username
      }
      if (req.username && coalesceb(cfg.password)) {
        req.password = cfg.password
      }
    }
    if (req.accessToken && coalesceb(cfg.accessTokenType)) {
      req.accessTokenType = cfg.accessTokenType
    }
    if (req.proxyUsername && coalesceb(cfg.proxyPassword)) {
      req.proxyPassword = cfg.proxyPassword
    }

    for (const attr of REQUEST_ATTRIBUTES) {
      if (coalesceb(cfg[attr])) {
        req[attr] = cfg[attr]
      }
    }
  }

  /**
   * Set a global header. This will be sent on every request.
   * It is also possible to set multiple global headers at the same time by
   * providing an object, where each object
   * key represents the header and each value is the header value.
   *
   * For example:
   *
   * ```
   * setHeader({
   *   'x-header-a': 'value',
   *   'x-header-b': 'value'
   * })
   * ```
   * @param {string} header
   * The header name.
   * @param {string} value
   * The value of the header.
   */
  setHeader (key, value) {
    if (typeof key === 'object') {
      for (const [attr, val] of key) {
        this.#request.headers.set(attr, val)
      }

      return
    }

    this.#request.headers.set(key, value)
  }

  /**
   * Remove a global header so it is not sent
   * on every request. This method accepts multiple
   * keys, allowing for bulk delete via `removeHeader('a', 'b', '...')`
   * @param  {string} key
   * The header key to remove.
   */
  removeHeader (key) {
    Array.from(arguments).forEach(el => this.#request.headers.delete(el))
  }

  /**
   * Remove all global headers.
   */
  clearHeaders () {
    this.#request.headers = new Map()
  }

  /**
   * Set a global URL parameter. This will be sent on every request.
   * It is also possible to set multiple parameters at the same time by
   * providing an object, where each object
   * key represents the parameter name and each value is the parameter value.
   *
   * For example:
   *
   * ```
   * setParameter({
   *   'id': 'value',
   *   'token': 'value'
   * })
   * ```
   * @param {string} queryParameterName
   * The parameter name.
   * @param {string} value
   * The value of the parameter. This will be automatically URI-encoded.
   */
  setParameter (key, value) {
    if (typeof key === 'object') {
      for (const [attr, val] of key) {
        this.#request.setQueryParameter(attr, val)
      }

      return
    }

    this.#request.setQueryParameter(key, value)
  }

  /**
   * Remove a global query parameter so it is not sent
   * on every request. This method accepts multiple
   * parameters, allowing for bulk delete via `removeParameter('a', 'b', '...')`
   * @param  {string} queryParameterName
   * The name of the parameter to remove.
   */
  removeParameter () {
    Array.from(arguments).forEach(this.#request.removeQueryParameter)
  }

  /**
   * Remove all global query parameters.
   */
  clearParameters () {
    this.#request.clearQueryParameters()
  }

  /**
   * Clone the resource as a new independent network resource.
   * There is no relationship between the original resource
   * and its clone. However; the clone will receive events from
   * the original resource. All event names are prefixed with
   * `origin`. For example:
   *
   * ```javascript
   * API = new Resource({
   *   baseUrl: 'https://api.domain.com',
   *   accessToken: '...',
   *   accessTokenRenewal: '...'
   * })
   *
   * API.on('token.expired', function() {
   *   console.log('time to renew the token')
   * })
   *
   * ALT = API.clone({
   *   accessToken: 'different_token'
   * })
   *
   * ALT.on('origin.token.expired', function () {
   *   console.log('The token from the original resource expired.')
   * })
   * ```
   *
   * In the example above, `ALT` has a new token of `different_token`
   * and the expiration of the original resource's token doesn't impact
   * the clone at all. Relaying the origin events to the clone is merely
   * a convenience. It can be used for logging, diffing, syncing specific
   * changes, etc.
   * @note If you only need to modify the base path, consider using
   * the #route method instead.
   * @param {object} [configuration]
   * This object may contain any of the Resource configuration attributes.
   * These configuration values will override/replace the original
   * values.
   * @return {Resource}
   */
  clone (cfg = {}) {
    const resource = new Resource({
      baseUrl: coalesceb(cfg.baseUrl, this.#baseUrl.href),
      headers: coalesceb(cfg.headers, this.headers),
      mode: coalesceb(cfg.mode, this.#mode),
      credentials: coalesceb(cfg.credentials, this.#credentials),
      cache: coalesceb(cfg.cache, this.#cache),
      redirect: coalesceb(cfg.redirect, this.#redirect),
      referrer: coalesceb(cfg.referrer, this.#referrer),
      referrerPolicy: coalesceb(cfg.referrerPolicy, this.#referrerPolicy),
      username: coalesceb(cfg.username, this.username),
      password: coalesceb(cfg.password, this.#secret),
      accessToken: coalesceb(cfg.accessToken, this.#accessToken),
      httpsOnly: coalesceb(cfg.httpsOnly, this.#tlsonly),
      query: coalesceb(cfg.query, this.query),
      nocache: coalesceb(cfg.nocache, this.#nocache),
      unique: coalesceb(cfg.unique, this.#unique),
      useragent: coalesceb(cfg.useragent, this.#useragent),
      uniqueagent: coalesceb(cfg.uniqueagent, this.#uniqueagent),
      tokenRenewalNotice: coalesceb(cfg.tokenRenewalNotice, this.#accessTokenRenewalDuration)
    })

    this.relay('*', resource, 'origin')

    return resource
  }
}
