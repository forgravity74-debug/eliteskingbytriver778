import {StrictMode, Component} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean; error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'monospace' }}>
          <div style={{ maxWidth: '600px', background: '#1a1a1a', border: '1px solid #ef4444', borderRadius: '12px', padding: '2rem' }}>
            <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>⚠️ Something went wrong</h1>
            <pre style={{ color: '#fca5a5', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{this.state.error?.message}</pre>
            <pre style={{ color: '#6b7280', fontSize: '0.7rem', marginTop: '1rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{this.state.error?.stack}</pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', background: '#facc15', color: '#000', border: 'none', borderRadius: '8px', padding: '0.5rem 1.5rem', cursor: 'pointer', fontWeight: 'bold' }}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
