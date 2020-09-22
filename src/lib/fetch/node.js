import Reference from '@ngnjs/plugin'
import { coalesce, coalesceb } from '@ngnjs/libdata'
import { cacheStatusCodes, HTTP_REDIRECT, REDIRECTS } from './constants.js'
import { HOSTNAME, URL_PATTERN } from '../constants.js'

const NGN = new Reference().requires('runtime', 'WARN', 'hidden')

// Stubs for Node
let POLYFILLED = false
let hostname = HOSTNAME
let http
let https
let cache = { get: () => undefined, put: (req, res) => res, capture () { } }
let SRI = { verify: () => false } // subresource identity support
function ReferrerPolicy (policy) { this.policy = policy }
ReferrerPolicy.prototype.referrerURL = uri => uri

// Apply libnet-node plugin, if available, to override stubs
if (NGN.runtime === 'node') {
  ; (async () => {
    http = await import('http').catch(console.error)
    https = await import('https').catch(console.error)

    // Do not abort if the Node library is inaccessible.
    try {
      const polyfills = await import('@ngnjs/libnet-node')

      SRI = polyfills.SRI
      ReferrerPolicy = polyfills.ReferrerPolicy // eslint-disable-line no-func-assign
      cache = new polyfills.Cache(coalesce(process.env.HTTP_CACHE_DIR, 'memory'))
      hostname = polyfills.HOSTNAME
      POLYFILLED = true
    } catch (e) {
      NGN.WARN('fetch', e)
    }
  })()
}

// export default function Fetch (resource, init) {
//   return new Promise(resolve => resolve())
// }

function result (result) {
  Object.defineProperties(result, {
    JSON: {
      enumerable: true,
      get () { try { return JSON.parse(result.responseText) } catch (e) { return null } }
    },
    body: { get: () => result.responseText }
  })

  return result
}

function cleanResponse (res, status, responseText = '', statusText = '') {
  status = coalesce(status, res.statusCode, res.status, 500)

  const r = {
    status,
    statusText: coalesceb(res.statusMessage, res.statusText, http.STATUS_CODES[status]),
    responseText: coalesceb(res.responseText, (status >= 300 ? http.STATUS_CODES[status] : res.responseText)) || '',
    headers: res.headers,
    trailers: res.trailers,
    url: res.url
  }

  if (res.redirected) {
    r.redirected = res.redirected
  }

  return r
}

export default function Fetch (resource, init = {}) {
  if (!(resource instanceof URL)) {
    if (!URL_PATTERN.test(resource)) {
      resource = new URL(`http://${hostname}/${resource}`)
    } else {
      resource = new URL(resource)
    }
  }

  return new Promise((resolve, reject) => {
    // Mimic browser referrer policy action
    let referrer = coalesceb(init.referrer, 'http://' + hostname)
    if (!URL_PATTERN.test(referrer)) {
      referrer = new URL(`http://${hostname}/${referrer}`)
    } else {
      referrer = new URL(referrer)
    }

    init.referrer = new ReferrerPolicy(init.referrerPolicy).referrerURL(referrer.href, resource.href) || ''

    if (init.referrer.trim().length > 0) {
      init.headers = init.headers || {}
      init.headers.Referer = init.referrer
    }

    const signal = init.signal
    delete init.signal

    const net = (resource.protocol === 'https:' ? https : http)
    const req = net.request(resource.href, init, res => {
      let body = ''

      res.setEncoding('utf8')
      res.on('data', c => { body += c })
      res.on('end', () => {
        if (cacheStatusCodes.has(res.statusCode)) {
          // Respond from cache (no modifications)
          const response = cache.get(resource.toString())
          return response
            ? resolve(result(response))
            : resolve(cache.put(req, cleanResponse(res, 500, 'Failed to retrieve cached response.'), init.cache))
        } else if (HTTP_REDIRECT.has(res.statusCode)) {
          // Redirect as necessary
          switch (init.redirect) {
            case 'manual':
              return resolve(result(cleanResponse(res)))
            case 'follow':
              if (!res.headers.location) {
                return resolve(result(cache.put(req, cleanResponse(res, 502), init.cache)))
              } else {
                if (init[REDIRECTS] >= 10) {
                  return resolve(result(cache.put(req, cleanResponse(res, 500, 'Too many redirects'), init.cache)))
                }

                init[REDIRECTS]++

                return Fetch(res.headers.location, init).then(r => {
                  r.redirected = true
                  r.url = res.headers.location
                  resolve(result(cache.put(req, cleanResponse(r), init.cache)))
                }).catch(reject)
              }
          }

          return reject(new Error(`Refused to redirect ${resource.toString()} -> ${res.headers.location || 'Unknown/Missing Location'}`))
        }

        if (init.integrity) {
          const integrity = SRI.verify(init.integrity, body)
          if (!integrity.valid) {
            return reject(new Error(integrity.reason))
          }
        }

        res.responseText = body

        if (init.method === 'HEAD') {
          res.responseText = ''
        }

        const r = cache.put(req, cleanResponse(res))

        resolve(result(r))
      })
    })

    // Apply the abort manager to the request
    if (signal) {
      signal(req)
    }

    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timed out.'))
    })
    req.setNoDelay(true)

    if (init.body) {
      req.write(init.body)
    }

    if (init.cache !== 'reload' && init.cache !== 'no-cache') {
      // Check the cache first in Node environments
      const cached = cache.get(req, init.cache)
      if (cached) {
        req.abort() // Prevents orphan request from existing (orphans cause the process to hang)
        return resolve(cached.response)
      }

      cache.capture(req, init.cache)
    }

    req.end()
  })
}

export { POLYFILLED }
