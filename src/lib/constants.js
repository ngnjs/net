import Reference from '@ngnjs/plugin'
const NGN = new Reference()

export const DEFAULT_PORT = {
  http: 80,
  https: 443,
  ssh: 22,
  ldap: 389,
  sldap: 689,
  ftp: 20,
  ftps: 989,
  sftp: 21
}

export const HTTP_METHODS = new Set([
  'OPTIONS',
  'HEAD',
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'TRACE',
  'CONNECT'
])

export const CACHE_MODES = new Set([
  'default',
  'no-store',
  'reload',
  'no-cache',
  'force-cache',
  'only-if-cached'
])

export const CORS_MODES = new Set([
  'cors',
  'no-cors',
  'same-origin'
])

export const REFERRER_MODES = new Set([
  '',
  'no-referrer',
  'no-referrer-when-downgrade',
  'same-origin',
  'origin',
  'strict-origin',
  'origin-when-cross-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url'
])

export const REQUEST_CREDENTIALS = new Set(['omit', 'same-origin', 'include'])
export const REDIRECT_MODES = new Set(['follow', 'error', 'manual'])

export const IDEMPOTENT_METHODS = new Set(['OPTIONS', 'HEAD', 'GET'])
export const REQUEST_NOBODY_METHODS = new Set(['HEAD', 'GET'])

export const URI_PATTERN = /^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/
export const URL_PATTERN = /^(([^:/?#]+):)(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/
export const URL_RELATIVE_PATTERN = /^\.{1,2}\//gi

// Polyfill btoa when it does not exist (Node)
// Binary to base64-ascii conversions
export const BTOA = globalThis.btoa || function (v) { return Buffer.from(v, 'binary').toString('base64') }

let HOSTNAME = globalThis.location ? globalThis.location.host : 'localhost'
const interfaces = new Set([
  '127.0.0.1',
  'localhost',
  HOSTNAME
])

// Attempt to retrieve local hostnames in Node.js runtime (using libnet-node when available)
if (NGN.runtime === 'node') {
  (async () => {
    try {
      const polyfills = await import('@ngnjs/libnet-node')
      polyfills.INTERFACES.forEach(i => interfaces.add(i))
      HOSTNAME = polyfills.HOSTNAME
    } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') {
        throw e
      }
    }
  })()
}

export { HOSTNAME }
export const INTERFACES = Array.from(interfaces)
