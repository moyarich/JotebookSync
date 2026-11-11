import { version } from "../../../vendor/packages/moyaforge/package.json";

export function VersionPicker({
  versions = [{ label: `v${version} (current)`, value: version }],
  current = version,
}) {
  return (
    <label className="playground-version-picker">
      <span>Documentation</span>
      <select
        aria-label="Documentation version"
        value={current}
        disabled={versions.length < 2}
        onChange={(event) => {
          const target = versions.find(
            (item) => item.value === event.target.value,
          );
          if (target?.href) window.location.assign(target.href);
        }}
      >
        {versions.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
