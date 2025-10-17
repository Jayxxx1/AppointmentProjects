import ReactDOM from 'react-dom';
import React from 'react';

const ModalPortal = ({ children }) => {
  // Query the DOM at render time to avoid null reference during module load
  if (typeof document === 'undefined') return null;
  const modalRoot = document.getElementById('modal-root') || document.body;
  try {
    // Insert into document.body so modals are outside app containers that might clip fixed elements
    return ReactDOM.createPortal(children, document.body);
  } catch (e) {
    // Fallback: render children inline if portal fails
    // eslint-disable-next-line no-console
    console.error('Modal portal failed, rendering inline:', e?.message || e);
    return React.createElement(React.Fragment, null, children);
  }
};

export default ModalPortal;