import test from 'tappedout'
import ngn from 'ngn'
import { Resource, Request } from '@ngnjs/net' // Rename to prevent conflicts in browser tests

const baseUrl = 'http://localhost/resource'

test('NGN Network Resource Sanity Check', t => {
  t.expect('function', typeof Resource, 'Resource class recognized.')

  const client = new Resource()
  t.ok(client instanceof Resource, 'Resource class instantiated.')

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

test('Resource Credential Validation', function (t) {
  const req = new Resource({ baseUrl })

  req.username = 'john'
  req.password = 'passwd'

  t.expect('john', req.username, 'Properly set username.')
  t.expect(undefined, req.password, 'Password is not easily accessible.')

  req.username = 'bill'
  t.expect('bill', req.username, 'Properly reset username.')

  req.accessToken = '12345abcde'
  t.expect(null, req.username, 'Setting an access token clears username/password from credentials.')

  t.expect(undefined, req.accessToken, 'Cannot retrieve access token.')
  t.expect(undefined, req.password, 'Cannot retrieve password.')

  req.username = 'bob'
  req.password = 'xpwd'

  t.expect('bob', req.username, 'Properly set username via credentials.')

  t.end()
})

test('', t => {
  const req = new Resource({ baseUrl })
  const tmp = req.prepareUrl('/blah')
  t.expect(req.baseUrl + '/blah', tmp, 'Sucessfully prepended base URL to URI.')
  t.end()
})

test('Resource', t => {
  const a = new Resource({
    headers: {
      'X-NGN-TEST': 'test'
    },
    query: {
      nonce: 'easy'
    },
    username: 'admin',
    password: 'secure',
    unique: true,
    nocache: true
  })

  const b = new Resource({
    headers: {
      'X-OTHER': 'other'
    },
    query: {
      other: 'simple'
    },
    accessToken: '12345',
    httpsonly: true
  })

  t.expect(-1, a.baseUrl.indexOf('https://'), 'Not forcing SSL does not reqrite baseURL to use HTTPS')
  t.expect(0, b.baseUrl.indexOf('https://'), 'Forcing SSL rewrites baseURL to use HTTPS')

  const req = new Request({ url: baseUrl })
  const breq = new Request({ url: baseUrl })

  a.preflight(req)
  b.preflight(breq)

  t.expect('test', req.headers.get('x-ngn-test'), 'Custom header present.')
  t.expect('other', breq.headers.get('x-other'), 'Custom header present on different resource.')
  t.ok(req.headers.has('authorization'), 'Authorization header present for secure requests (basic auth).')
  t.ok(breq.headers.has('authorization'), 'Authorization header present for secure requests (token auth).')
  t.expect('Bearer 12345', breq.headers.get('authorization'), 'Authorization token correctly assigned to header.')
  t.expect('easy', req.query.nonce, 'Proper query parameter appended to URL.')
  t.expect('no-cache', req.cache, 'Nocache query parameter applied to request.')
  t.expect(2, req.queryParameterCount, 'Unique query parameter applied to request.')

  t.expect('test', req.headers.get('x-ngn-test'), 'Header reference retrieves correct headers.')

  req.headers = { 'X-TEST': 'test' }
  t.expect('test', req.headers.get('X-TEST'), 'Properly set global headers.')

  req.accessToken = '12345ABCDEF'
  t.expect('token', req.authType, 'Properly replaced basic auth with token.')

  a.query = { test: 1 }
  t.expect(1, a.query.test, 'Properly set query parameters of a resource.')

  t.end()
})

test('Resource Requests', async t => {
  const client = new Resource({ baseUrl })
  let res

  res = await client.OPTIONS('/OPTIONS').catch(console.error)
  t.expect(200, res.status, 'OPTIONS responds.')
  t.expect('OK', res.body, 'OPTIONS sends and receives.')

  res = await client.HEAD('/HEAD').catch(console.error)
  t.expect(200, res.status, 'HEAD responds.')
  t.expect('', res.body, 'HEAD sends and receives.')

  res = await client.GET('/GET').catch(console.error)
  t.expect(200, res.status, 'GET responds.')
  t.expect('GET', res.body, 'GET sends and receives.')

  res = await client.POST('/POST').catch(console.error)
  t.expect(200, res.status, 'POST responds.')
  t.expect('POST', res.body, 'POST sends and receives.')

  res = await client.PUT('/PUT').catch(console.error)
  t.expect(200, res.status, 'PUT responds.')
  t.expect('PUT', res.body, 'PUT sends and receives.')

  res = await client.DELETE('/DELETE').catch(console.error)
  t.expect(200, res.status, 'DELETE responds.')
  t.expect('DELETE', res.body, 'DELETE sends and receives.')

  const body = await client.JSON('/GET/json').catch(console.error)
  t.expect('object', typeof body, 'JSON autoparses objects and returns the result.')
  t.expect('worked', body.result, 'Recognized JSON object values.')

  t.end()
})

test('Resource Routes', async t => {
  const API = new Resource({
    baseUrl,
    username: 'user',
    password: 'pass'
  })
  const v1 = API.route('/v1')
  const v2 = API.route('/v2')
  const v3 = API.route('/v3')
  const v4 = API.route('/v4')
  let res

  t.expect(baseUrl + '/v1', v1.baseUrl, 'Route is appended to base URL')
  t.expect(baseUrl + '/v2', v2.baseUrl, 'Alternate route is appended to base URL')

  res = await v1.GET('/test/path').catch(console.error)
  t.expect(200, res.status, 'Routed to appropriate path.')

  res = await v2.GET('/test/path').catch(console.error)
  t.expect(201, res.status, 'Routed to appropriate alternative path.')

  res = await v3.GET('/test/path').catch(console.error)
  t.expect(200, res.status, 'Security credentials inherited from origin.')

  API.username = 'other'
  API.password = 'secret'
  res = await v4.GET('/test/path').catch(console.error)
  t.expect(200, res.status, 'Modified credentials accepted.')

  const altBase = 'https://alt.domain.com'
  API.baseUrl = altBase
  t.expect(altBase + '/v1', v1.baseUrl, 'Route is appended to updated base URL')
  t.expect(altBase + '/v2', v2.baseUrl, 'Alternate route is appended to updated base URL')

  t.end()
})

test('Resource Cloning', async t => {
  const API = new Resource({
    baseUrl,
    username: 'user',
    password: 'pass'
  })

  let res
  const v1 = API.clone({ baseUrl: baseUrl + '/v1' })
  const v2 = API.clone({ baseUrl: baseUrl + '/v2' })
  const v3 = API.clone({ baseUrl: baseUrl + '/v3' })
  const v4 = API.clone({
    baseUrl: baseUrl + '/v4',
    username: 'other',
    password: 'secret'
  })

  t.expect(baseUrl + '/v1', v1.baseUrl, 'Route is appended to base URL')
  t.expect(baseUrl + '/v2', v2.baseUrl, 'Alternate route is appended to base URL')

  res = await v1.GET('/test/path').catch(console.error)
  t.expect(200, res.status, 'Routed to appropriate path.')

  res = await v2.GET('/test/path').catch(console.error)
  t.expect(201, res.status, 'Routed to appropriate alternative path.')

  res = await v3.GET('/test/path').catch(console.error)
  t.expect(200, res.status, 'Security credentials inherited from origin.')

  res = await v4.GET('/test/path').catch(console.error)
  t.expect(200, res.status, 'Modified credentials accepted.')

  API.username = 'other'
  API.password = 'secret'
  res = await v3.GET('/test/path').catch(console.error)
  t.expect(200, res.status, 'Changing origin attributes does NOT change clones.')

  t.end()
})