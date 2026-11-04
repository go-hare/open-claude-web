/**
 * Official shared-9 Kg / qg residual:
 * Kg(text) bumps a polite sr-only live region; qg portals it to document.body.
 * shared-16 hc announces Activity panel shown/hidden through that path (pi → Kg).
 */
type AnnouncerState = {
  count: number;
  text: string;
};

type AnnouncerListener = (state: AnnouncerState) => void;

const ANNOUNCE_DELAY_MS = 300;
const CLEAR_DELAY_MS = 5300;

let announcerState: AnnouncerState = { count: 0, text: "" };
const announcerListeners = new Set<AnnouncerListener>();
let hostMounted = false;

function emitAnnouncerState() {
  for (const listener of announcerListeners) listener(announcerState);
}

function ensureAnnouncerHost() {
  if (hostMounted || typeof document === "undefined") return;
  hostMounted = true;

  const root = document.createElement("span");
  root.setAttribute("role", "status");
  root.setAttribute("aria-live", "polite");
  root.className = "sr-only";
  root.setAttribute("data-official-source", "shared-9-CAAkBVM3.js:qg polite announcer");
  document.body.appendChild(root);

  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let clearTimer: ReturnType<typeof setTimeout> | undefined;
  let renderedCount = -1;

  const render = (state: AnnouncerState) => {
    clearTimeout(showTimer);
    clearTimeout(clearTimer);
    showTimer = setTimeout(() => {
      if (state.text) {
        if (renderedCount !== state.count || root.textContent !== state.text) {
          root.replaceChildren();
          const message = document.createElement("span");
          message.textContent = state.text;
          root.appendChild(message);
          renderedCount = state.count;
        }
      } else {
        root.replaceChildren();
        renderedCount = state.count;
      }
      clearTimer = setTimeout(() => {
        root.replaceChildren();
      }, CLEAR_DELAY_MS);
    }, ANNOUNCE_DELAY_MS);
  };

  announcerListeners.add(render);
  render(announcerState);
}

/** Official Kg — announce a polite screen-reader message. */
export function announceCoworkPolite(text: string) {
  if (!text) return;
  ensureAnnouncerHost();
  announcerState = { text, count: announcerState.count + 1 };
  emitAnnouncerState();
}

/** Official shared-16 hc — Activity panel shown/hidden. */
export function announceCoworkActivityPanelVisibility(shown: boolean, copy: { shown: string; hidden: string }) {
  announceCoworkPolite(shown ? copy.shown : copy.hidden);
}
