import MapStore from './map.js'

/**
 * This class polyfills the Headers object, primarily
 * for Node.js runtimes. This class is currently just
 * a polyfill, but it may become an event emitter if
 * demand warrants it.
 * @fires {name:string, value:any} header.create
 * Triggered when a new header is created.
 * @fires {name:string, old:any, new:any} header.update
 * Triggered when a header value is updated.
 * @fires {name:string, value: any} header.delete
 * Triggered when a header value is deleted.
 */
export default class Headers extends MapStore {
  constructor (init = {}) {
    super(init, 'lower', 'header')
  }
}
