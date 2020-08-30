import test from 'tappedout'
import ngn from 'ngn'
import { URL as Address } from '@ngnjs/net'

test('URI: Basic Parsing', t => {
  let url = new Address()

  t.expect('/', url.path, 'Recognizes current root as base path when no root is specified.')
  t.expect('http', url.protocol, 'Defaults to HTTP protocol.')
  t.expect('http', url.scheme, 'Scheme alias returns appropriate protocol.')

  url = new Address('https://domain.com/path/to/file.html?min=0&max=1&safe#h1')
  t.expect('https', url.protocol, 'Proper protocol identified.')
  t.expect('domain.com', url.hostname, 'Identified hostname.')
  t.expect(443, url.port, 'Correctly identifies appropriate default port for known protocols.')
  t.expect('/path/to/file.html', url.path, 'Identified the path.')
  t.expect('min=0&max=1&safe', url.querystring, 'Identified correct query string.')
  t.expect('h1', url.hash, 'Identified correct hash value.')

  url = new Address('https://domain.com:4443/path/to/file.html?min=0&max=1&safe#h1')
  t.expect('https', url.protocol, 'Proper protocol identified.')
  t.expect('domain.com', url.hostname, 'Identified hostname.')
  t.expect(4443, url.port, 'Correctly identifies custom port for known protocols.')
  t.expect('/path/to/file.html', url.path, 'Identified the path.')
  t.expect('min=0&max=1&safe', url.querystring, 'Identified correct query string.')
  t.expect('h1', url.hash, 'Identified correct hash value.')
  // t.ok(true, url.toString())

  t.end()
})

test('URL: Basic Modifications', t => {
  const url = new Address('https://domain.com:4443/path/to/file.html?min=0&max=1&safe#h1')

  url.port = 'default'
  t.expect(443, url.port, 'Setting port to "default" leverages known protocols to determine port.')
  url.port = 7777
  t.expect(7777, url.port, 'Setting a non-standard port still works.')

  t.throws(() => { url.port = 70000 }, 'Settting the port over 65535 throws an error.')
  t.throws(() => { url.port = 0 }, 'Settting the port below 1 throws an error.')

  url.resetPort()
  t.expect(443, url.port, 'Port successfully cleared.')
  // t.comment(url.toString())
  t.expect('https://domain.com/path/to/file.html?min=0&max=1&safe=true#h1', url.toString(), 'Port not displayed after being cleared with a well known protocol.')
  t.expect('https://domain.com:443/path/to/file.html?min=0&max=1&safe=true#h1', url.toString({ forcePort: true }), 'Port still displayed after being cleared with a well known protocol (forcing port in toString).')

  t.end()
})

test('URL: Query Parameters', t => {
  const url = new Address('https://domain.com:4443/path/to/file.html?min=0&max=1&safe#h1')
  t.expect(3, Object.keys(url.query).length, 'Query object enumerates values correctly.')
  t.expect(0, url.query.min, 'Identify numeric attributes.')
  t.ok(url.query.safe, 'Identify boolean attributes.')

  delete url.query.max
  t.ok(Object.keys(url.query).length === 2, 'Query object enumerates values correctly after deletion.')

  url.query.test = 'value'
  t.expect('value', url.query.test, 'Adding new query parameter is reflected in query object.')
  t.expect('min=0&safe=true&test=value', url.querystring, 'Querystring modifications reflect query object.')
  t.expect('https://domain.com:4443/path/to/file.html?min=0&safe=true&test=value#h1', url.toString(), 'Querystring present with non-default port.')

  url.querystring = 'a=a&b&c=c'
  t.expect('https://domain.com:4443/path/to/file.html?a=a&b&c=c#h1', url.toString({ shrinkQuerystring: true }), 'Overwriting querystring generates appropriate URL.')
  t.ok(url.query.b, 'Overwritten query object returns appropriate new default values.')
  url.query.b = false
  t.expect('https://domain.com:4443/path/to/file.html?a=a&b=false&c=c#h1', url.toString(), 'Overwriting querystring generates appropriate URL.')
  t.ok(url.query.a === 'a' && url.query.b === false && url.query.c === 'c', 'Overwritten query string is properly reflected in query object.')
  t.end()
})

