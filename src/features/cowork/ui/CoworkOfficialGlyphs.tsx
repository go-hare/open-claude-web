import type { CSSProperties } from "react";

type CoworkGlyphSize = 12 | 14 | 16 | 20 | 24 | 28 | 32;

type CoworkOfficialGlyphProps = {
  alt?: string;
  className?: string;
  size?: CoworkGlyphSize;
  vectorSizeOverride?: number;
};

type CoworkGlyphPath = string | {
  clipRule?: "evenodd";
  d: string;
  fillRule?: "evenodd";
};

const vectorSizes: Record<CoworkGlyphSize, number> = {
  12: 16,
  14: 16,
  16: 20,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
};

const clockPath = "M10.386 2.51A7.5 7.5 0 1 1 2.5 10a.5.5 0 0 1 1 0 6.5 6.5 0 1 0 6.835-6.491L10 3.5l-.1-.01a.5.5 0 0 1 .1-.99zM10 5.5a.5.5 0 0 1 .5.5v3.69l2.724 1.363a.5.5 0 0 1-.353.93l-.095-.036-3-1.5A.5.5 0 0 1 9.5 10V6a.5.5 0 0 1 .5-.5M3.662 6.941a.661.661 0 1 1 0 1.323.661.661 0 0 1 0-1.323m1.294-2.647a.662.662 0 1 1-.001 1.323.662.662 0 0 1 .001-1.323M7.603 3a.662.662 0 1 1-.001 1.325.662.662 0 0 1 0-1.325";
const checkPath = "M10 2.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15m0 1a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13m2.61 3.688a.5.5 0 0 1 .78.625l-4 5a.5.5 0 0 1-.661.107l-.083-.066-2-2-.064-.079a.5.5 0 0 1 .693-.693l.079.064 1.604 1.605z";
const chevronDownPath = "M14.128 7.165a.502.502 0 0 1 .744.67l-4.5 5-.078.07a.5.5 0 0 1-.666-.07l-4.5-5-.06-.082a.501.501 0 0 1 .729-.656l.075.068L10 11.752z";
const chevronRightPath = "M6.134 3.16a.5.5 0 0 1 .626-.088l.08.062 7 6.5a.5.5 0 0 1 .068.655l-.068.077-7 6.5a.5.5 0 1 1-.68-.732L12.767 10 6.16 3.866l-.067-.076a.5.5 0 0 1 .04-.63";
const chevronRightSmallPath = "M7.128 5.165a.5.5 0 0 1 .625-.097l.082.06 5 4.5a.5.5 0 0 1 .07.666l-.07.078-5 4.5a.501.501 0 0 1-.67-.744L11.752 10 7.165 5.872l-.068-.075a.5.5 0 0 1 .03-.632";
const chevronLeftSmallPath = "M12.247 5.068a.501.501 0 0 1 .655.729l-.067.075L8.248 10l4.587 4.128a.501.501 0 0 1-.67.744l-5-4.5-.07-.078a.5.5 0 0 1 .07-.666l5-4.5z";
const arrowRightPath = "M11.147 4.646a.5.5 0 0 1 .707 0l5 5 .062.077a.5.5 0 0 1-.062.63l-5 5a.5.5 0 0 1-.707-.707l4.146-4.146H3.5a.5.5 0 0 1 0-1h11.793l-4.146-4.146a.5.5 0 0 1 0-.708";
const arrowUpPath = "M10 3a.5.5 0 0 1 .354.146l5 5a.5.5 0 0 1-.707.708L10.5 4.707V16.5a.5.5 0 0 1-1 0V4.707L5.354 8.854a.5.5 0 0 1-.708-.708l5-5 .077-.062A.5.5 0 0 1 10 3";
const collapsePath = "M9.647 12.147a.5.5 0 0 1 .628-.065l.079.064 4 4a.5.5 0 1 1-.707.708L10 13.207l-3.646 3.647a.5.5 0 0 1-.707-.707zm4-9a.5.5 0 1 1 .707.707l-4 4-.079.064a.5.5 0 0 1-.628-.064l-4-4a.5.5 0 1 1 .707-.707L10 6.793z";
const expandPath = "M13.647 12.646a.5.5 0 0 1 .707.707l-4 4-.079.065a.5.5 0 0 1-.628-.065l-4-4a.5.5 0 0 1 .707-.707L10 16.293zm-4-10a.5.5 0 0 1 .628-.064l.079.064 4 4a.5.5 0 0 1-.707.707L10 3.707 6.354 7.353a.5.5 0 1 1-.707-.707z";
const infoPath = "M10 2.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15m0 1a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13m.1 5.51a.5.5 0 0 1 .4.49v3h1a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1h1V10h-1a.5.5 0 0 1 0-1H10zM10 6.5A.75.75 0 1 1 10 8a.75.75 0 0 1 0-1.5";
const scheduledTaskClockPath = "M10 2.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15m0 1a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13M10 5a.5.5 0 0 1 .5.5v4.169l3.197 1.371.088.05a.5.5 0 0 1-.386.9l-.096-.03-3.5-1.5A.5.5 0 0 1 9.5 10V5.5A.5.5 0 0 1 10 5";
const computerAccessPaths: CoworkGlyphPath[] = [
  { clipRule: "evenodd", d: "M7.752 8.728a.751.751 0 0 1 .86-1.012l.116.036 8.424 3.37c.801.32.847 1.438.075 1.823l-2.855 1.427-1.427 2.855c-.386.772-1.502.726-1.823-.075zm4.299 8.052 1.465-2.93.062-.103a.75.75 0 0 1 .273-.231l2.93-1.465-7.884-3.154z", fillRule: "evenodd" },
  "M5.063 12.647a.5.5 0 0 1 .707.707L4.354 14.77a.5.5 0 1 1-.708-.707zM4 8.75a.5.5 0 0 1 0 1H1.997a.5.5 0 0 1 0-1zm-.303-5.024a.5.5 0 0 1 .707 0l1.417 1.417a.5.5 0 0 1-.707.707L3.697 4.433a.5.5 0 0 1 0-.707m10.366-.08a.5.5 0 0 1 .707.708L13.354 5.77a.5.5 0 1 1-.707-.707zM9.25 1.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5",
];
const computerTeachPath = "M9.822 3.032a.5.5 0 0 1 .412.027l8.5 4.5a.5.5 0 0 1 0 .882l-1.754.928q.019.063.02.131v3.611c0 .373-.14.751-.433 1.027-.3.283-.84.755-1.567 1.234V17.5a.5.5 0 0 1-1 0v-1.543C12.898 16.53 11.532 17 10 17c-2.846 0-5.124-1.61-6.187-2.521l-.38-.341A1.4 1.4 0 0 1 3 13.11V9.5q0-.069.019-.13l-1.753-.93a.5.5 0 0 1 0-.882l8.5-4.5zM4 13.112c0 .126.048.23.12.298l.355.32C5.46 14.57 7.507 16 10 16c1.558 0 2.94-.56 4-1.185v-3.868l-3.766 1.994a.5.5 0 0 1-.468 0L4 9.89zm10.99-2.69c.004.026.01.052.01.078v3.648c.383-.288.683-.55.88-.738a.4.4 0 0 0 .12-.299V9.89zM2.567 8 10 11.934l3.099-1.641-3.342-1.855-.083-.06a.5.5 0 0 1 .475-.856l.094.04 3.91 2.172L17.432 8 10 4.065z";
const webPath = "M7.27 3.05a7.467 7.467 0 1 1-.018.007l.01-.004zm1.372 11.478a8 8 0 0 0-1.464 1.362 6.53 6.53 0 0 0 3.373.62 6.2 6.2 0 0 1-.969-.835 10 10 0 0 1-.94-1.147m4.515-1.993c-.626.13-1.275.323-1.93.581-.654.258-1.26.56-1.808.892.276.386.555.73.835 1.02.45.468.88.788 1.258.958.376.17.665.178.881.093.218-.085.425-.289.584-.67.16-.383.257-.91.267-1.558a9 9 0 0 0-.087-1.316M3.637 8.52a6.5 6.5 0 0 0 .285 3.876 6.5 6.5 0 0 0 2.433 3.027 9 9 0 0 1 1.772-1.674 16.4 16.4 0 0 1-1.243-2.52 16.5 16.5 0 0 1-.81-2.693 9 9 0 0 1-2.436-.016m12.444 3.864a8 8 0 0 0-2 .003c.07.523.103 1.02.096 1.48a6.2 6.2 0 0 1-.14 1.272 6.53 6.53 0 0 0 2.044-2.755M11.095 6.77c-.607.37-1.271.701-1.98.981s-1.423.49-2.119.633c.165.79.417 1.638.757 2.5s.733 1.653 1.151 2.344c.607-.37 1.272-.701 1.982-.981s1.422-.49 2.117-.634a15.6 15.6 0 0 0-.756-2.499 15.6 15.6 0 0 0-1.152-2.344m2.548-2.194a9 9 0 0 1-1.77 1.674c.457.751.881 1.602 1.243 2.521.362.92.633 1.83.81 2.692a9 9 0 0 1 2.435.016 6.5 6.5 0 0 0-.282-3.875 6.5 6.5 0 0 0-2.436-3.028m-7.681.286a6.53 6.53 0 0 0-2.044 2.753c.603.08 1.279.082 1.999-.002-.07-.523-.1-1.02-.094-1.48a6.2 6.2 0 0 1 .139-1.27m2.526-.85c-.376-.17-.665-.177-.883-.091s-.423.288-.583.669c-.16.383-.256.91-.266 1.557a9 9 0 0 0 .086 1.316c.627-.13 1.276-.321 1.93-.58.655-.257 1.26-.561 1.807-.893a9 9 0 0 0-.833-1.02c-.45-.468-.88-.787-1.258-.957m4.334.096a6.53 6.53 0 0 0-3.372-.62c.328.224.654.506.969.834q.48.5.94 1.147a8 8 0 0 0 1.464-1.362";
const taskPath = "M5 2.5A2 2 0 0 1 6.935 4h6.815a3.25 3.25 0 0 1 0 6.5h-1.043l-2.354 2.354a.5.5 0 0 1-.707 0L7.293 10.5H6.25a2.25 2.25 0 0 0 0 4.5h6.815A1.999 1.999 0 1 1 15 17.5a2 2 0 0 1-1.935-1.5H6.25a3.25 3.25 0 0 1 0-6.5h1.043l2.353-2.354.079-.064a.5.5 0 0 1 .629.064L12.707 9.5h1.043a2.25 2.25 0 0 0 0-4.5H6.935A1.999 1.999 0 1 1 3 4.5a2 2 0 0 1 2-2m10 12a1 1 0 1 0 0 2 1 1 0 0 0 0-2M8.207 10 10 11.793 11.793 10 10 8.207zM5 3.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2";
const terminalPaths: CoworkGlyphPath[] = [
  "M5.146 7.146a.5.5 0 0 1 .708 0l2.5 2.5a.5.5 0 0 1 .062.631l-.062.077-2.5 2.5a.5.5 0 1 1-.708-.707L7.293 10 5.146 7.854a.5.5 0 0 1 0-.708M14.5 12a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1z",
  { clipRule: "evenodd", d: "M16.5 4A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9A1.5 1.5 0 0 1 3.5 4zm-13 1a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5z", fillRule: "evenodd" },
];
const searchPath = "M8.5 2a6.5 6.5 0 0 1 4.935 10.728l4.419 4.419.064.078a.5.5 0 0 1-.693.693l-.079-.064-4.419-4.42A6.5 6.5 0 1 1 8.5 2m0 1a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11";
const todoPath = "M6 13.5a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1zm-2 3h2v-2H4zM16.5 15a.5.5 0 0 1 0 1h-7a.5.5 0 1 1 0-1zM6 8a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zm-2 3h2V9H4zm12.5-1.5a.5.5 0 0 1 0 1h-7a.5.5 0 1 1 0-1zM6.126 2.918a.5.5 0 0 1 .748.664l-2.218 2.5a.5.5 0 0 1-.744.004L2.88 4.947l-.06-.082a.5.5 0 0 1 .725-.658l.075.068.657.725zM16.5 4a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1z";
const editPath = "M9.728 2.88a1.5 1.5 0 0 1 1.946-.847l2.792 1.1a1.5 1.5 0 0 1 .845 1.945l-3.92 9.953a1.5 1.5 0 0 1-.452.615l-.088.066-3.143 2.186a.75.75 0 0 1-1.135-.362l-.026-.095-.81-3.742a1.5 1.5 0 0 1 .071-.867zm-2.99 10.319a.5.5 0 0 0-.023.288l.73 3.376 2.835-1.971.058-.047a.5.5 0 0 0 .122-.18l2.637-6.698-3.721-1.466zm4.57-10.236a.5.5 0 0 0-.65.283L9.743 5.57l3.722 1.467.917-2.327a.5.5 0 0 0-.283-.648z";
const externalLinkPath = "M9.5 3a.5.5 0 0 1 0 1h-5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 1 1 0v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3zm7 0a.5.5 0 0 1 .18.034l.021.01q.03.014.059.03l.023.014a.5.5 0 0 1 .07.058l.065.079q.015.025.026.052l.018.034a.5.5 0 0 1 .032.128Q17 3.47 17 3.5v4a.5.5 0 0 1-1 0V4.707l-4.146 4.147a.5.5 0 1 1-.707-.708L15.293 4H12.5a.5.5 0 0 1 0-1z";
const retryPath = "M10.386 2.51A7.5 7.5 0 1 1 5.499 4H3a.5.5 0 0 1 0-1h3.5a.5.5 0 0 1 .49.402L7 3.5V7a.5.5 0 0 1-1 0V4.879a6.5 6.5 0 1 0 4.335-1.37L10 3.5l-.1-.01a.5.5 0 0 1 .1-.99z";
const toolboxPath = "M8.517 1.741a4.5 4.5 0 0 1 4.13 2.85l.116.33a4.5 4.5 0 0 1-.956 4.326l2.391 6.071.066.195a2 2 0 0 1-1.007 2.314l-.187.085a2 2 0 0 1-2.508-.941l-.085-.187-2.388-6.06a4.5 4.5 0 0 1-3.675-2.511l-.141-.322a4.5 4.5 0 0 1 1.1-4.923l.046-.04a.5.5 0 0 1 .762.22l1.195 3.035.042.093a1 1 0 0 0 1.255.471l.093-.042c.42-.217.632-.703.504-1.158l-.034-.097-1.191-3.025a.502.502 0 0 1 .472-.684m1.65 3.343.066.193a2 2 0 0 1-1.007 2.316l-.187.085a2 2 0 0 1-2.509-.942l-.085-.186-.89-2.261a3.5 3.5 0 0 0-.352 3.234l.11.251A3.5 3.5 0 0 0 8.18 9.728l.26.012.075.006a.5.5 0 0 1 .386.31l2.506 6.362.042.093a1 1 0 0 0 1.255.47l.094-.042a1 1 0 0 0 .503-1.158l-.032-.097-2.51-6.37a.5.5 0 0 1 .119-.545 3.5 3.5 0 0 0 .928-3.554l-.09-.257A3.5 3.5 0 0 0 9.283 2.84z";
const memoryPaths = [
  "M13.29 8.804a.5.5 0 0 1 .92.392c-.36.84-1.046 1.554-1.96 1.554-.613 0-1.122-.321-1.5-.785-.378.464-.887.785-1.5.785s-1.122-.321-1.5-.785c-.378.464-.887.785-1.5.785a.5.5 0 0 1 0-1c.338 0 .755-.28 1.04-.946l.034-.067a.5.5 0 0 1 .886.067l.112.231c.276.5.632.715.928.715.338 0 .755-.28 1.04-.946l.034-.067a.5.5 0 0 1 .886.067l.112.231c.276.5.633.715.928.715.338 0 .755-.28 1.04-.946",
  "M17.5 9.5A7.5 7.5 0 0 0 2.516 9c-.018.275.208.5.484.5a.53.53 0 0 0 .519-.5A6.5 6.5 0 1 1 10 16l-5.855.004.828-.834a.497.497 0 0 0-.706-.701l-1.576 1.584a.656.656 0 0 0 0 .926l1.542 1.55a.51.51 0 1 0 .722-.723l-.81-.802L10 17a7.5 7.5 0 0 0 7.5-7.5",
];
const skillPaths = [
  "M13.04 7.304a.5.5 0 0 1 .92.392C13.665 8.386 13.089 9 12.3 9c-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.234-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696a.5.5 0 0 1 .92 0c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696",
  "M14 3a2 2 0 0 1 2 2v8h1.5a.5.5 0 0 1 .5.5V15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4H4a1 1 0 0 0-.745 1.667.5.5 0 0 1-.745.666A2 2 0 0 1 4 3zM6 15a1 1 0 1 0 2 0v-1.5a.5.5 0 0 1 .5-.5H15V5a1 1 0 0 0-1-1H6zm3 0c0 .365-.1.706-.27 1H16a1 1 0 0 0 1-1v-1H9z",
];

