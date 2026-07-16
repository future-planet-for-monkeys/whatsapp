import { Toaster } from 'react-hot-toast';

/**
 * Pre-configured toast container for the app.
 * Place once at the root of the app tree.
 */
export function ToastContainer(): JSX.Element {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: '8px',
          background: '#333',
          color: '#fff',
          fontSize: '14px',
        },
        error: {
          duration: 4000,
          style: {
            background: '#dc3545',
          },
        },
        success: {
          style: {
            background: '#128c7e',
          },
        },
      }}
    />
  );
}