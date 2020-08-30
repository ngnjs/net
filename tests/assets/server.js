export default (app, API) => {
  // app.use(API.log)
  // API.applyCommonConfiguration(app)
  // API.logRedirects()
  app.use(API.allowAll())

  const response = { text: 'static' }

  app.get('/', (req, res) => {
    // res.set('cache-control', 'max-age=200')
    res.json(response)
  })

  app.all('/basic', API.OK)

  app.all('/redirect', API.redirect('/endpoint'))

  app.all('/endpoint', API.reply({ data: true }))

  app.all('/refer/:type/:host', (req, res) => {
    const { type, host } = req.params
    const referrer = req.get('referer')
    const source = referrer ? new URL(referrer) : null

    switch (type) {
      case 'no-referrer':
        return res.sendStatus(referrer ? 400 : 200)

      case 'no-referrer-when-downgrade':
        if (source.protocol === 'https:' || req.get('pretendTLS')) {
          return res.sendStatus(referrer ? 400 : 200)
        }
 
        return res.status(400).send('Referer header present for downgraded protocol.')

      case 'strict-origin':
        if (source !== null && source.hostname === req.hostname) {
          return res.sendStatus(200)
        }

        return res.status(400).send('Referer header present for strict-origin request when origins or protocols are not the same.')

      case 'same-origin':
        if (source === null && req.hostname === (new URL(host)).hostname) {
          return res.sendStatus(200)
        }

        return res.status(400).send('Referer header present for same-origin request when origins are not the same.')

      default:
        if (!referrer) {
          console.log(req.headers)
          return res.status(400).send('Expected a Referer HTTP header for ' + type + ' referral.')
        }
    }
    
    if (referrer === host) {
      return res.sendStatus(200)
    } else if (referrer.length - 1 === host.length && referrer.substr(-1) === '/') {
      return res.sendStatus(200)
    } else {
      console.log(referrer, '!==', host)
    }

    res.status(400).send(`${referrer} !== ${host}`)
  })

  app.get('/requests/jsonp/test.json', (req, res) => {
    if (!req.query.callback) {
      res.status(400).send('Missing callback query parameter.')
    }

    res.send(`${req.query.callback}({ "result": "worked" })`)
  })

  app.get('/requests/test.json', API.reply({ result: 'worked' }))

  app.all('/requests', API.OK)

  app.all('/resource/v1/test/path', API.OK)
  app.all('/resource/v2/test/path', API.HTTP201)
  app.all('/resource/v3/test/path', API.basicauth('user', 'pass'), API.OK)
  app.all('/resource/v4/test/path', API.basicauth('other', 'secret'), API.OK)

  app.all('/resource/:method', (req, res) => {
    res.send(req.params.method.toUpperCase())
  })

  app.get('/resource/:method/json', API.reply({ result: 'worked' }))
}
