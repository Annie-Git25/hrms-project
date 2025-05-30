 // src/main.js
import React from 'react';
import ReactDOM from 'react-dom/client'; 
import App from './App.jsx';
import './index.css'; 

// 1. Create the root
const root = ReactDOM.createRoot(document.getElementById('root'));

// 2. Render the app into root
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);