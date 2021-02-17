import test from 'tappedout'
import ngn from 'ngn'
import { Client, Request as NgnRequest } from '@ngnjs/net'

const url = 'http://localhost/requests'

test('Sanity Check', t => {
  t.expect('function', typeof Client, 'Client class recognized.')

  const client = new Client()
  t.ok(client instanceof Client, 'Client class instantiated.')

  t.ok(client.Request === NgnRequest, 'Request class is exposed to client.')

  t.expect('function', typeof client.request, 'Client request method available.')
  t.expect('function', typeof client.send, 'Client send method available.')
  t.expect('function', typeof client.preflight, 'Client preflight method available.')
  t.expect('function', typeof client.options, 'Client options request method available.')
  t.expect('function', typeof client.OPTIONS, 'Client OPTIONS alias method available.')
  t.expect('function', typeof client.head, 'Client head request method available.')
  t.expect('function', typeof client.HEAD, 'Client HEAD request alias available.')
  t.expect('function', typeof client.get, 'Client get request method available.')
  t.expect('function', typeof client.GET, 'Client GET request alias available.')
  t.expect('function', typeof client.post, 'Client post request method available.')
  t.expect('function', typeof client.POST, 'Client POST request alias available.')
  t.expect('function', typeof client.put, 'Client put request method available.')
  t.expect('function', typeof client.PUT, 'Client PUT request alias available.')
  t.expect('function', typeof client.delete, 'Client delete request method available.')
  t.expect('function', typeof client.DELETE, 'Client DELETE request alias available.')
  t.expect('function', typeof client.trace, 'Client trace request method available.')
  t.expect('function', typeof client.TRACE, 'Client TRACE request alias available.')
  t.expect('function', typeof client.json, 'Client json request method available.')
  t.expect('function', typeof client.JSON, 'Client JSON request alias available.')
  t.expect('function', typeof client.jsonp, 'Client jsonp request method available.')
  t.expect('function', typeof client.JSONP, 'Client JSONP request alias available.')

  t.end()
})

test.only('HTTP Requests', async t => {
  const client = new Client()
  let res

  res = await client.OPTIONS(url).catch(console.error)
  t.expect(200, res.status, 'OPTIONS sends and receives.')

  res = await client.HEAD(url).catch(console.error)
  t.expect(200, res.status, 'HEAD sends and receives.')

  if (ngn.runtime !== 'browser') {
    res = await client.TRACE(url).catch(t.fail)
    if (res.status === 405) {
      t.pass('TRACE sends and receives.')
    } else {
      t.expect(200, res.status, 'TRACE sends and receives.')
    }
  } else {
    t.pass('Ignore HTTP TRACE in browser environments.')
  }

  res = await client.GET(url).catch(console.error)
  t.expect(200, res.status, 'GET sends and receives.')
  t.expect(true, res.hasOwnProperty('request'), 'Contains the original request')

  res = await client.POST(url).catch(console.error)
  t.expect(200, res.status, 'POST sends and receives.')

  res = await client.PUT(url).catch(console.error)
  t.expect(200, res.status, 'PUT sends and receives.')

  res = await client.DELETE(url).catch(console.error)
  t.expect(200, res.status, 'DELETE sends and receives.')

  let body = await client.JSON({ url: url + '/test.json' }).catch(console.error)
  t.expect('object', typeof body, 'JSON autoparses objects and returns the result.')
  t.expect('worked', body.result, 'Recognized JSON object values.')

  if (ngn.runtime === 'browser') {
    body = await client.JSONP(url + '/jsonp/test.json').catch(console.error)
    t.expect('worked', body.result, 'JSONP retrieves data via script tag.')

    body = await client.JSON({ url: url + '/test.json', mode: 'no-cors' }).catch(console.error)
    t.expect(null, body, 'no-cors mode does not provide response body.')
  } else {
    await client.JSONP(url + '/test.json').then(r => t.fail('JSONP should throw an error in non-browser runtimes.')).catch(e => t.pass(e.message))
  }

  res = await client.request({ url, method: 'PATCH' }).catch(console.error)
  t.expect(200, res.status, 'Generic request method issues request.')

  t.end()
})
