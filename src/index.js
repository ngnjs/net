import Address from './lib/URL.js'
import Fetch, { POLYFILLED } from './lib/fetch/index.js'
import { INTERFACES, HOSTNAME } from './lib/constants.js'
import Request from './lib/Request.js'
import Client from './Client.js'
import Resource from './Resource.js'

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
