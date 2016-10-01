# Jonggrang Core

This library provide a way to manage state on your application as well how to update
it using ```action message```, similiar to Elm application does. Unlike Redux, it capable
manage side effects and doesn't have concept middleware.

It manage effects via Task, similiar to Promise. The difference is, it *lazy* and *monadic*.

The core function of this library is ```application```, this function expect an object
with key:

- update: a function that accept an action and current state and return EffModel
- init: The initial state of the application
- subscription: a function that accept current state and return EffModel
- EffModel is an object that have key state, and effects. The effects are an array
  of Task, we will fork it and the result will feed back to update function. When
  returned by update function, the state field is used as application current state.

```application``` function return an object with field:
- state: a stream of state
- action: a stream that can be used to send action message to the application.

