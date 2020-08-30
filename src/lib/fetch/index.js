/**
 * This is an internal module, used for making network
 * requests. NGN is cross-runtime, but Node.js does not
 * support the fetch API. This method is polyfilled,
 * matching the fetch API and supplying a consistent
 * interface across runtimes.
 *
 * Node lacks caching, subresource identification, and
 * referral policies. These features are stubbed and
 * will not work on on their own. However; these
 * features are available in the libnet-node plugin for
 * NGN. This module attempts to auto-load the
 * libnet-node plugin in Node.js environments. If the
 * module is found, the additional capabilities are
 * automatically enabled.
 */
import Reference from '@ngnjs/plugin'
import { coalesceb } from '@ngnjs/libdata'
import { REDIRECTS } from './constants.js'

const NGN = new Reference('>=2.0.0').requires('runtime', 'INFO')

// Load the runtime-specific fetch method.
// Both runtime fetch methods are abstracted from this
// file in an effort to reduce code size. In many cases,
// the additional code from the unnecessary runtime does
// not add much additional overhead, but this strategy
// will eliminate unnecessary code in the tree-shaking
// phase of any build process.
let request
let POLYFILLED = false
; (async () => {
  if (!request) {
    if (NGN.runtime === 'node') {
      request = await import('./node.js').catch(console.error)
      POLYFILLED = request.POLYFILLED !== undefined ? request.POLYFILLED : POLYFILLED
    } else {
      request = await import('./fetch.js').catch(console.error)
    }

    request = request.default
  }
})()

export { POLYFILLED }

export default async function Fetch (resource, init, caller = null) {
  init = init || {}
  init.method = typeof init.method === 'string' ? init.method.toUpperCase() : 'GET'
  init.cache = coalesceb(init.cache, 'default')
  init.redirect = coalesceb(init.redirect, 'follow')
  init.responseType = coalesceb(init.responseType, 'text')
  init.referrerPolicy = coalesceb(init.referrerPolicy, 'unsafe-url')
  init[REDIRECTS] = coalesceb(init[REDIRECTS], 0)
  resource = typeof resource === 'string' ? new URL(resource) : resource

  return new Promise((resolve, reject) => {
    if (!init.method) {
      return reject(new Error('An HTTP method is required.'))
    }

    if (init.method === 'CONNECT') {
      return reject(new Error('CONNECT is not a valid fetch method. It is only used for opening network tunnels, not complete HTTP requests.'))
    }

    request(resource, init).then(r => {
      resolve(r)

      const redirects = init[REDIRECTS]
      delete init[REDIRECTS]

      NGN.INFO('HTTP Request', {
        request: Object.assign({}, {
          url: resource.href,
          redirects
        }, init),
        response: r,
        caller,
        runtime: NGN.runtime
      })
    }).catch(reject)
  })
}
