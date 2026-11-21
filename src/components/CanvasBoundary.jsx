import { Component } from 'react'

// If a WebGL scene fails (no context, lost GPU), render nothing — the page stays plain HTML.
export default class CanvasBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error) {
    if (import.meta.env.DEV) console.warn('3D scene disabled:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
