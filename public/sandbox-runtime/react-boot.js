/**
 * Product-local React artifact boot (external script — parent CSP is script-src 'self').
 * Expects:
 *   window.React / ReactDOM / Babel from claudex-sandbox-runtime.js
 *   <script type="text/plain" id="claudex-artifact-source">…JSX…</script>
 *   <div id="root"></div>
 */
(function () {
  function boot() {
    var React = window.React;
    var ReactDOM = window.ReactDOM;
    var Babel = window.Babel;
    var rootEl = document.getElementById("root");
    var sourceEl = document.getElementById("claudex-artifact-source");
    if (!rootEl) return;
    if (!React || !ReactDOM || !Babel) {
      rootEl.textContent = "Sandbox runtime failed to load.";
      return;
    }
    if (!sourceEl) {
      rootEl.textContent = "Missing artifact source.";
      return;
    }
    var source = sourceEl.textContent || "";
    try {
      var transformed = Babel.transform(source, {
        presets: [
          ["env", { modules: "commonjs" }],
          ["react", { runtime: "classic" }],
          "typescript",
        ],
        filename: "artifact.tsx",
      }).code;
      var module = { exports: {} };
      var exports = module.exports;
      var runner = new Function(
        "React",
        "ReactDOM",
        "exports",
        "module",
        "require",
        transformed +
          "\n;" +
          "if (typeof App !== 'undefined' && (module.exports == null || module.exports === exports || Object.keys(module.exports).length === 0)) {" +
          "  module.exports = App;" +
          "}" +
          "return module.exports;",
      );
      var result = runner(React, ReactDOM, exports, module, function () {
        throw new Error("require() is not available in the product sandbox");
      });
      var Comp = (result && result.default) || result;
      if (Comp && typeof Comp === "object" && Comp.__esModule && Comp.default) {
        Comp = Comp.default;
      }
      if (!Comp) {
        rootEl.textContent =
          "React artifact did not export a component (expected App or default export).";
        return;
      }
      var element = React.createElement(Comp);
      if (ReactDOM.createRoot) {
        ReactDOM.createRoot(rootEl).render(element);
      } else {
        ReactDOM.render(element, rootEl);
      }
    } catch (err) {
      rootEl.innerHTML = "";
      var pre = document.createElement("pre");
      pre.style.cssText =
        "padding:12px;color:#b91c1c;white-space:pre-wrap;font:12px/1.4 ui-monospace,monospace";
      pre.textContent =
        "Unable to render React artifact.\n" +
        (err && err.message ? err.message : String(err));
      rootEl.appendChild(pre);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
