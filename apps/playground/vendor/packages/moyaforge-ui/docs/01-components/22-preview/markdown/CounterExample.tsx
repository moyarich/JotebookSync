import { useState } from "react";
import "./CounterExample.css";

export default function CounterExample() {
  const [count, setCount] = useState(0);
  return (
    <button
      className="mf-markdown-counter"
      type="button"
      onClick={() => setCount((current) => current + 1)}
    >
      Clicked {count} times
    </button>
  );
}
