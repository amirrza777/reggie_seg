import type { InputHTMLAttributes } from "react";

type BaseFieldProps<TName extends string> = {
  name: TName;
  label: string;
  value: string;
  onChange: (name: TName, value: string) => void;
} & Pick<InputHTMLAttributes<HTMLInputElement>, "type" | "required" | "placeholder" | "minLength">;

export function AuthField<TName extends string>({
  name,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  minLength,
}: BaseFieldProps<TName>) {
  return (
    <div className="auth-field">
      <label className="auth-label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        className="auth-input"
        type={type}
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        onChange={(e) => onChange(name, e.target.value)}
      />
    </div>
  );
}
