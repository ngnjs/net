# Network NGN Plugin

The NGN network plugin provides two major building blocks:

1. HTTP `Client`
1. HTTP `Resource`

The following features are also included:

1. `URL`
1. `Fetch`
1. `INTERFACES`
1. `HOSTNAME`

## HTTP Client

The HTTP client provides an intuitive way to execute HTTP requests. All major HTTP methods are supported (`GET`, `POST`, `PUT`, `DELETE`, `HEAD`, `OPTIONS`, & `TRACE`). Two additional "helper" methods exist for accessing JSON data: `JSON` and `JSONP` (only used in browser runtimes).

```javascript
import { Client } from '@ngnjs/net'

const client = new Client()

client.GET('https://domain.com').then(response => console.log(response.body)).catch(console.error)

client.GET('https://domain.com', function (response) {
  console.log(response)
})

client.JSON('https://domain.com/data.json', data => {
  console.log(data)
})
```

This client is intentionally simple. It behaves more like an API tool, similar to Postman. Issuing a request will return a response. This differs from some request libraries, which throw errors for certain HTTP status codes, such as `404`. These are _valid_ responses. The client treats them as such. The client will only throw an error when a code problem occurs. Developers are free to handle network responses however they see fit.

The client natively supports headers, query strings/parameters, promises, and callbacks. This differs from other libraries, which rely on dependencies. The native capability allows this client to run consistently across runtimes, such as browsers, Node.js, and Deno.

Some runtimes do not support all of the features developers are used to in the browser. For example, the browser Fetch API supports [caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy), CORS mode, [referral policies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy), [subresource integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity), and [abort controllers](https://developer.mozilla.org/en-US/docs/Web/API/AbortController). Node.js is does not natively support most of these, while Deno is missing a few. These features have been stubbed in the client. Using them will not break an application, but they also won't do anything by default. If these features are important in your application, use the `@ngnjs/libnet-node` library, which polyfills these features for Node.js.

## HTTP Resource

An HTTP resource is a special HTTP client. It applies common values to all requests. For example:

```javascript
const API = new Resource({
  baseUrl: 'https://api.domain.com',
  headers: {
    'x-version': 'v1'
  },
  token: 'mytoken'
})

API.JSON('/endpoint').then(data => { ... }).catch(console.error)
```

In the example above, a request is made to `https://api.domain.com/endpoint`. Two headers are applied automatically:

1. `x-version: v1`
1. `Authorization: Bearer mytoken`.

Any option that can be applied to a Request can be applied to a resource (including query parameters and URL hashes).

### Primary Purpose

Resources make it easy to organize communications with remote services. They can be used to create custom API clients, including multiple clients per application.

### Extended Configuration Options

Resources also have a few special configuration attributes:

- `nocache` - set this to `true` to avoid caching. This overrides the `Cache-Control` header.
- `unique` - this this to `true` to automatically append a unique query parameter to all requests (cache busting).
- `useragent` - Specify a custom user agent name. This can be helpful when interacting with API's which require an identifying user agent.
- `uniqueagent` - set this to `true` to generate a unique ID to append to the `useragent` name. This helps guarantee every request comes from a unique user agent name.
- `tokenRenewalNotice` - optionally set this to trigger a notification event before an auth token expires (see Auth Tokens).

### Auth Tokens

When interacting with API's, it is common for auth tokens to expire after a period of time. The `setToken` method will accept the expiration date/time, automatically removing the token when it expires.

By default, a token expiration warning event (`token.pending.expiration`) is triggered 10 seconds before a token expires. The lead time can be modified using the `tokenRenewalNotice` configuration option.

Token renewal notices were not designed to auto-renew auth tokens. They were designed to notify the application before a token is expired/removed. Applications can use this feature to renew tokens before they expire (or choose not to).

## URL

The `URL` class, often aliases as `Address` is an enhanced version of the [URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL).

### Query Parameters

The `searchParams` feature of the URL API is still available, but sometimes it is just simpler to reference a query object (instead of a map-like object). For this purpose, a `query` attribute is available, providing a common key/value structure of all the query parameters (readable and writable).

The `querystring` attribute also provides a convenient way to read/write the full query string.

### Ports & Protocols

In the process of manipulating URL's, it is common to need to change the port. This URL class automatically recognizes default ports for several known protocols (`http`, `https`, `ssh`, `ldap`, `sldap`, `ftp`, `ftps`, `sftp`). Custom default ports can also be specified using the `setDefaultProtocolPort()` method. When the protocol is changed, it does not update the port automatically, but the `update.protocol` event is triggered, allowing applications to determine if the port should be updated.

Setting `port` to `'default'` will always use the default port of the specified protocol. The `resetPort()` method is a shortcut for doing this.

### Cross Origin Features

The `local` attribute determines whether a URL is local to the system or not. In browsers, this detects whether the URL's origin is the same as the page. In backend runtimes, this is compared to the system `hostname` (server name), as well as the local IP addresses and any other local interfaces.

The `isSameOrigin()` method provides a quick and convenient way to determine if a different URL shares the same origin (i.e. not a cross-origin URL). This method optionally supports strict protocol matching.

These features can help assess and minimize CORS errors.

### URL Formatting & Output

The URL class has two methods, `toString()` and `formatString`.

`toString()` differs from the URL API. It accepts a configuration argument, allowing certain aspects of the URI to be ignored or forced. For example:

```javascript
const myUrl = 'http://locahost'

console.log(myUrl.toString({ port: true }))
// Outputs http://localhost:80
```

The `formatString` accepts a template, which will be populated with the attributes of the URL. For example:

```javascript
const myUrl = 'http://jdoe:secret@localhost/path.html'

console.log(myUrl.formatString('{{username}} accessing {{path}}'))
// Outputs jdoe acessing path.html
```

## Additional Features

The Client, Resource, and URL classes all implement an `NGN.EventEmitter`. This means they'll fire change events.

## Known Issues

### Fetch API: ReferrerPolicy & Cache

Deno doesn't support fetch ReferrerPolicy & Cache. Deno is working on cache support, but will likely not implement ReferrerPolicy. Node.js doesn't support these either, but the `@ngnjs/libnet-node` plugin can polyfill such features. 

ReferrerPolicy is less likely to be necessary in non-browser environments, with the exception of a limited set of proxy and API applications.

The ReferrerPolicy polyfill in `@ngnjs/libnet-node` currently uses the `os` module to identify the server hostname & IP address. This is used to help determine when a referrer is on the same host or not. The hostname feature does not yet exist in Deno, but is on the Deno roadmap. When support for this is available, a ReferrerPolicy polyfill will be made for Deno (if there is enough interest).

--

Everything below is boilerplate from the plugin generation tool (can be removed when ready)
--
A plugin module for NGN.

## Usage

### Via CDN (Browser/Deno)

```javascript
import NGN from 'https://cdn.skypack.dev/ngn'
import Network from 'https://cdn.skypack.dev/@ngnjs/network'

const feature = new Network()

console.log(feature)
```

### Node

`npm i ngn @ngnjs/network -S`

```javascript
import NGN from 'ngn'
import Network from '@ngnjs/network'

const feature = new Network()

console.log(feature)
```

## Plugin Authoring Instructions (Remove these)

This project template supports creation of NGN plugins. This template can be used directly, but was designed to be implemented with [NGND (NGN Dev) CLI tool](https"//github/com/ngnjs/cli).

The template contains:

1. Starter Source Code
1. Unit Test Boilerplate
1. CI/CD Runner
1. Autopublishing (triggered on new `package.json` versions in master branch)
