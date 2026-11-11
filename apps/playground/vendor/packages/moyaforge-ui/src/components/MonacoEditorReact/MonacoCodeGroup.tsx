import {
  MonacoEditorReact,
  type MonacoEditorReactProps,
} from "./MonacoEditorReact.js";

export interface MonacoCodeGroupProps extends MonacoEditorReactProps {
  /** Compatibility shorthand; readOnly takes precedence when both are supplied. */
  editable?: boolean;
}
export function MonacoCodeGroup({
  editable = false,
  readOnly,
  ...props
}: MonacoCodeGroupProps) {
  return <MonacoEditorReact {...props} readOnly={readOnly ?? !editable} />;
}
