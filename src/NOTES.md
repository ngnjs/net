TODO: Convert the normalizer to use the standard URL API (browser and Node will be a little different)
https://developer.mozilla.org/en-US/docs/Web/API/URL

========================

# Request.js send method (Old Node)

```javascript
/* node-only */
import libhttp from 'http'
import libhttps from 'https'
import fs from 'fs'
import SRI from './polyfills/SRI.js'
import NodeReferralPolicy from './polyfills/ReferrerPolicy.js'
import NodeHttpCache from './polyfills/Cache.js'
import { Transport } from 'stream'
/* end-node-only */
/* node-only */ 
// Run request in Node-like environments
// Support local file system retrieval in node-like environments.
// This short-circuits the request and reads the file system instead.
if (this.protocol === 'file') {
  if (!NGN.isFn(callback)) {
    throw new Error('A callback is required when retrieving system files in a node-like environment.')
  }

  const filepath = this.#uri.toString().replace('file://', '')
  const response = {
    status: fs.existsSync(filepath) ? 200 : 400
  }

  response.responseText = response.status === 200 ? fs.readFileSync(filepath).toString() : 'File does not exist or could not be found.'

  if (this.sri) {
    const integrity = SRI.verify(this.sri, response.responseText)
    if (!integrity.valid) {
      return callback(new Error(integrity.reason))
    }
  }

  return callback(response)
}

const http = this.protocol === 'https' ? libhttps : libhttp

// const agent = new http.Agent()
const reqOptions = {
  hostname: this.hostname,
  port: this.port,
  method: this.method,
  headers: this.#headers,
  path: this.#uri.formatString('{{path}}{{querystring}}{{hash}}')
}

const req = http.request(reqOptions, response => {
  response.setEncoding('utf8')

  let resbody = ''
  response.on('data', chunk => { resbody = resbody + chunk })

  response.on('end', () => {
    switch (response.statusCode) {
      case 412:
      case 304:
        // Respond from cache (no modifications)
        const res = this.#cache.get(request)
        if (res) {
          return callback(res)
        } else {
          return callback({
            headers: response.headers,
            status: 500,
            statusText: 'Internal Server Error',
            responseText: 'Failed to retrieve cached response.'
          })
        }
      case 301:
      case 302:
      case 307:
      case 308:
        if (this.redirectAttempts > this.maxRedirects) {
          this.redirectAttempts = 0

          this.stopMonitor()

          return callback(this.#cache.put(req, { // eslint-disable-line standard/no-callback-literal
            headers: response.headers,
            status: 500,
            statusText: 'Too many redirects',
            responseText: 'Too many redirects'
          }, this.#cacheMode))
        }

        if (response.headers.location === undefined) {
          this.stopMonitor()

          return callback(this.#cache.put(req, { // eslint-disable-line standard/no-callback-literal
            headers: response.headers,
            status: 502,
            statusText: 'Bad Gateway',
            responseText: 'Bad Gateway'
          }, this.#cacheMode, response))
        }

        this.redirectAttempts++
        this.url = response.headers.location

        return this.send(res => callback(this.#cache.put(req, res, this.#cacheMode, response)))

      default:
        this.stopMonitor()

        if (this.sri) {
          const integrity = SRI.verify(this.sri, resbody)
          if (!integrity.valid) {
            throw new Error(integrity.reason)
          }
        }

        return callback(this.#cache.put(req, { // eslint-disable-line standard/no-callback-literal
          headers: response.headers,
          status: response.statusCode,
          statusText: coalesce(response.statusMessage, response.statusText),
          responseText: resbody,
        }, this.#cacheMode, response))
    }
  })
})

// Check the cache
let cached = this.#cache.get(req, this.#cacheMode)
if (cached) {
  req.abort() // This prevents creating an orphan request object.
  return callback(cached.response)
}

req.on('error', (err) => {
  this.stopMonitor()

  if (NGN.isFn(callback)) {
    callback({ // eslint-disable-line standard/no-callback-literal
      status: 400,
      statusText: err.message,
      responseText: err.message,
      // responseXML: err.message,
      // readyState: 0
    })
  } else {
    throw err
  }
})

this.startMonitor()

if (body) {
  req.write(body)
}

this.#cache.capture(req, this.#cacheMode)

req.setNoDelay(true)
req.end()
/* end-node-only */
```

### Old Browser Code

```javascript
// Execute the request
    let result
    fetch(this.#uri.toString(), init)
      .then(response => {
        result = {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          redirected: response.redirected,
          type: response.type,
          url: response.url,
          body,
          responseText: ''
        }

        switch (this.responseType) {
          case 'arraybuffer':
            return response.arrayBuffer()
          case 'document':
          case 'blob':
            return response.blob()
          // case 'json':
          //   return response.json()
        }

        return response.text()
      })
      .then(responseBody => {
        switch (this.responseType) {
          case 'document':
            if (/^text\/.*/.test(responseBody.type)) {
              responseBody.text()
                .then(data => {
                  request.responseText = data
                  callback(request)
                })
                .catch(callback)
              return
            }
          case 'arraybuffer':
          case 'blob':
            request.body = new Blob(responseBody.slice(), { type: coalesce(result.headers['content-type']) })
            break

          default:
            result.responseText = responseBody
        }
        
        callback(result)
      })
      .catch(e => {
        if (e.name === 'AbortError') {
          callback(new Error(`Timed out after ${this.timeout}ms.`))
        } else {
          callback(e)
        }
      })
    /* end-browser-only */
```