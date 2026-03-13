import type { InputHTMLAttributes } from "react";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  subtle?: boolean;
};

export function FormField({ subtle = false, className, ...rest }: FormFieldProps) {
  const classes = ["ui-input", subtle ? "ui-input--subtle" : null, className].filter(Boolean).join(" ");
  return <input className={classes} {...rest} />;
}
