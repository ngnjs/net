import Address from './lib/URL.js'
import Fetch, { POLYFILLED } from './lib/fetch/index.js'
import { INTERFACES, HOSTNAME } from './lib/constants.js'
import Request from './lib/Request.js'
import Client from './Client.js'
import Resource from './Resource.js'

/**
 * @typedef {object} request
 * Represents the parameters of an HTTP request
 * @param {string} method
 * The HTTP method (`GET`, `POST`, `PUT`, etc) of the request.
 * @param {string} cache
 * Cache mode of the request (e.g., `default`, `reload`, `no-cache`).
 * @param {string} redirect
 * How redirects are handled. It may be one of `follow`, `error`, or `manual`.
 * @param {string} referrer
 * Referrer of the request (e.g., `client`).
 * @param {string} referrerPolicy
 * Referrer policy of the request (e.g., `no-referrer`).
 * @param {numeric} timeout
 * The number of milliseconds the request waits for a response before aborting.
 * @param {object} signal
 * Contains an `AbortController` (if available).
 * @param {string} responseType
 * Represents the type of response (ex: `text`)
 * @param {string} url
 * The original URL where the request was sent. This
 * may differ from the response URL in the case of redirects.
 */

/**
 * @typedef {object} response
 * Represents the response of an HTTP request.
 * @param status {numeric}
 * HTTP [response status](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) (i.e. `200`, `404`, etc).
 * @param statusText {string}
 * The status message describing the response.
 * @param headers {object}
 * The [HTTP header fields](https://en.wikipedia.org/wiki/List_of_HTTP_header_fields)
 * which define the paratmers of the response.
 * @param ok {boolean}
 * Indicates whether the response was successful or not (i.e. status between `200`-`299`).
 * This conforms to the [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) properties
 * found in the fetch API.
 * @param redirected {string}
 * Indicates whether or not the response is the result of a redirect (that is, its URL list has more than one entry).
 * @param trailers {Promise}
 * Resolves to a `Headers` object, containing the response [trailers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Trailer).
 * @param type {string}
 * The type of the response (e.g., `basic`, `cors`).
 * @param url {string}
 * The URL of the response.
 * @param responseText {string}
 * The response body (text) contained in the response.
 * @param JSON {object}
 * When the response contains a JSON body, it is accessible
 * as an object through this attribute.
 * @param request {request}
 * This attribute may be hidden (non-enumerable), but it
 * contains the original request parameters.
 */

export {
  INTERFACES,
  HOSTNAME,
  POLYFILLED, // This is exported so plugins can determine if polyfilled features are available.
  Address as URL,
  Fetch,
  Request,
  Client,
  Resource
}

export const moduleVersion = '<#REPLACE_VERSION#>'
