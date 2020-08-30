import test from 'tappedout'
import ngn from 'ngn'
import { Request as NGNRequest } from '@ngnjs/net' // Rename to prevent conflicts in browser tests

const root = 'http://localhost'

test('NGN HTTP Request Sanity', t => {
  t.expect('function', typeof NGNRequest, 'Request class recognized.')
  t.end()
})

test('NGN HTTP Request Configuration', t => {
  const request = new NGNRequest({
    username: 'test',
    password: 'test',
    proxyUsername: 'user',
    proxyPassword: 'pass',
    url: root + '/?a=1',
    body: {
      test: 'test'
    }
  })

  request.setHeader('X-NGN', 'test')

  t.expect('test', request.getHeader('X-NGN'), 'Request.getHeader returns proper value.')
  t.expect(undefined, request.password, 'Password is not exposed.')
  t.expect('localhost', request.hostname, 'Properly parsed hostname')
  t.expect('http', request.protocol, 'Properly parsed protocol.')
  t.expect('GET', request.method, 'Defaults to GET method.')
  t.expect('test', request.headers.get('x-ngn'), 'Custom header applied.')
  t.ok(request.headers.has('content-length'), 'Content-Length header present for secure requests (basic auth).')
  t.ok(request.headers.has('content-type'), 'Content-Type header present for secure requests (basic auth).')
  t.ok(request.headers.has('authorization'), 'Authorization header present for secure requests (basic auth).')
  t.ok(request.headers.has('proxy-authorization'), 'Proxy-Authorization header present for proxied requests (basic auth).')
  t.expect('application/json', request.headers.get('content-type'), 'Content-Type correctly identifies JSON.')
  t.expect(15, request.headers.get('content-length'), 'Content-Type correctly identifies length of JSON string.')
  t.expect(0, request.headers.get('authorization').indexOf('Basic '), 'Authorization basic auth digest correctly assigned to header.')
  t.expect('', request.hash, 'Correct hash identified.')

  // t.ok(request.maxRedirects === 10, 'Default to a maximum of 10 redirects.')
  // request.maxRedirects = 30
  // t.ok(request.maxRedirects === 25, 'Prevent exceeding 25 redirect threshold.')
  // request.maxRedirects = -1
  // t.ok(request.maxRedirects === 0, 'Do not allow negative redirect maximum.')
  // request.maxRedirects = 15
  // t.ok(request.maxRedirects === 15, 'Support custom redirect maximum between 0-25.')

  request.accessToken = '12345'

  t.ok(request.headers.has('authorization'), 'Authorization header present for secure requests (token).')
  t.expect('Bearer 12345', request.headers.get('authorization'), 'Authorization token correctly assigned to header.')

  request.proxyAccessToken = '12345'

  t.ok(request.headers.has('proxy-authorization'), 'Proxy-Authorization header present for proxied requests (token).')
  t.expect('Bearer 12345', request.headers.get('proxy-authorization'), 'Proxy-Authorization token correctly assigned to header.')

  t.ok(request.crossOriginRequest, 'Correctly identifies request as a cross-domain request.')
  t.expect(1, request.queryParameterCount, 'Correctly identifies and parses query parameters.')

  request.removeHeader('X-NGN')
  t.ok(!request.headers.has('x-ngn'), 'Removed header no longer part of request.')

  request.setQueryParameter('mytest', 'ok')
  t.ok('expect', request.query.mytest, 'Added correct query parameter value.')

//   try {
//     request.query.mytest = 'done'
//     t.fail('Query parameters were updated directly (not allowed).')
//   } catch (e) {
//     t.pass('Request query attribute is readonly.')
//   }

  request.setQueryParameter('mytest', 'done')
  t.expect('done', request.query.mytest, 'Inline update of query parameter correctly identifies new value.')

  request.removeQueryParameter('mytest')
  t.expect(undefined, request.query.mytest, 'Removing query parameter yields a URL without the parameter.')

  request.method = 'post'
  t.expect('POST', request.method, 'Dynamically setting method returns proper HTTP method.')
  t.expect((request.protocol === 'https' ? 443 : 80), request.port, 'Proper port identified.')

  request.url = 'http://user:passwd@test.com:7788/path/to/file.html'
  t.expect('user', request.username, 'Properly parsed basic auth string.')
  t.ok(request.isCrossOrigin, 'CORS recognition correctly identifies cross origin request.')

  request.url = 'http://test.com:7788/path/to/to/../file.html'
  t.expect('http://test.com:7788/path/to/file.html', request.url, 'Properly normalized URL.')

  request.body = {
    form: {
      a: 'test',
      b: 1,
      c: {
        nested: true
      }
    }
  }

  t.expect('string', typeof request.body, 'Properly converted structured form to string-based body.')

  request.body = 'data:image/png;base64, iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=='
  t.expect('image/png', request.getHeader('content-type'), 'Correctly identified data image body type.')

  request.body = '<?xml version="1.0" encoding="UTF-8"?><note><to>Tove</to><from>Jani</from><heading>Reminder</heading><body>Don\'t forget me this weekend!</body></note>'
  t.expect('application/xml', request.getHeader('content-type'), 'Correctly identified XML body type.')

  request.body = '<html><body>test</body></html>'
  t.expect('text/html', request.getHeader('content-type'), 'Correctly identified HTML body type.')

  request.body = 'Basic text body.'
  t.expect('text/plain', request.getHeader('content-type'), 'Correctly identified HTML body type.')

//   request = new Request({
//     url: uri.get,
//     maxRedirects: 7
//   })

//   t.ok(request.maxRedirects === 7, 'Maximum redirects can be set via configuration.')
  t.end()
})
