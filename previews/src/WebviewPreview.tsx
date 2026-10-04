import { useEffect, useMemo, useRef } from "react";

import { loadHtmlPage, removePageAssets } from "./preview-loader";
import type { PageDefinition } from "./types";

export function WebviewPreview({
  getPage,
}: {
  getPage: () => PageDefinition;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const page = useMemo(getPage, [getPage]);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    loadHtmlPage(host, {
      html: page.html,
      cssUrl: page.cssUrl,
      scriptUrl: page.scriptUrl,
      replacements: page.replacements,
    });

    return () => {
      removePageAssets();
      host.replaceChildren();
    };
  }, [page]);

  return <div ref={hostRef} className="preview-webview-slot" />;
}