export function CoworkTimelineClockGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={clockPath} />;
}

export function CoworkCircleCheckGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={checkPath} />;
}

export function CoworkChevronDownGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={chevronDownPath} />;
}

export function CoworkChevronRightGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={chevronRightPath} />;
}

export function CoworkChevronRightSmallGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={chevronRightSmallPath} />;
}

export function CoworkChevronLeftSmallGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={chevronLeftSmallPath} />;
}

export function CoworkArrowRightGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={arrowRightPath} />;
}

export function CoworkArrowUpGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={arrowUpPath} />;
}

export function CoworkCollapseGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={collapsePath} />;
}

export function CoworkExpandGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={expandPath} />;
}

export function CoworkInfoGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={infoPath} />;
}

export function CoworkSkillGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={skillPaths} />;
}

export function CoworkScheduledTaskClockGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={scheduledTaskClockPath} />;
}

export function CoworkComputerAccessGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={computerAccessPaths} />;
}

export function CoworkComputerTeachGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={computerTeachPath} />;
}

export function CoworkWebGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={webPath} />;
}

export function CoworkTaskGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={taskPath} />;
}

export function CoworkTerminalGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={terminalPaths} />;
}

export function CoworkSearchGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={searchPath} />;
}

export function CoworkTodoGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={todoPath} />;
}

