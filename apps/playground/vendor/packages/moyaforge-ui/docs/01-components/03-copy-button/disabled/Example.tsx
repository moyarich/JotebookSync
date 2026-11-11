import { CopyButton } from "../../../../src/components/CopyButton/index.js";

export default function CopyButtonDisabled() {
  return (
    <CopyButton value="Unavailable content" disabled>
      Copy unavailable
    </CopyButton>
  );
}
