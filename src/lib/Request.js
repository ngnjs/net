import Address from './URL.js'
import Fetch from './fetch/index.js'
import Headers from './Headers.js'
import Reference from '@ngnjs/plugin'
import { object, coalesce, coalesceb } from '@ngnjs/libdata'
import {
  IDEMPOTENT_METHODS,
  REQUEST_NOBODY_METHODS,
  REQUEST_CREDENTIALS,
  REFERRER_MODES,
  HTTP_METHODS,
  CORS_MODES,
  CACHE_MODES,
  REDIRECT_MODES
} from './constants.js'
import Credential from './Credential.js'

const NGN = new Reference().requires('WARN', 'public', 'hidden', 'hiddenconstant', 'nodelike', 'EventEmitter')
const { WARN } = NGN

/**
 * Represents a network request.
 * @private
 */
export default class Request extends NGN.EventEmitter { // eslint-disable-line no-unused-vars
  #method = 'GET'
  #headers = new Headers()
  #body = null
  #cache = 'default'
  #mode = 'cors'
  referrer = null
  #referrerPolicy = 'no-referrer-when-downgrade'
  #credentials
  #redirect = 'follow'
  sri = null
  #controller
  #uri
  #auth
  #proxyAuth
  #rawURL
  #signKey
  #verifyKey
  #encryptKey
  #decryptKey

