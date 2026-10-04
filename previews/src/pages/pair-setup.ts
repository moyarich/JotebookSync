import pairSetupHtml from "../../../src/webview-ui/pair-setup/template.html?raw";
import pairSetupCssUrl from "../../../src/webview-ui/pair-setup/styles.css?url";
import pairSetupScriptUrl from "../../../src/webview-ui/pair-setup/index.ts?url";
import type { PageDefinition } from "../types";

const pairSetupData = {
  title: "Configure Paired Files",
  heading: "Configure paired files",
  description: "Choose the file types you want to keep in sync.",
  selectedPath: "/example/README.md",
  submitLabel: "Create pair",
  sourceFormat: "md",
  options: [
    {
      id: "ipynb",
      rawFormat: "ipynb",
      description: "Jupyter Notebook",
      detail: "Creates README.ipynb.",
      formatName: "ipynb",
      customSuffix: "",
      isSelected: true,
      isSourceFormat: false,
      isNotebook: true,
      isExisting: true,
      requiresCustomSuffix: false,
    },
    {
      id: "md",
      rawFormat: "md",
      description: "Markdown file (.md)",
      detail:
        "Uses README.md as the Markdown file in this pair. It already exists and is not recreated.",
      formatName: "md",
      customSuffix: "",
      isSelected: true,
      isSourceFormat: true,
      isNotebook: false,
      isExisting: true,
      requiresCustomSuffix: false,
    },
    {
      id: "percent",
      rawFormat: "py:percent",
      description: "Python percent script",
      detail: "Creates README.percent.py.",
      formatName: "percent",
      customSuffix: ".percent.py",
      isSelected: false,
      isSourceFormat: false,
      isNotebook: false,
      isExisting: false,
      requiresCustomSuffix: true,
      isAdvanced: true,
    },
    {
      id: "light",
      rawFormat: "py:light",
      description: "Python light script",
      detail: "Creates README.light.py.",
      formatName: "light",
      customSuffix: ".light.py",
      isSelected: false,
      isSourceFormat: false,
      isNotebook: false,
      isExisting: false,
      requiresCustomSuffix: true,
      isAdvanced: true,
    },
  ],
};

export function getPairSetupPage(): PageDefinition {
  return {
    kind: "webview",
    title: pairSetupData.title,
    html: pairSetupHtml,
    cssUrl: pairSetupCssUrl,
    scriptUrl: pairSetupScriptUrl,
    replacements: {
      title: pairSetupData.title,
      heading: pairSetupData.heading,
      description: pairSetupData.description,
      selectedPath: pairSetupData.selectedPath,
      submitLabel: pairSetupData.submitLabel,
      setupData: JSON.stringify(pairSetupData),
    },
  };
}
