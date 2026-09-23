import { Component } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, () => this.setState({ hasError: false, error: null }))
      }
      return (
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          fontFamily: 'var(--font-sans)',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}>
          <ShieldCheck size={48} style={{ color: 'var(--danger)' }} />
          <h1 style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480 }}>
            An unexpected error occurred. The civic record keepers have been notified.
          </p>
          {this.state.error && (
            <details style={{ textAlign: 'left', maxWidth: 560, marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
                Technical details
              </summary>
              <pre style={{
                marginTop: 12,
                padding: 12,
                background: 'var(--bg-sunken)',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                overflow: 'auto',
                color: 'var(--text-secondary)',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack && '\n\n' + this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn btn-primary"
            style={{ marginTop: 8 }}
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary