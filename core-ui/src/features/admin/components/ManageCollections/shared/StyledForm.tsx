// components/shared/StyledForm.tsx

import { styled } from "@mui/material";

export const StyledForm = styled("form")(({ theme }) => ({
  "& .form-group": {
    marginBottom: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
  },
  "& label": {
    marginBottom: theme.spacing(0.5),
  },
  "& input, & select": {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  "& .MuiFormControl-root": {
    marginBottom: theme.spacing(2),
  },
  "& button": {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    border: "none",
    borderRadius: theme.shape.borderRadius,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
      backgroundColor: theme.palette.action.disabled,
    },
  },
  "& .delete-button": {
    backgroundColor: theme.palette.error.main,
    "&:hover": {
      backgroundColor: theme.palette.error.dark,
    },
  },
}));