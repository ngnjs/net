import { BLOBS } from './constants.js'
import { coalesce } from '@ngnjs/libdata'

export default function Fetch (resource, init = {}) {
  return new Promise((resolve, reject) => {
    return globalThis.fetch(resource.href, init).then(async r => {
      try {
        const rt = init.responseType
        // The result object is explicitly defined because
        // some headless browsers were not recognizing the attributes
        // (non-enumerable). This tactic changes the property definition,
        // making them accessible to all runtimes.
        const result = Object.assign({
          status: r.status,
          statusText: r.statusText,
          headers: r.headers,
          ok: r.ok,
          redirected: r.redirected,
          trailers: r.trailers,
          type: r.type,
          url: r.url
        }, {
          body: init.body,
          responseText: ''
        })

        Object.defineProperty(result, 'request', {
          enumerable: false,
          configurable: false,
          writable: false,
          value: Object.assign({}, init, {
            url: resource.href
          })
        })

        let body = ''
        if (rt === 'arraybuffer') {
          body = await r.arrayBuffer().catch(reject)
        } else if (BLOBS.has(rt)) {
          body = await r.blob().catch(reject)
        } else {
          body = await r.text().catch(reject)
        }

        switch (rt) {
          case 'document':
            if (/^text\/.*/.test(body.type)) {
              result.responseText = await body.text().catch(reject)
              break
            }
          case 'arraybuffer': // eslint-disable-line no-fallthrough
          case 'blob':
            result.body = new globalThis.Blob(body.slice(), { type: coalesce(result.headers['content-type']) })
            break
          default:
            result.responseText = body || result.statusText
        }

        Object.defineProperty(result, 'JSON', {
          enumerable: true,
          get () { try { return JSON.parse(result.responseText) } catch (e) { return null } }
        })

        const hiddenBody = result.body
        const hiddenSource = result._bodySource
        const hiddenStream = result._stream

        delete result.body
        delete result._bodySource
        delete result._stream

        Object.defineProperties(result, {
          body: { get: () => hiddenBody || result.responseText },
          _bodySource: { get: () => hiddenSource },
          _stream: { get: () => hiddenStream }
        })

        if (init.method === 'HEAD') {
          result.responseText = ''
        }

        return resolve(result)
      } catch (e) {
        console.log(e)
        reject(e)
      }
    }).catch(reject)
  })
}
