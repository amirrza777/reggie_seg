import type { InputHTMLAttributes } from "react";
import { FormField } from "./FormField";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function SearchField(props: SearchFieldProps) {
  return <FormField type="search" {...props} />;
}
