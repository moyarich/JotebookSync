import { Copy } from "lucide-react";
import { CopyButton } from "../../../../src/components/CopyButton/index.js";

export default function CopyButtonWithIcon() {
  return (
    <CopyButton
      value="Hello, MoyaForge!!"
      icon={<Copy size={16} aria-hidden="true" />}
    >
      Copy text
    </CopyButton>
  );
}
