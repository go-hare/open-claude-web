const ReactDOM = typeof window !== "undefined" ? window.ReactDOM : {};
export default ReactDOM;
export const {
  createRoot,
  render,
  hydrate,
  unmountComponentAtNode,
  findDOMNode,
  createPortal,
  flushSync,
} = ReactDOM;
