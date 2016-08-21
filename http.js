var Task = require('data.task'),
  Data = require('union-type'),
  curryN = require('ramda/src/curryN'),
  is = require('ramda/src/is'),
  map = require('ramda/src/map'),
  compose = require('ramda/src/compose'),
  always = require('ramda/src/always'),
  Maybe = require('./data/maybe'),
  Type = require('./data/type')

// detect browser support
var support =
  { blob: typeof Blob !== 'undefined' && typeof FileReader !== 'undefined'
  , formData: typeof FormData !== 'undefined'
  , arrayBuffer: typeof ArrayBuffer !== 'undefined'
}

var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

var Body = Data({
  Text: [String]
  , Blob: [always(true)]
  , FormData: [always(true)]
  , ArrayBuffer: [always(true)]
})
if (support.blob) {
  Body.prototype.blob = function () {
    return Body.case({
      Blob: function (data) {
        return Task.of(data)
      },
      FormData: function () {
        throw new Error('could not read FormData body as text')
      },
      Text: function (data) {
        return Task.of(new Blob([data]))
      }
    }, this)
  }

  Body.prototype.arrayBuffer = function () {
    return this.blob().chain(readBlobAsArrayBuffer)
  }

  Body.prototype.text = function () {
    return Body.case({
      Blob: function (data) {
        return readBlobAsText(data)
      },
      FormData: function () {
        throw new Error('could not read FormData body as text')
      },
      Text: function (data) {
        return Task.of(data)
      }
    }, this)
  }
} else {
  Body.prototype.text = function () {
    return Task.of(this[0])
  }
}

if (support.formData) {
  Body.prototype.formData = function () {
    return map(decodeFormData, this.text())
  }
}

Body.prototype.json = function () {
  return map(JSON.parse, this.text())
}

var Request = Type('Request', {
  method: String
  , url: String
  , headers: Object
  , body: Maybe.maybe(always(true), is(Body))
  , userName: Maybe.maybe(always(true), is(String)) // Maybe String
  , password: Maybe.maybe(always(true), is(String)) // Maybe String
})

var RequestSettings = Type('RequestSettings', {
  timeout: Number // in miliseconds
  // Maybe Function, the function that will registered to start event
  , onStart: Maybe.maybe(always(true), is(Function))
  // Maybe Function, the function that will registered to progress event
  // this is mostly a stream
  , onProgress: Maybe.maybe(always(true), is(Function))
  , withCredentials: Boolean
})

var Response = Type('Response', {
  status: Number
  , statusText: String
  , OK: Boolean
  , headers: Object
  , url: String
  , body: Maybe.maybe(always(true), is(Body))
})

var HttpError = Data({
  NetworkError: [Object]
  , TimeOut: [Object]
})

var defaultSettings = RequestSettings(0, Maybe.Nothing(), Maybe.Nothing(), false)

function normalizeMethod(method) {
  var uppercaseMethod = method.toUppercase()
  return (methods.indexOf(uppercaseMethod) > -1) ? uppercaseMethod : method
}

function toResponse(xhr) {
  var rawBody = 'response' in xhr ? xhr.response : xhr.responseText,
    ok = xhr.status >= 200 && xhr.status < 300,
    body = Maybe.fromNullable(transFormToBody(rawBody))

  return Response(xhr.status, xhr.statusText, ok, parseHeaders(xhr), responseUrl(xhr), body)
}

function transFormToBody(body) {
  return is(String, body) ? Body.Text(body)
         : support.blob && Blob.prototype.isPrototypeOf(body) ? Body.Blob(body)
         : support.formData && FormData.prototype.isPrototypeOf(body) ? Body.FormData(body)
         : support.searchParams && URLSearchParams.prototype.isPrototypeOf(body) ? Body.Text(body)
         : !body ? Body.Text(body)
         : null
}

function send(settings, request) {
  return new Task(function (reject, resolve) {
    var xhr = new XMLHttpRequest(),
      getXhr = always(xhr),
      abort = xhr.abort.bind(xhr),
      headers = request.headers,
      k
    // setup the loadStart
    map(function (val) {
      xhr.addEventListener('loadStart', val, false)
    }, settings.onStart)
    // setup the progress
    map(function (val) {
      xhr.addEventListener('progress', val, false)
    }, settings.onProgress)
    //
    xhr.addEventListener('load', compose(resolve, toResponse, getXhr), false)
    xhr.addEventListener('error', compose(reject, HttpError.NetworkError, getXhr), false)
    xhr.addEventListener('timeout', compose(reject, HttpError.TimeOut, getXhr), false)
    // open
    xhr.open(request.method, request.url, true)
    if (!('Content-Type' in headers)) {
      if (request.body instanceof Body.Text) {
        headers['Content-Type'] = 'text/plain;charset=UTF-8'
      } else if (request.body instanceof Body.Blob && request.body[0].type) {
        headers['Content-Type'] = request.body[0].type
      } else if(support.searchParams && URLSearchParams.prototype.isPrototypeOf(request.body[0])) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'
      }
    }
    for (k in headers) {
      xhr.setRequestHeader(k, headers[k])
    }
    //
    xhr.timeout = settings.timeout
    xhr.withCredentials = settings.withCredentials
    if ('responseType' in xhr && support.blob) {
      xhr.responseType = 'blob'
    }
    function sendGet() {
      xhr.send()
    }
    function sendWithBody(body) {
      xhr.send(body[0])
    }
    Maybe.maybe(sendGet, sendWithBody, request.body)

    return abort
  }, function (abort) {
    if (typeof abort === 'function') abort()
  })
}

function get(url) {
  var request = Request('GET', url, {}, Maybe.Nothing(), Maybe.Nothing(), Maybe.Nothing())
  return send(defaultSettings, request)
}

function fileReaderReady(reader) {
  return new Task(function (reject, resolve) {
    reader.onload = function () {
      resolve(reader.result)
    }
    reader.onerror = function () {
      reject(reader.error)
    }
  })
}

function readBlobAsArrayBuffer(blob) {
  var reader = new FileReader()
  reader.readAsArrayBuffer(blob)
  return fileReaderReady(reader)
}

function readBlobAsText(blob) {
  var reader = new FileReader()
  reader.readAsText(blob)
  return fileReaderReady(reader)
}

function responseUrl(xhr) {
  return 'responseUrl' in xhr
    ? xhr.responseUrl
    : (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())
        ? xhr.getResponseHeader('X-Request-URL')
        : ''
      )
}

function decodeFormData(body) {
  var form = new FormData()
  body.trim().split('&').forEach(function(bytes) {
    if (bytes) {
      var split = bytes.split('=')
      var name = split.shift().replace(/\+/g, ' ')
      var value = split.join('=').replace(/\+/g, ' ')
      form.append(decodeURIComponent(name), decodeURIComponent(value))
    }
  })
  return form
}

function parseHeaders(xhr) {
  var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n'),
    headers = {}, index, key, value
  if (!pairs) return headers
  pairs = pairs.split('\u000d\u000a').slice().reverse()
  pairs.forEach(function (header) {
    index = header.indexOf('\u003a\u0020')
    if (index > 0) {
      key = header.substring(0, index)
      value = header.substring(index + 2)
      if (key in headers) {
        headers[key] = value + ', ' + headers[key]
      } else {
        headers[key] = value
      }
    }
  })
  return headers
}

module.exports =
  { Request: Request
  , Body: Body
  , RequestSettings: RequestSettings
  , Response: Response
  , HttpError: HttpError
  , send: curryN(2, send)
  , get: get }