test('URL: Hash', t => {
  const url = new Address('https://domain.com:4443/path/to/file.html?min=0&max=1&safe#h1')

  t.expect('h1', url.hash, 'Properly parsed hash.')
  url.hash = 'h2'
  t.expect('h2', url.hash, 'Properly updated hash.')
  t.expect('https://domain.com:4443/path/to/file.html?min=0&max=1&safe=true#h2', url.toString(), 'Hash update reflected in URL.')
  t.expect('https://domain.com:4443/path/to/file.html?min=0&max=1&safe=true', url.toString({ hash: false }), 'Hash successfully ignored.')

  url.hash = null
  t.expect('https://domain.com:4443/path/to/file.html?min=0&max=1&safe=true', url.toString(), 'Hash successfully removed.')

  t.end()
})

test('URL: Credentials', t => {
  const url = new Address('https://admin:supersecret@domain.com:4443/path/to/file.html?min=0&max=1&safe#h1')

  t.expect('admin', url.username, 'Successfully parsed username.')
  t.expect('***********', url.password, 'Successfully parsed and hid password.')
  t.expect('https://domain.com:4443/path/to/file.html?min=0&max=1&safe=true#h1', url.toString(), 'Credentials are not generated in toString by default.')
  t.expect('https://admin:supersecret@domain.com:4443/path/to/file.html?min=0&max=1&safe=true#h1', url.toString({ username: true, password: true }), 'Credentials are generated in toString when requested.')
  t.expect('https://admin:supersecret@domain.com:4443/path/to/file.html?min=0&max=1&safe=true#h1', url.toString({ password: true }), 'Credentials are generated in toString when password is requested.')
  t.expect('https://admin@domain.com:4443/path/to/file.html?min=0&max=1&safe=true#h1', url.toString({ username: true }), 'Username is generated in toString when requested.')
  url.password = null
  t.expect('https://admin@domain.com:4443/path/to/file.html?min=0&max=1&safe=true#h1', url.toString({ username: true, password: true }), 'Username is generated in toString when credentials are requested but only a username exists.')

  t.end()
})

test('URL: Formatting', t => {
  const url = new Address('https://admin:supersecret@domain.com:443/path/to/file.html?min=0&max=1&safe#h1')

  t.expect('https://domain.com/path/to/file.html?min=0&max=1&safe#h1', url.formatString(), 'Standard formatting works.')
  t.expect('https://domain.com', url.formatString('{{protocol}}://{{hostname}}'), 'Basic formatting works.')
  t.expect('https://domain.com/#h1', url.formatString('{{protocol}}://{{hostname}}/{{hash}}'), 'Basic formatting works.')

  t.expect('https://domain.com/path/to/file.html', url.toString({ querystring: false, hash: false }), 'Configuration options in toString works properly.')
  t.end()
})

test('URL: Special Protocols', t => {
  const url = new Address('mailtob://john@doe.com')

  url.setDefaultProtocolPort('mailtob', 587)
  t.expect(587, url.port, 'Successfully mapped a custom protocol to a default port.')

  url.setDefaultProtocolPort({
    snmp: 162,
    ssh: 2222
  })

  url.href = 'ssh:user@domain.com'
  t.expect(2222, url.port, 'Overriding a default port is successful.')

  url.removeDefaultProtocolPort('ssh', 'mailtob')
  t.expect(2222, url.port, 'Unsetting a default port does not change the current value of the port.')

  url.resetPort()
  t.expect(80, url.port, 'Resetting a port with a removed default protocol defaults to port 80.')

  t.end()
})

test('URL: Local Path Parsing', t => {
  const tmpurl = new Address('path/to/file.html')
  t.expect('/path/to/file.html', tmpurl.path, 'Properly handles local paths.')
  t.end()
})
