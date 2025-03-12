import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Error boundary component to catch rendering errors
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to the console
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          padding: '20px',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ color: '#d32f2f' }}>Something went wrong</h1>
          <p>The application encountered an error during rendering.</p>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '4px',
            maxWidth: '800px',
            overflow: 'auto'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '10px 15px',
              background: '#606C38',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrap the App component in an error boundary
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Root element with id 'root' not found");
  }
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
  
  // Log successful mount
  console.log("React application mounted successfully");
} catch (error) {
  console.error("Failed to mount React application:", error);
  
  // Display error in DOM if React fails to mount
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; font-family: sans-serif;">
        <h1 style="color: #d32f2f;">Failed to Start Application</h1>
        <p>There was a problem initializing the application.</p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; max-width: 800px; overflow: auto;">
          ${error instanceof Error ? error.toString() : String(error)}
        </pre>
        <button 
          onclick="window.location.reload()" 
          style="margin-top: 20px; padding: 10px 15px; background: #606C38; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Application
        </button>
      </div>
    `;
  }
} 