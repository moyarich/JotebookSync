import { Search } from "../../../../src/components/Search/Search.js";

export default function Example() {
  return (
    <Search
      inputProps={{
        placeholder: "Search documentation",
        "aria-label": "Search documentation",
      }}
    />
  );
}
