/**
 * `@pierre/diffs` FileDiff mounts on custom element `diffs-container`.
 * Package public exports omit this entry; import dist web-components so the CE
 * + core adoptedStyleSheets register. Without it, shadow DOM is unstyled.
 */
import "../../../../node_modules/@pierre/diffs/dist/components/web-components.js";
