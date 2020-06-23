import React, { useState } from "react";
import PropTypes from "prop-types";
import useStyles from "./SimpleModalStyles";
import Modal from "../Modal/Modal";

const SimpleModal = ({ buttonLabel, children }) => {
  const classes = useStyles();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className={classes.wrapper}>
      <button
        type="button"
        className={classes.modalButton}
        onClick={() => setShowModal(true)}
      >
        {buttonLabel}
      </button>

      {showModal && (
        <Modal onCloseRequest={() => setShowModal(false)}>{children}</Modal>
      )}
    </div>
  );
};

SimpleModal.propTypes = {
  buttonLabel: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]).isRequired
};

export default SimpleModal;

