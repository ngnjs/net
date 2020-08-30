import test from 'tappedout'
import ngn from 'ngn'
import { Fetch, URL as Address, HOSTNAME, POLYFILLED } from '@ngnjs/net'

const root = new Address('http://localhost')
function route (route) {
  root.path = route;
  return root
}

test('Sanity Check', t => {
  t.expect('function', typeof Fetch, 'Fetch is recognized.')
  t.end()
})

test('Basic Requests', async t => {
  let res
  res = await Fetch(route('/basic'), { method: 'OPTIONS' }).catch(console.error)
  t.expect(200, res.status, 'OPTIONS request returns a success status code.')

  res = await Fetch(route('/basic'), { method: 'HEAD' }).catch(t.fail)
  t.expect(200, res.status, 'HEAD request returns a success status code.')

  res = await Fetch(route('/basic'), { method: 'GET' }).catch(console.error)
  t.expect(200, res.status, 'GET request returns a success status code.')

  res = await Fetch(route('/basic'), { method: 'POST' }).catch(t.fail)
  t.expect(200, res.status, 'POST request returns a success status code.')

  res = await Fetch(route('/basic'), { method: 'PUT' }).catch(t.fail)
  t.expect(200, res.status, 'PUT request returns a success status code.')

  res = await Fetch(route('/basic'), { method: 'DELETE' }).catch(t.fail)
  t.expect(200, res.status, 'DELETE request returns a success status code.')

  if (ngn.runtime !== 'browser') {
    res = await Fetch(route('/basic'), { method: 'TRACE' }).catch(t.fail)
    t.expect(200, res.status, 'TRACE request returns a success status code.')
  } else {
    t.pass('Skip TRACE method (not used in browsers).')
  }

  // CONNECT should not be used. It is used to open a tunnel, not make a complete request.
  // await Fetch(route('/basic'), { method: 'CONNECT' })
  //   .then(() => t.fail('CONNECT method is not allowed.'))
  //   .catch(() => t.pass('CONNECT method is not allowed.'))

  t.end()
})

test('Redirect Support', async t => {
  let res
  const redirect = route('/redirect').href
  const endpoint = route('/endpoint').href

  res = await Fetch(redirect, { method: 'HEAD' }).catch(t.fail)
  t.expect(200, res.status, 'HEAD request returns a success status code.')
  t.expect(true, res.redirected, 'HEAD response recognizes it was redirected.')
  t.expect(endpoint, res.url, 'HEAD request recognized the redirect URL.')

  res = await Fetch(redirect, { method: 'GET' }).catch(console.error)
  t.expect(200, res.status, 'GET request returns a success status code.')
  t.expect(true, res.redirected, 'GET response recognizes it was redirected.')
  t.expect(true, res.JSON.data, 'Redirected GET request receives data payload.')
  t.expect(endpoint, res.url, 'GET request recognized the redirect URL.')

  res = await Fetch(redirect, { method: 'POST' }).catch(t.fail)
  t.expect(200, res.status, 'POST request returns a success status code.')
  t.expect(true, res.redirected, 'POST response recognizes it was redirected.')
  t.expect(true, res.JSON.data, 'Redirected POST request receives data payload.')
  t.expect(endpoint, res.url, 'POST request recognized the redirect URL.')

  res = await Fetch(redirect, { method: 'PUT' }).catch(t.fail)
  t.expect(200, res.status, 'PUT request returns a success status code.')
  t.expect(true, res.redirected, 'PUT response recognizes it was redirected.')
  t.expect(true, res.JSON.data, 'Redirected PUT request receives data payload.')
  t.expect(endpoint, res.url, 'PUT request recognized the redirect URL.')

  res = await Fetch(redirect, { method: 'DELETE' }).catch(t.fail)
  t.expect(200, res.status, 'DELETE request returns a success status code.')
  t.expect(true, res.redirected, 'DELETE response recognizes it was redirected.')
  t.expect(true, res.JSON.data, 'Redirected DELETE request receives data payload.')
  t.expect(endpoint, res.url, 'DELETE request recognized the redirect URL.')

  if (ngn.runtime !== 'browser') {
    res = await Fetch(redirect, { method: 'TRACE' }).catch(t.fail)
    t.expect(200, res.status, 'TRACE request returns a success status code.')
    t.expect(true, res.redirected, 'TRACE response recognizes it was redirected.')
    t.expect(true, res.JSON.data, 'Redirected TRACE request receives data payload.')
    t.expect(endpoint, res.url, 'TRACE request recognized the redirect URL.')
  } else {
    t.pass(`TRACE redirect test skipped (not applicable to ${ngn.runtime} runtime.`)
  }

  t.end()
})

test('Referrer-Policy', async t => {
  const host = encodeURIComponent(`http://${HOSTNAME}/run/tests/02-fetch.js`)
  let res

  if (ngn.runtime === 'browser' || POLYFILLED) {
    res = await Fetch(route(`/refer/no-referrer/${host}`), { referrerPolicy: 'no-referrer' }).catch(console.error)
    t.expect(200, res.status, 'Expected no referer header present on request.')

    res = await Fetch(route(`/refer/unsafe-url/${host}`), { referrerPolicy: 'unsafe-url' }).catch(console.error)
    t.expect(200, res.status, 'Expected the presence of a Referer HTTP header for unsafe-url referral.')

    res = await Fetch(route(`/refer/origin/${encodeURIComponent('http://' + HOSTNAME)}`), { referrerPolicy: 'origin' }).catch(console.error)
    t.expect(200, res.status, 'Expected the presence of a Referer HTTP header for origin referral.')

    res = await Fetch(route(`/refer/same-origin/${encodeURIComponent('http://' + HOSTNAME)}`), { referrerPolicy: 'same-origin' }).catch(console.error)
    t.expect(200, res.status, 'Expected the presence of a Referer HTTP header for same-origin referral.')

    res = await Fetch(route(`/refer/strict-origin/${encodeURIComponent('http://' + HOSTNAME)}`), { referrerPolicy: 'strict-origin' }).catch(console.error)
    t.expect(200, res.status, 'Expected the presence of a Referer HTTP header for strict-origin referral.')
  } else {
    t.comment('Referrer-Policy tests ignored in runtimes when "@ngnjs/libnet-node" polyfill is unavailable.')
  }

  // Skip no-referrer-when-downgrade, origin-when-cross-origin, & strict-origin-when-cross-origin
  // because we cannot replicate cross origin requests without additional test scaffolding.
  t.end()
})

test.todo('Request Cache', async t => {
  t.end()
})

test.todo('CORS Mode', async t => {
  t.end()
})