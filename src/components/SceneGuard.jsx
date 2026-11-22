import { Component, Fragment } from 'react'

/*
  Keeps a WebGL scene on screen. If the scene throws while mounting, or the GPU
  drops its context (memory pressure, driver reset), the scene is rebuilt instead
  of disappearing. Only after repeated failures does it give up (the page then
  simply shows without that scene, still fully usable).
*/
const MAX_RETRIES = 3

export default class SceneGuard extends Component {
  state = { failed: false, key: 0, retries: 0 }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn(`[scene:${this.props.name}] failed, rebuilding`, error)
    this.rebuild(1200)
  }

  componentDidMount() {
    addEventListener('scene:lost', this.onLost)
  }

  componentWillUnmount() {
    removeEventListener('scene:lost', this.onLost)
    clearTimeout(this.timer)
  }

  onLost = (e) => {
    if (e.detail !== this.props.name) return
    console.warn(`[scene:${this.props.name}] WebGL context lost, rebuilding`)
    this.rebuild(400)
  }

  rebuild(delay) {
    clearTimeout(this.timer)
    if (this.state.retries >= MAX_RETRIES) return
    this.timer = setTimeout(() => this.setState((s) => ({ failed: false, key: s.key + 1, retries: s.retries + 1 })), delay)
  }

  render() {
    return this.state.failed ? null : <Fragment key={this.state.key}>{this.props.children}</Fragment>
  }
}
