import { expect } from 'chai'
import { application, App } from '../lib'
import { config, State, Action, Increment, Decrement } from './helpers/app'

describe('Jonggrang Core', () => {
  let app: App<State, Action>
  beforeEach(() => {
    app = application(config)
  })
  it('create correct application', () => {
    expect(typeof app.action).to.be.equal('function')
    expect(typeof app.state).to.be.equal('function')
  })
  it('can send action to application', () => {
    let action = app.action
    let state = app.state()
    action(Increment.create())
    expect(app.state()).to.be.equal(state + 1)
    action(Decrement.create())
    expect(app.state()).to.be.equal(state)
  })
})