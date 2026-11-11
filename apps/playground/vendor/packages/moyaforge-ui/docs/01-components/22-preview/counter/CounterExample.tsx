import "./PreviewExample.css";
import { useState } from "react";

export default function CounterExample() {
  const [count, setCount] = useState(0);
  return (
    <button
      className="mf-preview-example-button"
      type="button"
      onClick={() => setCount((n) => n + 1)}
    >
      Clicked {count} times
    </button>
  );
}
