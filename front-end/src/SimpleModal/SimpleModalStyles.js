import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  wrapper: {
    // marginBottom: "0.8rem",

    "& + &": {
      marginBottom: 0
    },
    display: "inline",
  },

  modalButton: {
    padding: ["0.7rem", "1.8rem"],
    backgroundColor: "#34363a",
    border: 0,
    borderRadius: "0.3rem",
    fontSize: "1rem",
    color: "#fff",
    cursor: "pointer",

    "&:hover": {
      backgroundColor: "#424f63"
    }
  }
});

export default useStyles;

