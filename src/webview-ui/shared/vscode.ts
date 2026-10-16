export type VsCodeApi<State> = {
  postMessage(message: unknown): void;
  getState(): State | undefined;
  setState(state: State): State;
};

declare function acquireVsCodeApi<State>(): VsCodeApi<State>;

let cachedApi: VsCodeApi<unknown> | null | undefined;

function getApi(): VsCodeApi<unknown> | null {
  if (cachedApi !== undefined) {
    return cachedApi;
  }

  cachedApi =
    typeof acquireVsCodeApi === "function" ? acquireVsCodeApi<unknown>() : null;

  return cachedApi;
}

/**
 * Creates a typed bridge that uses the VS Code API in production and a browser
 * message shim in the standalone development preview.
 */
export function createVsCodeBridge<Outgoing, Incoming, State>() {
  const api = getApi() as VsCodeApi<State> | null;

  return {
    isConnected: Boolean(api),

    postMessage(message: Outgoing): void {
      if (api) {
        api.postMessage(message);
        return;
      }

      console.info("[webview preview]", message);
    },

    getState(fallback: State): State {
      return api?.getState() ?? fallback;
    },

    setState(state: State): void {
      api?.setState(state);
    },

    onMessage(handler: (message: Incoming) => void): () => void {
      const listener = (event: MessageEvent<unknown>) => {
        if (typeof event.data !== "object" || event.data === null) {
          return;
        }

        handler(event.data as Incoming);
      };

      window.addEventListener("message", listener);
      return () => window.removeEventListener("message", listener);
    },
  };
}