  constructor (cfg = {}) {
    super()
    this.name = 'HTTP Request'

    if (typeof cfg === 'string') {
      cfg = { url: cfg }
    }

    if (cfg.url instanceof URL || cfg.url instanceof Address) {
      cfg.url = cfg.href
    }

    // Require URL and HTTP method
    object.require(cfg, 'url')
    this.#rawURL = cfg.url instanceof URL || cfg.url instanceof Address ? cfg.url.href : cfg.url

    if (object.any(cfg, 'form', 'json')) {
      WARN('Request', '"form" and "json" configuration properties are invalid. Use "body" instead.')
    }

    /**
     * @cfgproperty {string} url (required)
     * The complete URL for the request, including query parameters.
     * This value is automatically normalized.
     */
    this.url = cfg.url
    // Use the setter to configure the URL

    /**
     * @cfg {string} [method=GET]
     * The HTTP method to invoke when the request is sent. The standard
     * RFC 2616 HTTP methods include:
     *
     * - OPTIONS
     * - HEAD
     * - GET
     * - POST
     * - PUT
     * - DELETE
     * - TRACE
     * - CONNECT
     *
     * There are many additional non-standard methods some remote hosts
     * will accept, including `PATCH`, `COPY`, `LINK`, `UNLINK`, `PURGE`,
     * `LOCK`, `UNLOCK`, `VIEW`, and many others. If the remote host
     * supports these methods, they may be used in an NGN Request.
     * Non-standard methods will not be prevented, but NGN will trigger
     * a warning event if a non-standard request is created.
     */
    this.#method = coalesceb(cfg.method, 'GET')

    /**
     * @cfg {object} [headers]
     * Optionally supply custom headers for the request. Most standard
     * headers will be applied automatically (when appropriate), such
     * as `Content-Type`, `Content-Length`, and `Authorization`.
     * In Node-like environments, a `User-Agent` will be applied containing
     * the `hostname` of the system making the request. Any custom headers
     * supplied will override/augment headers these headers.
     */
    this.#headers = new Headers(coalesceb(cfg.headers, {}))

    /**
     * @cfg {object|string|binary} [body]
     * The body configuration supports text, an object, data URL, or
     * binary content. **For multi-part form data (file uploads), use
     * the #files configuration _instead_ of this attribute.**
     *
     * To construct a simple form submission (x-www-form-urlencoded),
     * use a specially formatted key/value object conforming to the
     * following syntax:
     *
     * ```json
     * body: {
     *   form: {
     *     form_field_1: "value",
     *     form_field_2: "value",
     *     form_field_3: "value",
     *   }
     * }
     * ```
     * The object above is automatically converted and url-encoded as:
     *
     * ```js
     * form_field_1=value&form_field_2=value&form_field_3=value
     * ```
     *
     * The appropriate request headers are automatically applied.
     */
    this.#body = coalesce(cfg.body)

    /**
     * @cfgproperty {string} [credentials] (omit,same-origin,include)
     * The request credentials to use for the request.
     * To automatically send cookies for the current domain,
     * this option must be provided. In browsers, starting with
     * Chrome 50, this property also takes a FederatedCredential
     * instance or a PasswordCredential instance.
     *
     * To automatically send cookies for the current domain, this
     * option must be provided.
     */
    this.credentials = coalesceb(cfg.credentials)

    /**
     * @cfgproperty {string} [cache=default] (default, no-store, reload, no-cache, force-cache, only-if-cached)
     * The [caching mechanism](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache) applied to the request.
     * Node-like environments do not have a native HTTP cache. NGN provides
     * a limited HTTP cache for Node-like environments, adhering to the principles
     * defined in the [MDN HTTP Cache Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching).
     * The most noticeable differences are:
     * 1. Incomplete results (HTTP Status 206 / Partial Content) won't be cached.
     * 1. Redirects are handled differently (internally only, results are the same).
     * @warning Browsers are the only runtime to support this feature natively. The
     * NGN libnet-node plugin adds support for modern Node.js runtimes.
     */
    this.cache = coalesce(cfg.cache, NGN.nodelike ? 'no-store' : 'default')

    /**
     * @cfgproperty {string} [referrer]
     * The referrer URL to send to the destination. By default, this will be the current URL
     * of the page or the hostname of the process.
     * See the [MDN overview of referrers](https://hacks.mozilla.org/2016/03/referrer-and-cache-control-apis-for-fetch/) for details.
     */
    this.referrer = coalesceb(cfg.referrer)

    /**
     * @cfgproperty {string} [referrerPolicy=no-referrer-when-downgrade] (no-referrer, no-referrer-when-downgrade, same-origin, origin, strict-origin, origin-when-cross-origin, strict-origin-when-cross-origin, unsafe-url)
     * Specify the [referrer policy](https://w3c.github.io/webappsec-referrer-policy/#referrer-policies). This can be empty/null.
     * @warning Browsers are the only runtime to support this feature natively. The
     * NGN libnet-node plugin adds support for modern Node.js runtimes.
     */
    this.referrerPolicy = coalesce(cfg.referrerPolicy, 'no-referrer-when-downgrade')

    /**
     * @cfgproperty {string} [sri]
     * The [subresource integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) value of the request.
     * Example: `sha256-BpfBw7ivV8q2jLiT13fxDYAe2tJllusRSZ273h2nFSE=`
     * @warning Browsers are the only runtime to support this feature natively. The
     * NGN libnet-node plugin adds support for modern Node.js runtimes.
     */
    this.sri = coalesceb(cfg.sri, cfg.integrity, cfg.subresourceintegrity, cfg.subresourceIntegrity)

    /**
     * @cfgproperty {string} [redirect=follow] (follow,error,manual)
     * The redirect mode to use:
     * - `follow`: automatically follow redirects
     * - `error`: abort with an error if a redirect occurs
     * - `manual`: handle redirects manually
     */
    this.redirect = coalesceb(cfg.redirect, 'follow')

    /**
     * @cfgproperty {string} [mode] (cors,no-cors,same-origin,null)
     * The mode to use when making a request. When set to `null`,
     * the default mode is used. The default differs by request
     * initiation. See the [MDN default mode notes](https://developer.mozilla.org/en-US/docs/Web/API/Request/mode)
     * for.
     */
    this.mode = coalesceb(cfg.mode)

    Object.defineProperties(this, {
      /**
       * @cfg {boolean} [enforceMethodSafety=true]
       * [RFC 2616](https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html)
       * defines some HTTP methods as idempotent (safe). These methods
       * should have no significance to data (i.e. read-only). For example,
       * `OPTIONS`, `HEAD`, and `GET` are all idempotent. By default, requests
       * loosely enforce idempotence by ignoring the request body when making a
       * request. While it is not advised, nor officially supported, requests can
       * technically ignore method safety, allowing a request body to be
       * sent to a remote server with an unsage method. Set this configuration
       * to `false` to prevent requests from enforcing idempotence/safety.
       */
      enforceMethodSafety: NGN.hidden(coalesce(cfg.enforceMethodSafety, cfg.enforcemethodsafety, true)),

      /**
       * @cfgproperty {Number} [timeout=30000]
       * The number of milliseconds to wait before considering the request to
       * have timed out. Defaults to `30000` (30 seconds).
       */
      timeout: NGN.public(coalesce(cfg.timeout, 30000)),

      /**
       * @method isCrossOrigin
       * Determine if accessing a URL is considered a cross origin request.
       * @param {string} url
       * The URL to identify as a COR.
       * @returns {boolean}
       * @private
       */
      isCrossOrigin: NGN.hiddenconstant(url => this.#uri.isSameOrigin(url)),

      /**
       * @method applyAuthorizationHeader
       * Generates and applies the authorization header for the request,
       * based on the presence of #username, #password, or #accessToken.
       * @private
       */
      applyAuthorizationHeader: NGN.hiddenconstant(() => {
        const authHeader = this.#auth.header
        const proxyAuthHeader = this.#proxyAuth.header

        if (authHeader) {
          this.setHeader('Authorization', authHeader, true)
        } else {
          this.removeHeader('Authorization')
        }

        if (proxyAuthHeader) {
          this.setHeader('Proxy-Authorization', proxyAuthHeader, true)
        } else {
          this.removeHeader('Proxy-Authorization')
        }
      }),

      prepareBody: NGN.hidden(() => {
        // Request body management
        if (this.#body !== null) {
          const contentType = coalesceb(this.getHeader('content-type'))

          switch (typeof this.#body) {
            case 'object': {
              if (object.exactly(this.#body, 'form')) {
                const dataString = []

                for (let [key, value] of Object.entries(this.#body.form)) {
                  if (typeof value === 'function') {
                    throw new Error('Invalid form data. Form data cannot be a complex data format such as an object or function.')
                  } else if (typeof value === 'object') {
                    value = JSON.stringify(value)
                  }

                  dataString.push(`${key}=${encodeURIComponent(value)}`)
                }

                this.#body = dataString.join('&')
                this.setHeader('Content-Type', 'application/x-www-form-urlencoded')
              } else {
                this.#body = JSON.stringify(this.#body).trim()
                this.setHeader('Content-Length', this.#body.length)
                this.setHeader('Content-Type', coalesceb(contentType, 'application/json'))
              }

              break
            }

            case 'string': {
              if (contentType !== null) {
                // Check for form data
                let match = /([^=]+)=([^&]+)/.exec(this.#body)

                if (match !== null && this.#body.trim().substr(0, 5).toLowerCase() !== 'data:' && this.#body.trim().substr(0, 1).toLowerCase() !== '<') {
                  this.setHeader('Content-Type', 'application/x-www-form-urlencoded')
                } else {
                  if (contentType === null) {
                    this.setHeader('Content-Type', 'text/plain')
                  }

                  if (this.#body.trim().substr(0, 5).toLowerCase() === 'data:') {
                    // Crude Data URL mimetype detection
                    match = /^(data:)(.*);/gi.exec(this.#body.trim())

                    if (match !== null) {
                      this.setHeader('Content-Type', match[2])
                    }
                  } else if (/^(<\?xml.*)/gi.test(this.#body.trim())) {
                    // Crude XML Detection
                    this.setHeader('Content-Type', 'application/xml')
                  } else if (/^<html.*/gi.test(this.#body.trim())) {
                    // Crude HTML Detection
                    this.setHeader('Content-Type', 'text/html')
                  }
                }
              } else if (contentType === null) {
                this.setHeader('Content-Type', 'text/plain')
              }

              this.setHeader('Content-Length', this.#body.length)

              break
            }

            default:
              WARN('NGN.Request.body', `The request body cannot be ${typeof this.#body}. Please provide a string, object, or binary value for the body.`)
          }
        }
      }),

      AUTH_CREDENTIAL: NGN.set(cred => { this.#auth = cred.clone() }),
      PROXY_CREDENTIAL: NGN.set(cred => { this.#proxyAuth = cred.clone() })
    })

    this.#auth = new Credential({
      /**
       * @cfgproperty {string} username
       * A username to authenticate the request with (basic auth).
       */
      username: coalesceb(cfg.username),
      /**
       * @cfgproperty {string} password
       * A password to authenticate the request with (basic auth).
       * @readonly
       */
      password: coalesceb(cfg.password),
      /**
       * @cfgproperty {string} accessToken
       * An access token to authenticate the request with (Bearer auth).
       * If this is configured, it will override any basic auth settings.
       */
      accessToken: coalesceb(cfg.accessToken),
      /**
       * @cfgproperty {String} [accessTokenType='Bearer']
       * The type of access token. This is used to populate the
       * Authorization header when a token is present.
       *
       * _Example:_
       * ```
       * Authorization: 'Bearer myTokenGoesHere'
       * ```
       */
      accessTokenType: coalesceb(cfg.accessTokenType, 'Bearer')
    })

    this.#proxyAuth = new Credential({
      /**
       * @cfgproperty {string} proxyUsername
       * A username to authenticate the request with (basic auth).
       */
      username: coalesceb(cfg.proxyUsername),
      /**
       * @cfgproperty {string} proxyPassword
       * A password to authenticate the request with (basic auth).
       * @readonly
       */
      password: coalesceb(cfg.proxyPassword),
      /**
       * @cfgproperty {string} proxyAccessToken
       * An access token to authenticate the request with (Bearer auth).
       * If this is configured, it will override any basic auth settings.
       */
      accessToken: coalesceb(cfg.proxyAccessToken),
      /**
       * @cfgproperty {String} [proxyAccessTokenType='Bearer']
       * The type of access token. This is used to populate the
       * Authorization header when a token is present.
       *
       * _Example:_
       * ```
       * Authorization: 'Bearer myTokenGoesHere'
       * ```
       */
      accessTokenType: coalesceb(cfg.proxyAccessTokenType, 'Bearer')
    })

    this.#auth.reference = this
    this.#proxyAuth.reference = this

    this.#signKey = coalesceb(cfg.signingKey)
    this.#verifyKey = coalesceb(cfg.verificationKey)
    this.#encryptKey = coalesceb(cfg.encryptionKey, cfg.encryptKey)
    this.#decryptKey = coalesceb(cfg.decryptionKey, cfg.decryptKey)

    // if (cfg.maxRedirects) {
    //   this.maxRedirects = cfg.maxRedirects
    // }

    this.method = coalesceb(cfg.method, 'GET')

    this.prepareBody()
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

  /**
   * @property {string} configuredURL
   * The URL value supplied to the Request constructor
   * (i.e. the original URL provided to `new Request()`).
   */
  get configuredURL () {
    return this.#rawURL
  }

  get authType () {
    return this.#auth.authType
  }

  get proxyAuthType () {
    return this.#proxyAuth.authType
  }

  get cache () {
    return this.#cache
  }

  set cache (value) {
    value = coalesceb(value, 'default')
    if (typeof value !== 'string') {
      throw new Error(`Cache mode must be one of the following: ${Array.from(CACHE_MODES).join(', ')}. "${value}" is invalid.`)
    }

    if (this.#cache !== value) {
      const old = this.#cache

      value = value.trim().toLowerCase()

      if (!CACHE_MODES.has(value)) {
        throw new Error(`"${value}" is an unrecognized cache mode.Must be one of: ${Array.from(CACHE_MODES).join(', ')}.`)
      } else {
        this.#cache = value
      }

      if (value === 'only-if-cached' && this.#mode !== 'same-origin') {
        this.mode = 'same-origin'
        WARN('Request\'s CORS mode automatically set to "same-origin" for caching mode of "only-if-cached".')
      }

      this.emit('update.cache', { old, new: value })
    }
  }

  get mode () {
    return this.#mode
  }

  set mode (value) {
    value = coalesceb(value)
    if (value !== this.#mode) {
      if (value !== null && typeof value !== 'string') {
        throw new Error(`CORS mode must be cors, no-cors, or same-origin. "${value}" is invalid.`)
      }

      const old = this.#mode

      if (value !== null && this.#cache !== 'only-if-cached') {
        value = value.trim().toLowerCase()
        if (!CORS_MODES.has(value)) {
          throw new Error(`"${value} is an invalid CORS mode. Must be one of: ${Array.from(CORS_MODES).join(', ')}`)
        }
      }

      this.#mode = value
      this.emit('update.mode', { old, new: value })
    }
  }

  get referrerPolicy () {
    return this.#referrerPolicy
  }

  set referrerPolicy (value) {
    if (this.#referrerPolicy !== value) {
      const old = this.#referrerPolicy

      if (coalesceb(value) === null) {
        this.#referrerPolicy = null
      } else {
        if (value === null || value === undefined || typeof value !== 'string') {
          throw UnacceptableParameterTypeError(`Referrer policy "${value}" must be one of the following: ${Array.from(REFERRER_MODES).join(', ')}, null, or an empty string.`) // eslint-disable-line no-undef
        }

        value = value.trim().toLowerCase()

        if (!REFERRER_MODES.has(value)) {
          throw UnacceptableParameterTypeError(`Referrer policy "${value}" must be one of the following: ${Array.from(REFERRER_MODES).join(', ')}, null, or an empty string.`) // eslint-disable-line no-undef
        }

        this.#referrerPolicy = value
      }

      this.emit('update.referrerPolicy', { old, new: this.#referrerPolicy })
    }
  }

  get credentials () { return this.#credentials }

  set credentials (value) {
    value = coalesce(value, '').trim().toLowerCase()
    if (value !== this.#credentials) {
      const old = this.#credentials

      if (value.length === 0) {
        this.emit('update.credentials', { old, new: null })
        this.#credentials = null
        return
      }

      if (!REQUEST_CREDENTIALS.has(value)) {
        throw UnacceptableParameterTypeError(`"${value}" must be one of the following: ${Array.from(REQUEST_CREDENTIALS).join(', ')}`) // eslint-disable-line no-undef
      }

      this.#credentials = value
      this.emit('update.credentials', { old, new: value })
    }
  }

  get redirect () { return coalesceb(this.#redirect, 'follow') }

  set redirect (value) {
    value = coalesce(value, 'follow').toLowerCase()
    if (value !== this.#redirect) {
      if (!REDIRECT_MODES.has(value)) {
        throw UnacceptableParameterTypeError(`Redirect value of "${value}" must be one of the following: ${Array.from(REDIRECT_MODES).join(', ')}`) // eslint-disable-line no-undef
      }

      const old = this.#redirect
      this.#redirect = value
      this.emit('update.redirect', { old, new: this.#redirect })
    }
  }

  /**
   * @property {string} protocol
   * The protocol used to make the request.
   * @readonly
   */
  get protocol () {
    return this.#uri.protocol
  }

  /**
   * @property {string} host
   * The hostname/domain of the request (includes port if applicable).
   */
  get host () {
    return this.#uri.toString({
      protocol: false,
      username: false,
      password: false,
      urlencode: false,
      hash: false,
      querystring: false
    })
  }

  /**
   * @property {string} hostname
   * The hostname/domain of the request (does not include port).
   */
  get hostname () {
    return this.#uri.hostname
  }

  /**
   * @property {number} port
   * The port of the remote host.
   */
  get port () {
    return this.#uri.port
  }

  /**
   * @property {string} path
   * The pathname of the URL.
   */
  get path () {
    return this.#uri.path
  }

  /**
   * @property {string} querystring
   * The raw query string of the URI. To retrieve a key/value list,
   * use #queryParameters instead.
   */
  get querystring () {
    return this.#uri.querystring
  }

  /**
   * @property {Map} query
   * Returns a key/value object containing the URL query parameters of the
   * request, as defined in the #url. The parameter values (represented as keys
   * in this object) may not be modified or removed (use setQueryParameter or removeQueryParameter
   * to modify/delete a query parameter).
   * @readonly
   */
  get query () {
    return Object.freeze(Object.assign({}, this.#uri.query))
  }

  set query (value) {
    if (value instanceof Map) {
      value = Object.fromEntries(value)
    }

    if (typeof value !== 'object') {
      throw new TypeError('Query parameters must be set as an object or Map.')
    }

    this.clearQueryParameters()

    for (const [key, val] of Object.entries(value)) {
      this.setQueryParameter(key, val)
    }
  }

  /**
   * @property {string} hash
   * The hash part of the URL (i.e. everything after the trailing `#`).
   */
  get hash () {
    return coalesceb(this.#uri.hash) || ''
  }

  /**
   * @property {string} url
   * The URL where the request will be sent.
   */
  get url () {
    return this.#uri.toString()
  }

  set url (value) {
    if (!coalesceb(value)) {
      WARN('Request.url', 'A blank URL was identified for a request. Using current URL instead.')
    }

    const old = this.#uri ? this.#uri.href : null
    this.#uri = value instanceof URL ? new Address(value.href) : new Address(value)

    if (coalesceb(this.#uri.username)) {
      this.#auth.username = coalesceb(this.#uri.username)
    }

    if (coalesceb(this.#uri.password)) {
      this.#auth.password = coalesceb(this.#uri.password)
    }

    if (old !== this.#uri.href) {
      this.emit('update.url', { old, new: this.#uri.href })
    }
  }

  get href () {
    return this.url
  }

  set href (value) {
    this.url = value
  }

  get method () {
    return this.#method
  }

  set method (value) {
    const old = this.#method

    value = coalesceb(value)

    if (this.#method !== value) {
      if (!value) {
        WARN('NGN.Request.method', 'No HTTP method specified.')
      }

      value = value.trim().toUpperCase()

      if (HTTP_METHODS.has(value)) {
        WARN('NGN.Request.method', `A non-standard HTTP method was recognized in a request: ${value}.`)
      }

      this.#method = value
    }

    if (old !== this.#method) {
      this.emit('update.method', { old, new: this.#method })
    }
  }

  get body () {
    return this.#body
  }

  set body (value) {
    if (this.#body !== value) {
      if (value && typeof value === 'string') {
        this.setHeader('content-type', 'text/plain')
      } else {
        this.removeHeader('content-type')
      }

      const old = this.#body
      this.#body = value
      this.prepareBody()
      this.emit('update.body', { old, new: this.body })
    }
  }

  /**
   * @property {boolean} crossOriginRequest
   * Indicates the request will be made to a domain outside of the
   * one hosting the request.
   */
  get crossOriginRequest () {
    return this.#uri.isSameOrigin('./')
  }

  get username () {
    return this.#auth.username
  }

  set username (user) {
    this.#auth.username = user
  }

  set password (secret) {
    this.#auth.password = secret
  }

  set accessToken (token) {
    this.#auth.accessToken = token
  }

  get accessTokenType () {
    return this.#auth.accessTokenType
  }

  set accessTokenType (value) {
    this.#auth.accessTokenType = value
  }

  get proxyUsername () {
    return this.#proxyAuth.username
  }

  set proxyUsername (user) {
    this.#proxyAuth.username = user
  }

  set proxyPassword (secret) {
    this.#proxyAuth.password = secret
  }

  set proxyAccessToken (token) {
    this.#proxyAuth.accessToken = token
  }

  get proxyAccessTokenType () {
    return this.#proxyAuth.accessTokenType
  }

  set proxyAccessTokenType (value) {
    this.#proxyAuth.accessTokenType = value
  }

  /**
   * @property {Headers} headers
   * Represents the request headers.
   */
  get headers () {
    return this.#headers
  }

  set headers (value) {
    this.#headers = typeof value === 'object' ? new Headers(value) : new Headers()
  }

  /**
   * @method getHeader
   * @param  {string} header
   * The name of the header to retrieve.
   * @return {string}
   * Returns the current value of the specified header.
   */
  getHeader (name) {
    return this.#headers.get(name)
  }

  /**
   * @method setHeader
   * Add a header to the request.
   * @param {string} header
   * The name of the header.
   * @param {string} value
   * Value of the header.
   * @param {Boolean} [overwriteExisting=true]
   * If the header already exists, setting this to `false` will prevent
   * the original header from being overwritten.
   */
  setHeader (name, value, overwriteExisting = true) {
    if (overwriteExisting || !this.headers.has(name)) {
      this.#headers.set(name, value)
    }
  }

  /**
   * Append a value to an existing header. If the header does
   * not already exist, it will be created.
   * @param {String} name
   * @param {String} value
   */
  appendHeader (name, value) {
    this.#headers.append(...arguments)
  }

  /**
   * Remove a header. This does nothing if the header doesn't exist.
   * @param {string} name
   */
  removeHeader (name) {
    this.#headers.delete(name)
  }

  /**
   * @method setQueryParameter
   * Set/add a query parameter to the request.
   * @param {string} parameter
   * The name of the parameter.
   * @param {string} value
   * Value of the parameter. The value is automatically URL encoded. If the
   * value is null, only the key will be added to the URL (ex: `http://domain.com/page.html?key`)
   * @param {Boolean} [overwriteExisting=true]
   * If the parameter already exists, setting this to `false` will prevent
   * the original parameter from being overwritten.
   */
  setQueryParameter (key, value, overwriteExisting = true) {
    if (overwriteExisting || this.#uri.query[key] === undefined) {
      this.#uri.query[key] = value
    }
  }

  /**
   * @method removeQueryParameter
   * Remove a query parameter from the request URI.
   * @param {string} key
   */
  removeQueryParameter (key) {
    delete this.#uri.query[key]
  }

  /**
   * Remove all query parameters
   */
  clearQueryParameters () {
    for (const key of Object.keys(this.#uri.query)) {
      delete this.#uri.query[key]
    }
  }

  get queryParameterCount () {
    return this.#uri.queryParameterCount
  }

  get hasQueryParameters () {
    return this.#uri.hasQueryParameters
  }

  /**
   * Abort a sent request before a response is returned.
   * @warning Not currently supported in Deno.
   */
  abort () {
    if (NGN.runtime === 'node') {
      if (typeof this.#controller === 'function') {
        this.#controller()
      }
    } else if (this.#controller !== null && !this.#controller.signal.aborted) {
      this.#controller.abort()
    }
  }

  /**
   * @method send
   * Send the request.
   * @param {Function} callback
   * The callback is executed when the request is complete.
   * @param {Error} callback.error
   * If an error occurs, it will be the first argument of
   * the callback. When no error occurs, this value will be
   * `null`.
   * @param {Object} callback.response
   * The response object returned by the server.
   * @return {Promise}
   * If no callback is specified, a promise is returned.
   */
  async send (callback) {
    let body = this.body

    // Disable body when safe methods (idempotent) are enforced.
    if (coalesce(body)) {
      if (this.enforceMethodSafety && IDEMPOTENT_METHODS.has(this.method)) {
        body = null
      }
    }

    // Create the request configuration
    const init = {
      method: this.method,
      cache: this.#cache,
      redirect: this.redirect,
      referrer: coalesceb(this.referrer),
      referrerPolicy: this.#referrerPolicy
    }

    if (this.#cache === 'only-if-cached' || this.#mode !== null) {
      // CORS mode must be same-origin if the cache mode is "only-if-cached": https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
      init.mode = this.#cache === 'only-if-cached' ? 'same-origin' : this.#mode
    }

    const crypto = (NGN.crypto || [null])[0]
    if ((this.#encryptKey || this.#decryptKey || this.#signKey || this.#verifyKey) && !crypto) {
      throw new Error('cryptography is unavailable (hint: is the crypto plugin loaded?)')
    }

    // Apply encryption (if applicable)
    if (body !== null && this.#encryptKey) {
      body = await crypto.encrypt(body, this.#encryptKey)
      this.setHeader('content-type', 'application/octet-stream; charset=UTF-8')
      this.setHeader('content-transfer-encoding', 'base64', false)
      this.appendHeader('content-encoding', crypto.encryptionAlgorithm(this.#encryptKey))
      this.setHeader('content-length', body.length)
    }

    // Apply signature (if applicable)
    if (body !== null && this.#signKey) {
      this.setHeader('signature', await crypto.sign(body, this.#signKey))
    }

    // Apply Request Headers
    if (this.#headers.size > 0) {
      init.headers = this.#headers.toObject()
    }

    // Apply timer
    if (this.timeout > 0) {
      init.timeout = this.timeout
    }

    // Add abort capability
    if (globalThis.AbortController) {
      this.#controller = new globalThis.AbortController()
      init.signal = this.#controller.signal
      init.signal.addEventListener('abort', e => {
        this.#controller = null
        this.emit('abort', e)
      })
    } else if (NGN.runtime === 'node') {
      init.signal = req => {
        this.#controller = () => {
          req.destroy()
          this.emit('abort', new Error('Aborted'))
        }
      }
    }

    // Apply credentials
    if (REQUEST_CREDENTIALS.has(this.#credentials)) {
      init.credentials = this.#credentials
    } else if (this.#auth.authType !== 'none') {
      WARN('Request', `"${this.#credentials}" is not a valid option. Must be one of the following: ${Array.from(REQUEST_CREDENTIALS).join(', ')}`)
    }

    // Apply subresource identity
    if (coalesceb(this.sri, this.integrity)) {
      init.integrity = coalesce(this.sri, this.integrity)
    }

    // Apply request body (if applicable)
    if (body !== null && !REQUEST_NOBODY_METHODS.has(init.method)) {
      init.body = body
    }

    // Send the request
    const res = await Fetch(this.#uri, init, this).catch(callback)

    // Post-process response body when applicable
    if (coalesceb(res.body) !== null) {
      // Verify response (if applicable)
      const signature = res.headers.get('signature')
      if (this.#verifyKey && signature) {
        if (!crypto.verify(res.body, signature, this.#verifyKey)) {
          throw new Error(`Could not validate response (signature: ${signature})`)
        }
      }

      // Decrypt response (if applicable)
      const decryptKey = coalesceb(this.#decryptKey, this.#encryptKey)
      if (decryptKey) {
        try {
          res.body = crypto.decrypt(decryptKey, res.body)

          // Replace original JSON getter with one that uses decrypted value
          delete res.JSON
          Object.defineProperty(res, 'JSON', {
            enumerable: true,
            get () { try { return typeof res.body === 'object' ? res.body : JSON.parse(res.body) } catch (e) { return null } }
          })
        } catch (e) {}
      }
    }

    if (callback) {
      callback(null, res)
    }

    return res
  }

  /**
   * Retrieve a cloned instance (copy) of the request
   */
  clone () {
    const req = new Request({
      url: this.url,
      method: this.#method,
      headers: Object.fromEntries(this.#headers.entries()),
      mode: this.#mode,
      credentials: this.#credentials,
      redirect: this.#redirect,
      cache: this.#cache,
      referrer: this.referrer,
      referrerPolicy: this.#referrerPolicy,
      query: this.query,
      body: this.#body,
      // username: this.#auth.username,
      // password: this.#auth[this.#auth.SECERT],
      // accessToken: this.#auth[this.#auth.SECERT_TOKEN],
      // accessTokenType: this.#auth.accessTokenType,
      // proxyUsername: this.#proxyAuth.username,
      // proxyPassword: this.#proxyAuth[this.#proxyAuth.SECERT],
      // proxyAccessToken: this.#proxyAuth[this.#proxyAuth.SECERT_TOKEN],
      // proxyAccessTokenType: this.#proxyAuth.accessTokenType,
      signingKey: this.signingKey,
      verificationKey: this.verificationKey,
      encryptionKey: this.encryptionKey,
      decryptionKey: this.decryptionKey,
      sri: this.sri,
      enforceMethodSafety: this.enforceMethodSafety,
      timeout: this.timeout
    })

    req.AUTH_CREDENTIAL = this.#auth
    req.PROXY_CREDENTIAL = this.#proxyAuth
  }

  /**
   * Assign the properties of another request to this one.
   * This does **not** assign the hostname, port, or path. It
   * _does_ apply request _properties_ such as headers,
   * query parameters, credentials, the HTTP method, body,
   * caching/CORS modes, referral policy, timeouts, etc.
   *
   * This method works similarly to [Object.assign](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign),
   * where new attributes are assigned to the request. Conflicting
   * attributes are overwritten, while everything else remains untouched.
   * @param {Request} req
   * Any number of requests can be assigned, i.e. `assign(reqA, reqB, ...)`.
   * @param {boolean} [override=true]
   * Set this to false to prevent overriding conflicting attributes.
   * For example: `assign(reqA, reqB, ..., false)`
   */
  assign () {
    let override = true
    const args = Array.from(arguments)
    if (typeof args[args.length - 1] === 'boolean') {
      override = args.pop()
    }

    for (const req of args) {
      if (!(req instanceof Request)) {
        throw new Error('Cannot assign a non-Request value to a request.')
      }

      merge(this, req, override)
    }
  }
}

// Merges one request into another
// Item b is merged into item a. Any conflicting attributes
// will be overwritten using the value of b (default). If
// override is set to `false`, existing values will not be
// overwritten
function merge (a, b, override = true) {
  let aa = a
  let bb = b

  // When overriding is disabled, switch the coalescing order
  if (!override) {
    aa = b
    bb = a
  }

  a.method = coalesceb(bb.method, aa.method)
  a.body = coalesceb(bb.body, aa.body)
  a.username = coalesceb(bb.username, aa.username)
  a.password = coalesceb(bb.password, aa.SECERT)
  a.accessToken = coalesceb(bb.accessToken, aa.accessToken)
  a.accessTokenType = coalesceb(bb.accessTokenType, aa.accessTokenType)
  a.cache = coalesceb(bb.cache, aa.cache)
  a.mode = coalesceb(bb.mode, aa.mode)
  a.referrer = coalesceb(bb.referrer, aa.referrer)
  a.referrerPolicy = coalesceb(bb.referrerPolicy, aa.referrerPolicy)
  a.sri = coalesceb(bb.sri, aa.sri)
  a.enforceMethodSafety = coalesceb(bb.enforceMethodSafety, aa.enforceMethodSafety)
  a.timeout = coalesceb(bb.timeout, aa.timeout)
  a.signingKey = coalesceb(bb.signingKey, aa.signingKey)
  a.verificationKey = coalesceb(bb.verificationKey, aa.verificationKey)
  a.encryptionKey = coalesceb(bb.encryptionKey, aa.encryptionKey)
  a.decryptionKey = coalesceb(bb.decryptionKey, aa.decryptionKey)

  for (const [name, value] of b.headers.entries()) {
    a.setHeader(name, value, override)
  }

  for (const [key, value] of Object.entries(b.query)) {
    a.setQueryParameter(key, value, override)
  }
}
