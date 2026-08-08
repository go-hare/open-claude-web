/**
 * Product-local sandbox frame host — residual protocol + official UI classes.
 *
 * Protocol (claudeusercontent p6e / A4e, index-BELzQL5P + chunk 3817):
 *   parent → { type: "__sandbox_handshake__" } + MessageChannel port2
 *   frame  → port request ReadyForContent
 *   parent → window postMessage SetContent (SandboxContent MIME)
 *   frame  → window postMessage response
 *
 * UI classes from official:
 *   3817 MermaidRenderer loading / error / data-mermaid + Toggle fullscreen
 *   65255 zoom chrome (absolute bottom-2 right-2 … border-[#636d83a0])
 *   Spinner md: h-20 w-20 border-8 …
 *
 * C-slice paint: text/html | image/svg+xml | application/vnd.ant.mermaid | application/vnd.ant.react
 * Never loads remote claudeusercontent.com.
 *
 * Package bridge (not invent chrome): local mermaid.min.js + react runtime asset;
 * pan/zoom = residual react-zoom-pan-pinch shipped as ./react-zoom-pan-pinch.iife.js
 * (OfficialSandboxZoom = TransformWrapper / TransformComponent / useControls).
 */
(function () {
  "use strict";

  var A4e = {
    ReadyForContent:
      "anthropic.claude.usercontent.sandbox.ReadyForContent",
    SetContent: "anthropic.claude.usercontent.sandbox.SetContent",
    ReportError: "anthropic.claude.usercontent.sandbox.ReportError",
    DOMContentLoaded:
      "anthropic.claude.usercontent.sandbox.DOMContentLoaded",
    BroadcastContentSize:
      "anthropic.claude.usercontent.sandbox.BroadcastContentSize",
  };

  var XM = {
    Html: "text/html",
    Svg: "image/svg+xml",
    Mermaid: "application/vnd.ant.mermaid",
    React: "application/vnd.ant.react",
  };

  var EMPTY = {
    "@type": "type.googleapis.com/google.protobuf.Empty",
  };

  // Residual 3817 themeVariables c (light) / d (dark)
  var THEME_LIGHT = {
    darkMode: false,
    background: "#f5f4ef",
    primaryColor: "#e8e6df",
    secondaryColor: "#f5f4ef",
    tertiaryColor: "#d9d6cc",
    primaryTextColor: "#131311",
    secondaryTextColor: "#3c3c38",
    tertiaryTextColor: "#6f6f69",
    primaryBorderColor: "#d9d6cc",
    secondaryBorderColor: "#e8e6df",
    tertiaryBorderColor: "#f5f4ef",
    edgeLabelBackground: "#f5f4ef",
    lineColor: "#6f6f69",
    textColor: "#131311",
    pie1: "#da7756",
    pie2: "#4a90d9",
    pie3: "#7c5cba",
    pie4: "#5a9a32",
    pie5: "#c94a4a",
    pie6: "#c9871e",
    pieStrokeColor: "#e8e6df",
    pieOuterStrokeColor: "#e8e6df",
    fillType0: "#da7756",
    fillType1: "#4a90d9",
    fillType2: "#7c5cba",
    fillType3: "#5a9a32",
    fillType4: "#c94a4a",
    fillType5: "#c9871e",
    fillType6: "#6f6f69",
    fillType7: "#d9d6cc",
  };

  var THEME_DARK = {
    darkMode: true,
    background: "#1f1e1d",
    primaryColor: "#2f2e2c",
    secondaryColor: "#252423",
    tertiaryColor: "#3c3b39",
    primaryTextColor: "#f5f4ef",
    secondaryTextColor: "#c4bfb3",
    tertiaryTextColor: "#6f6f69",
    primaryBorderColor: "#4a4845",
    secondaryBorderColor: "#3c3b39",
    tertiaryBorderColor: "#2f2e2c",
    edgeLabelBackground: "#1f1e1d",
    lineColor: "#6f6f69",
    textColor: "#f5f4ef",
    pie1: "#da7756",
    pie2: "#4a90d9",
    pie3: "#9a7dd4",
    pie4: "#6abf3b",
    pie5: "#e06666",
    pie6: "#d9a033",
    pieStrokeColor: "#2f2e2c",
    pieOuterStrokeColor: "#2f2e2c",
    fillType0: "#da7756",
    fillType1: "#4a90d9",
    fillType2: "#9a7dd4",
    fillType3: "#6abf3b",
    fillType4: "#e06666",
    fillType5: "#d9a033",
    fillType6: "#6f6f69",
    fillType7: "#3c3b39",
  };

  // Official lucide paths from claudeusercontent chunk 6012 (ZoomIn/Out, Maximize2/Minimize2)
  var ICON_ZOOM_IN =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';
  var ICON_ZOOM_OUT =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>';
  var ICON_MAXIMIZE2 =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>';
  var ICON_MINIMIZE2 =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/></svg>';

  // Residual 65255 Button className (no invent helper tokens)
  var BTN_CLASS =
    "flex !h-7 !w-7 items-center justify-center !border-0 !bg-transparent !px-0 !text-[#636D83] !shadow-none hover:!bg-[#3338421f]";

  // Residual 65255 root className (non-fs / fs prefix swapped at runtime)
  var ROOT_CLASS_REST =
    " [&>.react-transform-wrapper>.react-transform-component]:flex" +
    " [&>.react-transform-wrapper>.react-transform-component]:h-full" +
    " [&>.react-transform-wrapper>.react-transform-component]:w-full" +
    " [&>.react-transform-wrapper>.react-transform-component]:cursor-move" +
    " [&>.react-transform-wrapper>.react-transform-component]:items-center" +
    " [&>.react-transform-wrapper>.react-transform-component]:justify-center" +
    " [&>.react-transform-wrapper>.react-transform-component]:p-4" +
    " [&>.react-transform-wrapper]:h-full" +
    " [&>.react-transform-wrapper]:w-full";

  var port = null;
  /** Residual 3817 useId stand-in for mermaid-artifact-${id} (frame is not React MermaidRenderer). */
  var mermaidDiagramSeq = 0;
  var parentOrigin = "*";
  var mermaidPromise = null;
  var reactRuntimePromise = null;
  var zoomRuntimePromise = null;
  var currentTheme = "light";
  /** Keep last React root so remounts unmount cleanly. */
  var activeReactRoot = null;

  function qsTheme() {
    try {
      var t = new URLSearchParams(location.search).get("theme");
      return t === "dark" ? "dark" : "light";
    } catch (_) {
      return "light";
    }
  }

  function qsParentOrigin() {
    try {
      return new URLSearchParams(location.search).get("parentOrigin") || "*";
    } catch (_) {
      return "*";
    }
  }

  function applyTheme(theme) {
    currentTheme = theme === "dark" ? "dark" : "light";
    if (currentTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }

  function bgColor() {
    return currentTheme === "dark" ? "#1f1e1d" : "#f5f4ef";
  }

  function themeVars() {
    return currentTheme === "dark" ? THEME_DARK : THEME_LIGHT;
  }

  function rootEl() {
    return document.getElementById("root");
  }

  /** Residual requestId: Date.now().toString() only. */
  function requestId() {
    return Date.now().toString();
  }

  function residualRootClass(isFs) {
    return (isFs ? "fixed inset-0 z-50" : "h-screen w-full") + ROOT_CLASS_REST;
  }

  /** Residual frame → host request on MessageChannel port. */
  function sendPortRequest(method, payload) {
    if (!port) return;
    try {
      port.postMessage({
        channel: "request",
        method: method,
        requestId: requestId(),
        payload: payload || EMPTY,
      });
    } catch (_) {}
  }

  function postWindowResponse(requestId, status, payload, source, origin) {
    var response = {
      channel: "response",
      status: status,
      requestId: requestId,
      payload: payload,
    };
    // Residual: post to event.origin; prefer parentOrigin from query/handshake.
    var target =
      origin && origin !== "null"
        ? origin
        : parentOrigin && parentOrigin !== "*"
          ? parentOrigin
          : "*";
    try {
      source.postMessage(response, target);
    } catch (_) {
      try {
        if (parentOrigin && parentOrigin !== "*") {
          source.postMessage(response, parentOrigin);
        }
      } catch (__) {}
    }
  }

  function unmountActiveReact() {
    if (activeReactRoot && activeReactRoot.unmount) {
      try {
        activeReactRoot.unmount();
      } catch (_) {}
    }
    activeReactRoot = null;
  }

  /** Official Spinner size="md": h-20 w-20 border-8 … */
  function paintLoading() {
    var el = rootEl();
    if (!el) return;
    unmountActiveReact();
    var g = bgColor();
    el.innerHTML =
      '<div class="flex h-full w-full items-center justify-center" aria-busy="true" style="background-color:' +
      g +
      ';min-height:100vh">' +
      '<div class="h-20 w-20 border-8 border-border-200 text-secondary inline-block animate-spin rounded-full border-solid border-r-transparent align-[-0.125em] motion-reduce:animate-none" role="status">' +
      '<span class="sr-only">Loading...</span></div></div>';
  }

  /** Official MermaidRenderer error pre classes. */
  function paintError(sourceText) {
    var el = rootEl();
    if (!el) return;
    unmountActiveReact();
    var g = bgColor();
    var color = themeVars().primaryTextColor;
    var pre = document.createElement("pre");
    pre.className =
      "h-full w-full overflow-auto whitespace-pre-wrap p-4 font-mono text-sm";
    pre.style.backgroundColor = g;
    pre.style.color = color;
    pre.style.minHeight = "100vh";
    pre.style.margin = "0";
    pre.textContent = sourceText || "";
    el.innerHTML = "";
    el.appendChild(pre);
  }

  function reexecuteScripts(container) {
    if (!container) return;
    var scripts = container.querySelectorAll("script");
    for (var i = 0; i < scripts.length; i++) {
      var old = scripts[i];
      var s = document.createElement("script");
      for (var j = 0; j < old.attributes.length; j++) {
        var attr = old.attributes[j];
        s.setAttribute(attr.name, attr.value);
      }
      s.textContent = old.textContent;
      if (old.parentNode) old.parentNode.replaceChild(s, old);
    }
  }

  /**
   * C-slice Html paint (package bridge).
   * Residual UCR may nest a document iframe for full HTML; product paints body into root.
   * No invent host class tokens.
   */
  function paintHtml(content) {
    var el = rootEl();
    if (!el) return;
    unmountActiveReact();
    el.innerHTML = "";
    var trimmed = (content || "").trim();
    // Residual root id: #artifacts-component-root-html
    var host = document.createElement("div");
    host.id = "artifacts-component-root-html";
    host.style.minHeight = "100vh";
    host.style.boxSizing = "border-box";
    host.style.background = bgColor();
    host.style.color = themeVars().primaryTextColor;
    if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
      var bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      host.innerHTML = bodyMatch ? bodyMatch[1] : trimmed;
    } else {
      host.innerHTML = trimmed;
    }
    el.appendChild(host);
    reexecuteScripts(host);
  }

  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (mermaidPromise) return mermaidPromise;
    mermaidPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "./mermaid.min.js";
      s.onload = function () {
        if (window.mermaid) resolve(window.mermaid);
        else reject(new Error("mermaid global missing"));
      };
      s.onerror = function () {
        reject(new Error("Failed to load mermaid.min.js"));
      };
      document.head.appendChild(s);
    });
    return mermaidPromise;
  }

  function loadReactRuntime() {
    if (window.React && window.ReactDOM && window.Babel) {
      return Promise.resolve();
    }
    if (reactRuntimePromise) return reactRuntimePromise;
    reactRuntimePromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      // Package-bridge React/Babel runtime (local asset; residual UCR ships own chunks)
      s.src = "./claudex-sandbox-runtime.js";
      s.onload = function () {
        if (window.React && window.ReactDOM && window.Babel) resolve();
        else reject(new Error("Sandbox runtime missing globals"));
      };
      s.onerror = function () {
        reject(new Error("Failed to load sandbox runtime"));
      };
      document.head.appendChild(s);
    });
    return reactRuntimePromise;
  }

  /**
   * Residual 65255 pan/zoom library (react-zoom-pan-pinch).
   * Loaded after React is on window; exposes OfficialSandboxZoom IIFE.
   */
  function loadZoomRuntime() {
    if (
      window.OfficialSandboxZoom &&
      window.OfficialSandboxZoom.TransformWrapper
    ) {
      return Promise.resolve(window.OfficialSandboxZoom);
    }
    if (zoomRuntimePromise) return zoomRuntimePromise;
    zoomRuntimePromise = loadReactRuntime().then(function () {
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = "./react-zoom-pan-pinch.iife.js";
        s.onload = function () {
          if (
            window.OfficialSandboxZoom &&
            window.OfficialSandboxZoom.TransformWrapper
          ) {
            resolve(window.OfficialSandboxZoom);
          } else {
            reject(new Error("OfficialSandboxZoom missing"));
          }
        };
        s.onerror = function () {
          reject(new Error("Failed to load react-zoom-pan-pinch.iife.js"));
        };
        document.head.appendChild(s);
      });
    });
    return zoomRuntimePromise;
  }

  function IconHtml(React, html) {
    return React.createElement("span", {
      "aria-hidden": "true",
      style: { display: "inline-flex", lineHeight: 0 },
      dangerouslySetInnerHTML: { __html: html },
    });
  }

  /**
   * Residual 65255 chrome `u` + host `h` (ZoomPanHost).
   * TransformWrapper props ONLY { doubleClick: { disabled: false } }.
   */
  function buildZoomPanComponents(React, zoom) {
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useCallback = React.useCallback;
    var createElement = React.createElement;
    var TransformWrapper = zoom.TransformWrapper;
    var TransformComponent = zoom.TransformComponent;
    var useControls = zoom.useControls;

    function ZoomChrome() {
      var controls = useControls();
      var zoomIn = controls.zoomIn;
      var zoomOut = controls.zoomOut;
      var fsState = useState(false);
      var isFs = fsState[0];
      var setFs = fsState[1];
      var toggle = useCallback(function () {
        var doc = document;
        var root = doc.documentElement;
        if (doc.fullscreenElement) {
          if (doc.exitFullscreen) {
            doc.exitFullscreen();
            setFs(false);
          }
        } else {
          root.requestFullscreen && root.requestFullscreen();
          setFs(true);
        }
      }, []);
      var label = isFs ? "Exit full screen" : "Enter full screen";
      function sep() {
        return createElement(
          "div",
          { className: "h-[0.5px] w-full px-1" },
          createElement("hr", {
            className: "border-b-[0.5px] border-t-0 border-[#636D83a0]",
          }),
        );
      }
      function btn(aria, title, onClick, icon) {
        return createElement(
          "button",
          {
            type: "button",
            className: BTN_CLASS,
            "aria-label": aria,
            title: title,
            onClick: function (e) {
              e.preventDefault();
              onClick(e);
            },
          },
          IconHtml(React, icon),
        );
      }
      return createElement(
        "div",
        { className: "absolute bottom-2 right-2 z-10 flex flex-col" },
        createElement(
          "div",
          {
            className:
              "flex flex-col gap-0.5 rounded-md border-[0.5px] border-[#636d83a0] p-0.5",
          },
          btn("Zoom in", "Zoom in", function () {
            zoomIn();
          }, ICON_ZOOM_IN),
          sep(),
          btn("Zoom out", "Zoom out", function () {
            zoomOut();
          }, ICON_ZOOM_OUT),
          sep(),
          btn(label, label, toggle, isFs ? ICON_MINIMIZE2 : ICON_MAXIMIZE2),
        ),
      );
    }

    /**
     * Residual 65255 h: root class + TransformWrapper(doubleClick:{disabled:false})
     * children: [chrome u, TransformComponent(children)]
     */
    function ZoomPanHost(props) {
      var children = props.children;
      var style = props.style || {};
      var fsState = useState(!!document.fullscreenElement);
      var isFs = fsState[0];
      var setFs = fsState[1];
      useEffect(function () {
        function onFs() {
          setFs(!!document.fullscreenElement);
        }
        document.addEventListener("fullscreenchange", onFs);
        return function () {
          document.removeEventListener("fullscreenchange", onFs);
        };
      }, []);
      return createElement(
        "div",
        { className: residualRootClass(isFs), style: style },
        createElement(
          TransformWrapper,
          // Residual only: doubleClick:{disabled:!1}
          { doubleClick: { disabled: false } },
          createElement(ZoomChrome, null),
          createElement(TransformComponent, null, children),
        ),
      );
    }

    return { ZoomPanHost: ZoomPanHost };
  }

  function renderWithZoomPan(childrenFactory) {
    var el = rootEl();
    if (!el) return Promise.resolve();
    return loadZoomRuntime().then(function (zoom) {
      var React = window.React;
      var ReactDOM = window.ReactDOM;
      unmountActiveReact();
      el.innerHTML = "";
      var mount = document.createElement("div");
      mount.style.height = "100%";
      mount.style.width = "100%";
      mount.style.minHeight = "100vh";
      el.appendChild(mount);
      var comps = buildZoomPanComponents(React, zoom);
      var tree = childrenFactory(React, comps.ZoomPanHost);
      if (ReactDOM.createRoot) {
        activeReactRoot = ReactDOM.createRoot(mount);
        activeReactRoot.render(tree);
      } else {
        ReactDOM.render(tree, mount);
        activeReactRoot = {
          unmount: function () {
            ReactDOM.unmountComponentAtNode(mount);
          },
        };
      }
    });
  }

  /**
   * Residual Svg: ZoomPanHost + #artifacts-component-root-svg only
   * (no data-mermaid, no Toggle fullscreen sibling).
   */
  function paintSvg(content) {
    var g = bgColor();
    var svg = (content || "").trim();
    if (!/^<svg[\s>]/i.test(svg)) {
      svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        svg +
        "</svg>";
    }
    if (!/xmlns=/.test(svg)) {
      svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return renderWithZoomPan(function (React, ZoomPanHost) {
      var createElement = React.createElement;
      return createElement(
        ZoomPanHost,
        { style: { backgroundColor: g } },
        createElement("div", {
          id: "artifacts-component-root-svg",
          className: "h-full w-full",
          dangerouslySetInnerHTML: { __html: svg },
        }),
      );
    }).catch(function (err) {
      paintError(
        "Unable to render SVG.\n" +
          (err && err.message ? err.message : String(err)) +
          "\n\n" +
          (content || ""),
      );
      throw err;
    });
  }

  /**
   * Residual Mermaid success (3817 MermaidRenderer children of 65255 i.g):
   * ZoomPanHost >
   *   TransformWrapper >
   *     chrome u
   *     TransformComponent >
   *       div[data-mermaid] residual class
   *       button Toggle fullscreen (empty, semi-transparent)
   */
  function paintMermaidSvg(svgMarkup) {
    var g = bgColor();
    var theme = currentTheme;
    return renderWithZoomPan(function (React, ZoomPanHost) {
      var createElement = React.createElement;
      var useCallback = React.useCallback;
      function ToggleFullscreen() {
        var onClick = useCallback(function () {
          if (document.fullscreenElement) {
            document.exitFullscreen && document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen &&
              document.documentElement.requestFullscreen();
          }
        }, []);
        return createElement("button", {
          type: "button",
          onClick: onClick,
          "aria-label": "Toggle fullscreen",
          className: "absolute bottom-2 right-2 z-10 rounded-md px-2 py-1",
          style: {
            backgroundColor:
              theme === "dark"
                ? "rgba(47, 46, 44, 0.5)"
                : "rgba(217, 214, 204, 0.5)",
            color: "#6f6f69",
          },
        });
      }
      return createElement(
        ZoomPanHost,
        { style: { backgroundColor: g } },
        createElement("div", {
          // residual data-mermaid boolean presence
          "data-mermaid": true,
          className:
            "relative [contain:paint] flex max-h-full max-w-full grow items-center justify-center self-stretch [&>svg]:max-h-full [&>svg]:max-w-full",
          style: { backgroundColor: g },
          dangerouslySetInnerHTML: { __html: svgMarkup || "" },
        }),
        createElement(ToggleFullscreen, null),
      );
    });
  }

  function paintMermaidSource(content) {
    paintLoading();
    return loadMermaid()
      .then(function (mermaid) {
        var vars = themeVars();
        // Residual 3817 a.Hw options — no securityLevel
        mermaid.initialize({
          startOnLoad: false,
          htmlLabels: false,
          maxTextSize: 2e4,
          maxEdges: 400,
          theme: "base",
          themeVariables: Object.assign(
            { fontFamily: "monospace", fontSize: "14px" },
            vars,
          ),
        });
        // Residual 3817: mermaid-artifact-${useId().replace(/[^a-zA-Z0-9]/g,"")}
        // Frame host is not the React MermaidRenderer; monotic :rN: matches useId sanitize shape.
        mermaidDiagramSeq += 1;
        var id =
          "mermaid-artifact-" +
          (":r" + mermaidDiagramSeq + ":").replace(/[^a-zA-Z0-9]/g, "");
        return mermaid.render(id, content || "");
      })
      .then(function (result) {
        var svg = typeof result === "string" ? result : result && result.svg;
        return paintMermaidSvg(svg || "");
      })
      .catch(function () {
        paintError(content || "");
        throw new Error("Unable to render diagram.");
      });
  }

  function paintReact(source) {
    paintLoading();
    return loadReactRuntime().then(function () {
      var React = window.React;
      var ReactDOM = window.ReactDOM;
      var Babel = window.Babel;
      var el = rootEl();
      if (!el) return;
      unmountActiveReact();
      el.innerHTML = "";
      // Residual root selector: #artifacts-component-root-react
      var mount = document.createElement("div");
      mount.id = "artifacts-component-root-react";
      // Residual: data-theme=claude data-mode={mode??"light"} class min-h-full w-full
      mount.setAttribute("data-theme", "claude");
      mount.setAttribute(
        "data-mode",
        currentTheme === "dark" ? "dark" : "light",
      );
      mount.className = "min-h-full w-full";
      mount.style.minHeight = "100vh";
      mount.style.width = "100%";
      mount.style.background = bgColor();
      mount.style.color = themeVars().primaryTextColor;
      el.appendChild(mount);
      try {
        var transformed = Babel.transform(source || "", {
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
          paintError(
            "React artifact did not export a component (expected App or default export).\n\n" +
              (source || ""),
          );
          return;
        }
        var element = React.createElement(Comp);
        if (ReactDOM.createRoot) {
          activeReactRoot = ReactDOM.createRoot(mount);
          activeReactRoot.render(element);
        } else {
          ReactDOM.render(element, mount);
          activeReactRoot = {
            unmount: function () {
              ReactDOM.unmountComponentAtNode(mount);
            },
          };
        }
      } catch (err) {
        paintError(
          "Unable to render React artifact.\n" +
            (err && err.message ? err.message : String(err)) +
            "\n\n" +
            (source || ""),
        );
        throw err;
      }
    });
  }

  function handleSetContent(payload) {
    if (!payload || typeof payload !== "object") {
      return Promise.reject(new Error("Invalid SetContent payload"));
    }
    var type = payload.type || "";
    var content = payload.content;
    if (typeof content !== "string") {
      if (content != null) content = String(content);
      else content = "";
    }
    applyTheme(qsTheme());

    // Residual MIME only (xm / SandboxContent type) — no invent aliases
    if (type === XM.Html) {
      paintHtml(content);
      return Promise.resolve(EMPTY);
    }
    if (type === XM.Svg) {
      return paintSvg(content).then(function () {
        return EMPTY;
      });
    }
    if (type === XM.Mermaid) {
      return paintMermaidSource(content).then(function () {
        return EMPTY;
      });
    }
    if (type === XM.React) {
      return paintReact(content).then(function () {
        return EMPTY;
      });
    }
    paintError("Unsupported sandbox content type: " + type + "\n\n" + content);
    return Promise.reject(new Error("Unsupported type: " + type));
  }

  function onHandshake(event) {
    var data = event.data;
    if (!data || data.type !== "__sandbox_handshake__") return;
    if (!event.ports || !event.ports[0]) return;
    port = event.ports[0];
    parentOrigin = event.origin || qsParentOrigin() || "*";
    port.start && port.start();
    sendPortRequest(A4e.ReadyForContent, EMPTY);
  }

  function onWindowMessage(event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "__sandbox_handshake__") {
      onHandshake(event);
      return;
    }

    if (data.type === "__sandbox_handshake_request__") {
      return;
    }

    if (data.channel === "request" && typeof data.method === "string") {
      var method = data.method;
      var rid = data.requestId;
      var payload = data.payload;
      if (method === A4e.SetContent) {
        Promise.resolve(handleSetContent(payload))
          .then(function (res) {
            postWindowResponse(rid, 200, res || EMPTY, event.source, event.origin);
            sendPortRequest(A4e.DOMContentLoaded, EMPTY);
          })
          .catch(function (err) {
            postWindowResponse(
              rid,
              500,
              {
                "@type":
                  "type.googleapis.com/anthropic.claude.usercontent.ErrorResponse",
                error: err && err.message ? err.message : String(err),
              },
              event.source,
              event.origin,
            );
          });
        return;
      }
      // Residual A4e frame (3817): unknown method → 400 + ErrorResponse "Unknown method"
      // (not soft 200 EMPTY).
      postWindowResponse(
        rid,
        400,
        {
          "@type":
            "type.googleapis.com/anthropic.claude.usercontent.ErrorResponse",
          error: "Unknown method",
        },
        event.source,
        event.origin,
      );
    }
  }

  applyTheme(qsTheme());
  parentOrigin = qsParentOrigin();
  paintLoading();
  window.addEventListener("message", onWindowMessage, false);

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "__sandbox_handshake_request__" }, "*");
    }
  } catch (_) {}
})();
