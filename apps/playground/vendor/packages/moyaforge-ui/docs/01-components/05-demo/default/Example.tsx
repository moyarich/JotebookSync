import { Demo } from "../../../../src/components/Demo/Demo.js";
import { CopyButton } from "../../../../src/components/CopyButton/CopyButton.js";

export default function Example() {
  return (
    <Demo>
      <CopyButton value="Hello from MoyaForge">Copy greeting</CopyButton>
    </Demo>
  );
}
