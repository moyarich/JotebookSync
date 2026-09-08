// @vitest-environment happy-dom
import Mustache from "mustache";
import { beforeEach, expect, test, vi } from "vitest";
import template from "../../webviews-ui/src/webviews/convert-file/template.html?raw";
import type { PostedMessage } from "./support/freshness-harness.js";

let messages: PostedMessage[];

beforeEach(async () => {
  vi.resetModules();
  messages = [];
  const data = {
    sourcePath: "/example/analysis.ipynb",
    initialFormat: "py:percent",
    initialOutputPath: "/example/analysis.py",
    formats: [
      { value: "py:percent", description: "Python percent script" },
      { value: "md:myst", description: "MyST Markdown" },
    ],
  };
  document.documentElement.innerHTML = Mustache.render(
    template.replace(/<link[^>]+>/, ""),
    {
      title: "Convert File to Another Format",
      convertData: JSON.stringify(data),
    },
  );
  Object.assign(globalThis, {
    acquireVsCodeApi: () => ({
      postMessage: (message: PostedMessage) => messages.push(message),
      getState: () => undefined,
      setState: vi.fn(),
    }),
  });
  await import("../../webviews-ui/src/webviews/convert-file/index.js");
});

test("updates the default destination and submits one conversion", () => {
  const format = document.querySelector<HTMLSelectElement>("#format")!;
  const output = document.querySelector<HTMLInputElement>("#outputPath")!;

  format.value = "md:myst";
  format.dispatchEvent(new Event("change"));
  expect(output.value).toBe("/example/analysis.md");

  document.querySelector<HTMLFormElement>("#convertForm")!.requestSubmit();
  expect(messages.at(-1)).toEqual({
    command: "submitConvert",
    toFormat: "md:myst",
    outputPath: "/example/analysis.md",
  });
});

test("supports custom Jupytext format codes", () => {
  const format = document.querySelector<HTMLSelectElement>("#format")!;
  format.value = "__custom__";
  format.dispatchEvent(new Event("change"));

  const custom = document.querySelector<HTMLInputElement>("#customFormat")!;
  custom.value = "jl:percent";
  custom.dispatchEvent(new Event("input"));

  document.querySelector<HTMLFormElement>("#convertForm")!.requestSubmit();
  expect(messages.at(-1)).toMatchObject({
    command: "submitConvert",
    toFormat: "jl:percent",
    outputPath: "/example/analysis.jl",
  });
});
