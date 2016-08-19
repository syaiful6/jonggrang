var Task = require('data.task')
var Maybe = require('../data/maybe')
var typeDef = require('../data/type-def')

function isFunction(x) {
  return typeof x === 'function'
}

function BoleanTrue() {
  return true
}

var Request = typeDef('Request', {
  method: isValidRequestMethod
  , url: String
  , headers: Array
  , body: Maybe
  , userName: Maybe.maybe(BoleanTrue, isString) // Maybe String
  , password: Maybe.maybe(BoleanTrue, isString) // Maybe String
})

var RequestSettings = typeDef('RequestSettings', {
  timeout: Number // in miliseconds
  , onStart: Maybe.maybe(BoleanTrue, isFunction) // Maybe Function
  , onProgress: Maybe.maybe(BoleanTrue, isFunction) // Maybe Function
  , withCredentials: Boolean
})

var Response = typeDef('Response', {
  status: Number
  , headers: Array
  , body: BoleanTrue
})

var defaultSettings = RequestSettings(0, Maybe.Nothing(), Maybe.Nothing(), false)
