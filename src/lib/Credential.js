import { coalesceb } from '@ngnjs/libdata'
import Reference from '@ngnjs/plugin'
import { BTOA } from './constants.js'

const NGN = new Reference()

export default class Credential extends NGN.EventEmitter {
  #user = null
  #secret = null
  #accessToken = null
  #accessTokenType = 'Bearer'
  #applyAuthHeader = null

  constructor (cfg = {}) {
    super(...arguments)
    this.name = coalesceb(cfg.name, 'HTTP Credential')

    /**
     * @cfgproperty {string} username
     * A username to authenticate the request with (basic auth).
     */
    this.#user = coalesceb(cfg.username)

    /**
     * @cfgproperty {string} password
     * A password to authenticate the request with (basic auth).
     * @readonly
     */
    this.#secret = coalesceb(cfg.password)

    /**
     * @cfgproperty {string} accessToken
     * An access token to authenticate the request with (Bearer auth).
     * If this is configured, it will override any basic auth settings.
     */
    this.#accessToken = coalesceb(cfg.accessToken)

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
    this.#accessTokenType = coalesceb(cfg.accessTokenType, 'Bearer')

    Object.defineProperties(this, {
      /**
       * @method basicAuthToken
       * Generates a basic authentication token from a username and password.
       * @return {string} [description]
       * @private
       */
      basicAuthToken: NGN.hiddenconstant((user, secret) => {
        // Binary to base64-ascii conversions
        if (NGN.runtime === 'node') {
          return `Basic ${Buffer.from(`${user}:${secret}`, 'binary').toString('base64')}`
        }

        return 'Basic ' + BTOA(`${user}:${secret}`)
      })
    })

    /**
     * @fires {header:string} update.header
     * Triggered whenever the username, password, access token,
     * or access token type change.
     */
    this.on(['update.access*', 'update.username', 'update.password'], () => this.emit('update.header', this.header))
  }

  set reference (value) {
    if (value && typeof value.applyAuthorizationHeader === 'function') {
      this.#applyAuthHeader = value.applyAuthorizationHeader
      this.#applyAuthHeader()
    }
  }

  /**
   * Represents the value of an `Authorization` or `Proxy-Authorization`
   * HTTP header.
   *
   * Authorization: **header value**
   * _or_
   * Proxy-Authorization: **header value**
   */
  get header () {
    if (coalesceb(this.#accessToken) !== null) {
      return `${this.#accessTokenType} ${this.#accessToken}`
    } else if (coalesceb(this.#user) && coalesceb(this.#secret)) {
      return this.basicAuthToken(this.#user, this.#secret)
    }

    return null
  }

  /**
   * The type of authorization. This will usually be
   * `basic` for username/password credentials and
   * `token` for token credentials. It can also be `none`
   * if no valid credentials are available.
   */
  get authType () {
    if (this.#accessToken) {
      return 'token'
    } else if (coalesceb(this.#user) && coalesceb(this.#secret)) {
      return 'basic'
    }

    return 'none'
  }

  /**
   * @property {string} username
   * The username that will be used in any basic authentication operations.
   */
  get username () {
    return coalesceb(this.#user)
  }

  set username (user) {
    const old = this.#user
    user = coalesceb(user)

    if (this.#user !== user) {
      this.#user = user
    }

    if (old !== this.#user) {
      this.emit('update.username', { old, new: this.#user })
      this.#applyAuthHeader && this.#applyAuthHeader()
    }
  }

  /**
   * @property {string} password
   * It is possible to set a password for any basic authentication operations,
   * but it is not possible to read a password.
   * @writeonly
   */
  set password (secret) {
    const old = this.#secret
    secret = coalesceb(secret)

    if (this.#secret !== secret) {
      this.#secret = secret
    }

    if (old !== this.#secret) {
      this.emit('update.password')
      this.#applyAuthHeader && this.#applyAuthHeader()
    }
  }

  /**
   * @property {string} accessToken
   * Supply a bearer access token for basic authenticaiton operations.
   * @writeonly
   */
  set accessToken (token) {
    const old = this.#accessToken

    token = coalesceb(token)

    if (this.#accessToken !== token) {
      this.#accessToken = token
    }

    if (token) {
      this.username = null
      this.password = null
    }

    if (old !== token) {
      this.emit('update.accessToken')
      this.#applyAuthHeader && this.#applyAuthHeader()
    }
  }

  set accessTokenType (value) {
    value = coalesceb(value, 'bearer')

    if (value !== this.#accessTokenType) {
      const old = this.#accessTokenType
      this.#accessTokenType = value
      this.emit('update.accessTokenType', { old, new: value })
      this.#applyAuthHeader && this.#applyAuthHeader()
    }
  }

  get accessTokenType () {
    return this.#accessTokenType
  }

  clone () {
    return new Credential({
      username: this.#user,
      password: this.#secret,
      accessToken: this.#accessToken,
      accessTokenType: this.#accessTokenType
    })
  }
}
