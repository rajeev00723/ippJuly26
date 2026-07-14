import '@backstage/cli/asset-types';
import './design-system/globals.css';
import React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App';

// react-dom/client is not in Backstage's federation shared scope — importing
// it as a local module collides with react-router-dom's module ID in the
// vendor chunk. Use the shared react-dom entry and its createRoot shim instead.
const anyDOM = ReactDOM as any;
if (anyDOM.createRoot) {
  anyDOM.createRoot(document.getElementById('root')!).render(<App />);
} else {
  anyDOM.render(<App />, document.getElementById('root')!);
}
