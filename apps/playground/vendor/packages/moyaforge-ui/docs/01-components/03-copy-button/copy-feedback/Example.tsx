import "./Example.css";
import { useState } from "react";
import { CopyButton } from "../../../../src/components/CopyButton/index.js";

export default function CopyButtonFeedback() {
  const [copies, setCopies] = useState(0);
  return (
    <div className="mf-copy-button-feedback-example">
      <CopyButton
        value="Hello, MoyaForge!"
        onCopy={() => setCopies((count) => count + 1)}
      >
        Copy with feedback
      </CopyButton>
      <span role="status">
        Copied {copies} {copies === 1 ? "time" : "times"}
      </span>
    </div>
  );
}
