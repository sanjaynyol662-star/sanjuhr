import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
import "@/themes.css";
import "@/harmony.css";
import App from "@/App";

// Third-party scripts (Webpushr, GA, emergent platform scripts) can throw
// "Failed to fetch" in restricted preview environments. Those rejections are
// harmless to our app but were surfacing the dev error overlay and blocking
// clicks. Swallow ONLY those third-party network errors.
const isThirdPartyNoise = (val) => {
  const msg = (val && (val.message || val.reason?.message)) || String(val || "");
  const stack = (val && (val.stack || val.reason?.stack)) || "";
  const blob = `${msg} ${stack}`;
  return (
    /Failed to fetch|NetworkError|Load failed/i.test(msg) &&
    /webpushr|emergent-main|cdn\.webpushr|googletagmanager|gtag/i.test(blob)
  );
};
window.addEventListener("unhandledrejection", (e) => {
  if (isThirdPartyNoise(e.reason)) {
    e.preventDefault();
    e.stopImmediatePropagation?.();
  }
});
window.addEventListener(
  "error",
  (e) => {
    if (isThirdPartyNoise(e.error || e)) {
      e.preventDefault();
      e.stopImmediatePropagation?.();
    }
  },
  true
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
