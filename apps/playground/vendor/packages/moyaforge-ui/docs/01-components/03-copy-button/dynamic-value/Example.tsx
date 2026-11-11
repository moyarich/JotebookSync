import "./Example.css";
import { useRef } from "react";
import { CopyButton } from "../../../../src/components/CopyButton/index.js";

export default function CopyButtonDynamicValue() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="mf-copy-button-input-example">
      <input
        ref={input}
        aria-label="Text to copy"
        defaultValue="Edit this text, then copy it"
      />
      <CopyButton getValue={() => input.current?.value ?? ""}>
        Copy input
      </CopyButton>
    </div>
  );
}
