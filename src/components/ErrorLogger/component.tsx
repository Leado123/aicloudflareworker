import React, { useEffect, useState } from 'react';

/**
 * ErrorLogger component - captures and logs errors in the application
 *
 * This component adds global error handlers to catch unhandled errors and
 * promise rejections that might be causing blank screens or rendering issues.
 */
export function ErrorLogger() {
  const [errors, setErrors] = useState<Array<{message: string; timestamp: Date}>>([]);

  useEffect(() => {
    // Handler for uncaught errors
    const errorHandler = (event: ErrorEvent) => {
      const newError = {
        message: `Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
        timestamp: new Date()
      };
      console.error("ErrorLogger caught:", newError);
      setErrors(prev => [...prev, newError]);
    };

    // Handler for unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const newError = {
        message: `Unhandled Promise: ${event.reason?.message || event.reason || 'Unknown reason'}`,
        timestamp: new Date()
      };
      console.error("ErrorLogger caught promise rejection:", newError);
      setErrors(prev => [...prev, newError]);
    };

    // Add the event listeners
    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    console.log('ErrorLogger: Initialized global error catching');

    // Log React version
    console.log('React version:', React.version);

    // Return cleanup function
    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  // Small widget that shows in development mode
  if (process.env.NODE_ENV === 'development' && errors.length > 0) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 9999,
          backgroundColor: 'rgba(255, 220, 220, 0.95)',
          border: '1px solid #f88',
          borderRadius: '5px',
          padding: '10px',
          maxWidth: '400px',
          maxHeight: '300px',
          overflowY: 'auto',
          fontSize: '12px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h4 style={{ margin: '0 0 5px', color: '#c00' }}>
          Caught Errors: {errors.length}
        </h4>
        <button
          onClick={() => setErrors([])}
          style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            border: 'none',
            background: 'transparent',
            color: '#c00',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Clear
        </button>
        <div>
          {errors.slice(-5).map((error, i) => (
            <div
              key={i}
              style={{
                borderBottom: i < errors.length - 1 ? '1px solid #fcc' : 'none',
                paddingBottom: '5px',
                marginBottom: '5px',
              }}
            >
              <div>{error.message}</div>
              <div style={{ color: '#666', fontSize: '11px' }}>
                {error.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          {errors.length > 5 && (
            <div style={{ fontStyle: 'italic', color: '#666' }}>
              ...and {errors.length - 5} more errors
            </div>
          )}
        </div>
      </div>
    );
  }

  // Component renders nothing visible in production
  return null;
}

export default ErrorLogger;
