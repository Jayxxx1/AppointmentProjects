import ReactDOM from 'react-dom';

const modalRoot = document.getElementById('modal-root');

const ModalPortal = ({ children }) => {
  return ReactDOM.createPortal(children, modalRoot);
};

export default ModalPortal;