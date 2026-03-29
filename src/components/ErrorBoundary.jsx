import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected runtime error',
    };
  }

  componentDidCatch(error, info) {
    // Keep a console trace for debugging in browser devtools.
    console.error('Weather Dashboard render error:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="state-box error" style={{ marginTop: '20px' }} role="alert">
        <p>Something broke while rendering the dashboard.</p>
        <p>{this.state.message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="btn-primary" type="button" onClick={this.reset}>
            Try Recover
          </button>
          <button className="btn-primary" type="button" onClick={() => window.location.reload()}>
            Hard Refresh
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
