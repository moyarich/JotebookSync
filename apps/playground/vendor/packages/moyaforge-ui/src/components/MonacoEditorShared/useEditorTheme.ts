import { useEffect, useState, type RefObject } from "react";

export function useEditorTheme(
  root: RefObject<HTMLDivElement | null>,
  theme?: string,
) {
  const [automaticTheme, setAutomaticTheme] = useState("vs");
  useEffect(() => {
    if (theme) return;
    const preference = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const scheme = root.current
        ? getComputedStyle(root.current).colorScheme
        : "normal";
      setAutomaticTheme(
        scheme === "dark" || (scheme !== "light" && preference.matches)
          ? "vs-dark"
          : "vs",
      );
    };
    const observer = new MutationObserver(update);
    for (
      let element: Element | null = root.current;
      element;
      element = element.parentElement
    )
      observer.observe(element, {
        attributes: true,
        attributeFilter: ["class", "style", "data-theme"],
      });
    preference.addEventListener("change", update);
    update();
    return () => {
      preference.removeEventListener("change", update);
      observer.disconnect();
    };
  }, [theme]);
  return theme ?? automaticTheme;
}
