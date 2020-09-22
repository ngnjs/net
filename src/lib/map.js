import Reference from '@ngnjs/plugin'
import { forceString } from '@ngnjs/libdata'

const NGN = new Reference().requires('EventEmitter')

/**
 * This class provides an Map object with additional
 * methods, such as `append` & `toObject`. It extends `NGN.EventEmitter`,
 * making it possible to observe events. It also provides optional
 * key normalization (case insensitivity).
 */
export default class EnhancedMap extends NGN.EventEmitter {
  #values
  #prefix
  #keyCase = null
  #key = key => {
    key = forceString(key)
    return this.#keyCase === 'lower' ? key.toLowerCase() : (this.#keyCase === 'upper' ? key.toUpperCase() : key)
  }

  constructor (init = {}, keyCase = null, prefix = '') {
    super()
    this.#keyCase = keyCase
    if (keyCase === null) {
      this.#values = new Map(Object.entries(init))
    } else {
      this.#values = new Map()
      for (const [name, value] of Object.entries(init)) {
        this.#values.set(this.#key(name), value)
      }
    }
    this.#prefix = prefix.trim().length === 0 ? '' : (prefix.trim() + '.').replace(/\.{2,}/gi, '.')
  }

  get size () {
    return this.#values.size
  }

  /**
   * Appends a new value onto an existing value, or adds the value if it does not already exist.
   * @param {string} name
   * @param {string} value
   */
  append (name, value) {
    const key = this.#key(name)
    const old = this.#values.get(key)

    // Do not shorten this to if (old), because the retrieved value could be null/undefined.
    if (this.#values.has(key)) {
      value = old.split(', ').concat([value]).join(', ')
    }

    this.#values.set(key, value)
    if (old) {
      this.emit(`${this.#prefix}update`, { name, old, new: value })
    } else {
      this.emit(`${this.#prefix}create`, { name, value })
    }
  }

  /**
   * Deletes a value.
   * @param {string} name
   */
  delete (name) {
    const key = this.#key(name)
    if (this.#values.has(key)) {
      const old = this.#values.get(key)
      this.#values.delete(key)
      this.emit(`${this.#prefix}delete`, { name, value: old })
    }
  }

  /**
   * Returns an iterator to loop through all key/value pairs contained in the object.
   * @return {Iterable}
   */
  entries () {
    return this.#values.entries()
  }

  /**
   * Executes a function once for each element.
   * @param {function} handler
   * Run the handler on each header entry.
   * @return { Iterable }
   */
  forEach (fn) {
    return this.#values.entries.forEach(fn)
  }

  /**
   * Returns the value fort the specified name.
   * @param {string} name
   * @return {any}
   */
  get (name) {
    return this.#values.get(this.#key(name))
  }

  /**
   * Returns a boolean stating whether the specified key name exists.
   * @param {string} name
   * @return {boolean}
   */
  has (name) {
    return this.#values.has(this.#key(name))
  }

  /**
   * Returns an iterator to loop through all keys of the available key/value pairs.
   * @return { Iterable }
   */
  keys () {
    return this.#values.keys()
  }

  /**
   * Sets a new value for an existing name, or creates a new entry if the name doesn't aleady exist.
   * @param {string} name
   * @param {string} value
   */
  set (name, value) {
    const key = this.#key(name)
    const exists = this.#values.has(key)
    const old = this.#values.get(key)

    this.#values.set(key, value)

    if (!exists) {
      this.emit(`${this.#prefix}create`, { name, value })
    } else if (old !== value) {
      this.emit(`${this.#prefix}update`, { name, old, new: value })
    }

    return this.#values
  }

  /**
   * Returns an iterator to loop through all values of the key/value pairs.
   * @return { Iterable }
   */
  values () {
    return this.#values.values()
  }

  /**
   * Remove all entries
   */
  clear () {
    const entries = this.#values.entries()
    this.#values.clear()

    for (const [name, value] of entries) {
      this.emit(`${this.#prefix}delete`, { name, value })
    }
  }

  toString () {
    return this.#values.toString()
  }

  toObject () {
    return Object.fromEntries(this.#values)
  }

  get Map () {
    return this.#values.Map
  }
}
