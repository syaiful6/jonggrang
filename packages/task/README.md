### Task

Task represent values that depend on time similar to Promise. But Task are *lazy* 
and *monadic* by design, the ```value``` will not there until you ask it, by calling 
```.fork``` method.

It allow us to compose and sequence time-dependent effects using the generic and 
powerful monadic operations.

```javascript
function getRequest(path) {
  return new Task((error, success) => {
    let xhr = new XMLHttpRequest()
    xhr.onerror = () => {
      error(new TypeError('Network request failed'))
    }
    xhr.ontimeout  = () => {
      error(new TypeError('Network request timeout'))
    }
    xhr.onload = () => {
      let body = 'response' in xhr ? xhr.response : xhr.responseText
      success(body)
    }
  })
}

function parseJson(request) {
  return request.map(body => Json.parse(body))
}

parseJson(getRequest('/target-url'))
.fork((error) => {
  // something wrong happen
}, (result) => {
  console.log(result);
})

```