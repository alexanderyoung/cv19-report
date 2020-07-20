import { createUseStyles } from "react-jss";

const useStyles = createUseStyles({
  // Global styles
  "@global": {
    html: {
      fontFamily: "'Lato', sans-serif",
      fontSize: "17px",
      boxSizing: "border-box"
    },

    "*, *:before, *:after": {
      boxSizing: "inherit"
    },

    body: {
      backgroundColor: "#fff",
      color: "#424f63",
      fontWeight: "normal",
      fontSize: "1rem",
      lineHeight: "1.5",
			"@media (min-width: 768px)": {
				padding: "1.5rem"
			},

			"@media (max-width: 768px)": {
				padding: "2px"
			},
    },

    h1: {
      margin: [0, 0, "1.2rem"],
      paddingBottom: "0.8rem",
      borderBottom: "1px solid #424f63"
    },

    "h1, h2, h3, h4, h5, h6": {
      fontFamily: "'Raleway', sans-serif",
      lineHeight: 1.1,
      marginTop: 0,
      fontWeight: "normal",
      textTransform: "uppercase"
    },

    header: {
      marginBottom: "2rem"
    },

    a: {
      color: "#568db2"
    },

    "a:hover": {
      color: "#466d87"
    },

    "input, button": {
      fontFamily: "inherit",
      margin: "5px"
    },

    figure: {
      margin: 0,
      position: "relative"
    },

    figcaption: {
      position: "absolute",
      color: "#fff",
      bottom: 0,
      left: 0,
      right: 0,
      padding: "0.4rem",
      fontSize: "0.8rem",
      opacity: 0.8,

      "& a": {
        color: "#fff"
      },

      "& a:hover": {
        color: "#fff",
        opacity: 0.8
      }
    },

    img: {
      display: "block",
      maxWidth: "100%",
      height: "auto"
    },
	},


  banner: {
    maxWidth: "35rem"
  }
});

export default useStyles;

