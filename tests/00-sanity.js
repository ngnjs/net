import test from 'tappedout'
import NGN from 'ngn'
// import * as NET from '@ngnjs/net'

test('Sanity', t => {
  console.log(NGN, JSON.stringify(globalThis[Symbol.for('NGN')]))
  // t.expect('function', typeof NET.Client, 'NET.Client class available.')
  // t.expect('function', typeof NET.Resource, 'NET.Resource class available.')
  // t.expect('function', typeof NET.Request, 'NET.Request class available.')
  // t.expect('function', typeof NET.URL, 'NET.URL class available.')
  // t.expect('function', typeof NET.Fetch, 'NET.Fetch method available.')
  // t.expect('string', typeof NET.HOSTNAME, 'NET.HOSTNAME available.')
  // t.expect('boolean', typeof NET.POLYFILLED, 'Indicate the Node polyfill is active.')
  // t.expect(true, Array.isArray(NET.INTERFACES), 'Interfaces are available.')

  setTimeout(() => { console.log('waited'); t.end()}, 5000)
})
