import { app, Config, noEffects } from '../../../src'
import * as Pair from './pair-counter'

function update(action: Pair.Action, state: Pair.State) {
  return noEffects(Pair.update(action, state))
}

const AppConfig: Config<Pair.State, Pair.Action> = {
  view: Pair.view
  , update: update
  , init: Pair.init
  , inputs: []
}

function main() {
  const application = app(AppConfig)
  application.render(document.getElementById('app') as HTMLElement)
}

document.addEventListener('DOMContentLoaded', main)