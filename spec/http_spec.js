var HTTP = require('../http'),
  Body = HTTP.Body

describe('module http', () => {
  describe('Request & Response Body', () => {
    var text, body
    beforeEach((done) => {
      setTimeout(() => {
        text = JSON.stringify({'foo': 'bar'})
        done()
      }, 1)
    })
    it('body can parse json text', (done) => {
      body = Body.Text(text)
      var task = body.json()
      task.fork(function () {
        expect(false).toBe(true) // fail
        done()
      }, function (value) {
        expect(value).toEqual(jasmine.objectContaining({
          foo: 'bar'
        }))
        done()
      })
    })
  })
})