export function CoworkEditGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={editPath} />;
}

export function CoworkExternalLinkGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={externalLinkPath} />;
}

export function CoworkRetryGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={retryPath} />;
}

export function CoworkToolboxGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={toolboxPath} />;
}

export function CoworkMemoryGlyph(props: CoworkOfficialGlyphProps) {
  return <CoworkOfficialGlyph {...props} path={memoryPaths} />;
}

function CoworkOfficialGlyph({ alt, className, path, size = 20, vectorSizeOverride }: CoworkOfficialGlyphProps & { path: CoworkGlyphPath | CoworkGlyphPath[] }) {
  const vectorSize = vectorSizeOverride ?? vectorSizes[size];
  const svg = (
    <svg
      aria-hidden={!alt}
      aria-label={alt}
      className={className}
      fill="currentColor"
      height={vectorSize}
      style={{ flexShrink: 0 }}
      viewBox="0 0 20 20"
      width={vectorSize}
      xmlns="http://www.w3.org/2000/svg"
    >
      {(Array.isArray(path) ? path : [path]).map((value, index) => typeof value === "string"
        ? <path d={value} key={index} />
        : <path clipRule={value.clipRule} d={value.d} fillRule={value.fillRule} key={index} />)}
    </svg>
  );
  if (vectorSizeOverride) return svg;
  const wrapperStyle: CSSProperties = {
    alignItems: "center",
    display: "flex",
    height: size,
    justifyContent: "center",
    width: size,
  };
  return <div className={className} style={wrapperStyle}>{svg}</div>;
}
