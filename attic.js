const http = require('http')
const path = require('path')
const wai = require('@jonggrang/wai')
const task = require('@jonggrang/task')

function app(ctx, send) {
  return send(wai.responseFile(200, {
    'Content-Type': 'application/json'
  }, path.join(__dirname, 'package.json')))
}

task.launchTask(wai.runWith(http.createServer(), app, settings =>
  Object.assign({}, settings, {
    fdCacheDuration: 10,
    finfoCacheDuration: 10,
    listenOpts: {
      host: '192.168.10.20',
      port: 2346
    },
  })
))
