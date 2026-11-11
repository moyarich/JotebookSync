import "./Search.css";
import type {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

export interface SearchProps extends Omit<
  ComponentPropsWithoutRef<"label">,
  "onChange"
> {
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  icon?: ReactNode;
  inputProps?: ComponentPropsWithoutRef<"input">;
}

export function Search({
  value,
  onChange,
  icon,
  inputProps,
  children,
  ...props
}: SearchProps) {
  return (
    <label data-moyaforge-search="" {...props}>
      {icon}
      <input type="search" value={value} onChange={onChange} {...inputProps} />
      {children}
    </label>
  );
}
