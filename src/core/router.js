const {stream} = require('mithril/util/stream')

function createLocationStream() {
  var s = stream()
  if (typeof window !== 'undefined') {
    s(getLocation())
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', function () {
      s(getLocation())
    })
  }
  return s
}

function linkHandler(url) {
  return ['onclick', function(parentAction, input) {
    return function(ev) {
      ev.preventDefault()
      if (typeof window !== 'undefined') {
        window.history.pushState({}, document.title, url)
        window.dispatchEvent(new Event('popstate'))
      }
    }
  }]
}

function navigateTo(url) {
  return function() {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, document.title, url)
      window.dispatchEvent(new Event('popstate'))
    }
  }
}

function getLocation() {
  var location = document.location
  return {
    href: location.href
    , host: location.host
    , hostname: location.hostname
    , protocol: location.protocol
    , origin: location.origin
    , port: location.port
    , pathname: location.pathname
    , search: location.search
    , hash: location.hash
    , username: location.username
    , password: location.password
  }
}
