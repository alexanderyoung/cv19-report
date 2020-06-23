import React, { useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import isNil from "lodash/fp/isNil";
import useStyles from "./ModalStyles";

const Modal = ({ onCloseRequest, children }) => {
  const classes = useStyles();
  const modal = useRef(null);

  const handleKeyUp = useCallback(
    e => {
      const keys = {
        27: () => {
          e.preventDefault();
          onCloseRequest();
          window.removeEventListener("keyup", handleKeyUp, false);
        }
      };

      if (keys[e.keyCode]) {
        keys[e.keyCode]();
      }
    },
    [onCloseRequest]
  );

  const handleOutsideClick = useCallback(
    e => {
      if (!isNil(modal)) {
        if (!modal.current.contains(e.target)) {
          onCloseRequest();
          document.removeEventListener("click", handleOutsideClick, false);
        }
      }
    },
    [onCloseRequest]
  );

  useEffect(() => {
    window.addEventListener("keyup", handleKeyUp, false);
    document.addEventListener("click", handleOutsideClick, false);

    return () => {
      window.removeEventListener("keyup", handleKeyUp, false);
      document.removeEventListener("click", handleOutsideClick, false);
    };
  }, [handleKeyUp, handleOutsideClick]);

  return (
    <div className={classes.modalOverlay}>
      <div className={classes.modal} ref={modal}>
        <button
          type="button"
          className={classes.closeButton}
          onClick={onCloseRequest}
        />
        {children}
      </div>
    </div>
  );
};

Modal.propTypes = {
  onCloseRequest: PropTypes.func.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
};

export default Modal;

