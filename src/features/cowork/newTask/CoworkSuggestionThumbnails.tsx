import { useSyncExternalStore, type SVGProps } from "react";

/**
 * Official Jot palette (~155144) for suggestion thumbnails Y5t/K5t/G5t/W5t.
 */
export type CoworkSuggestionPalette = {
  bgFill: string;
  accentFill: string;
  stroke: string;
  borderStroke: string;
  textStroke: string;
};

const lightPalette: CoworkSuggestionPalette = {
  bgFill: "white",
  accentFill: "#F0EEE6",
  stroke: "#BCBBBB",
  borderStroke: "#1F1E1D",
  textStroke: "#A4A4A1",
};

const darkPalette: CoworkSuggestionPalette = {
  bgFill: "#30302E",
  accentFill: "#141413",
  stroke: "#64645F",
  borderStroke: "#DEDCD1",
  textStroke: "#DEDCD1",
};

function readIsDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  const root = document.documentElement;
  if (root.classList.contains("dark") || root.dataset.mode === "dark" || root.dataset.theme === "dark") {
    return true;
  }
  if (root.classList.contains("light") || root.dataset.mode === "light" || root.dataset.theme === "light") {
    return false;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function subscribeTheme(onStoreChange: () => void) {
  const media = window.matchMedia?.("(prefers-color-scheme: dark)");
  const onMedia = () => onStoreChange();
  media?.addEventListener?.("change", onMedia);
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-mode", "data-theme"] });
  return () => {
    media?.removeEventListener?.("change", onMedia);
    observer.disconnect();
  };
}

export function useCoworkSuggestionPalette(): CoworkSuggestionPalette {
  const isDark = useSyncExternalStore(subscribeTheme, readIsDarkMode, () => false);
  return isDark ? darkPalette : lightPalette;
}

type ThumbnailProps = SVGProps<SVGSVGElement>;

/** Official Y5t — prep/calendar-style tile. */
export function PrepSuggestionThumbnail(props: ThumbnailProps) {
  const palette = useCoworkSuggestionPalette();
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <g filter="url(#prep-shadow)">
        <rect x="5" y="5" width="30" height="30" rx="3.5" fill={palette.bgFill} />
        <rect x="5.5" y="5.5" width="29" height="29" rx="3" stroke={palette.borderStroke} strokeOpacity="0.3" />
        <path
          d="M20 15C23.5899 15 26.5 17.9101 26.5 21.5C26.5 22.386 26.322 23.2303 26.001 24H13.999C13.678 23.2303 13.5 22.386 13.5 21.5C13.5 17.9101 16.4101 15 20 15Z"
          fill={palette.accentFill}
        />
        <path
          d="M26.001 24V24.35H26.2342L26.324 24.1347L26.001 24ZM13.999 24L13.676 24.1347L13.7658 24.35H13.999V24ZM20 15V15.35C23.3966 15.35 26.15 18.1034 26.15 21.5H26.5H26.85C26.85 17.7168 23.7832 14.65 20 14.65V15ZM26.5 21.5H26.15C26.15 22.3387 25.9816 23.1373 25.6779 23.8653L26.001 24L26.324 24.1347C26.6624 23.3233 26.85 22.4333 26.85 21.5H26.5ZM26.001 24V23.65H13.999V24V24.35H26.001V24ZM13.999 24L14.3221 23.8653C14.0184 23.1373 13.85 22.3387 13.85 21.5H13.5H13.15C13.15 22.4333 13.3376 23.3233 13.676 24.1347L13.999 24ZM13.5 21.5H13.85C13.85 18.1034 16.6034 15.35 20 15.35V15V14.65C16.2168 14.65 13.15 17.7168 13.15 21.5H13.5Z"
          fill={palette.stroke}
        />
      </g>
      <defs>
        <filter id="prep-shadow" x="2.37143" y="3.68571" width="35.2571" height="35.2571" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1.31429" />
          <feGaussianBlur stdDeviation="1.31429" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}

/** Official K5t — organize/folder tile. */
export function OrganizeSuggestionThumbnail(props: ThumbnailProps) {
  const palette = useCoworkSuggestionPalette();
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path
        d="M7.03516 6.5H16.4238C17.0868 6.5 17.7226 6.76367 18.1914 7.23242L18.9346 7.97461C19.5909 8.63094 20.481 8.99994 21.4092 9H33C34.3807 9 35.5 10.1193 35.5 11.5V14.5C35.5 15.8807 34.3807 17 33 17H7.09961C5.73032 17 4.61565 15.8985 4.59961 14.5293L4.53516 9.0293C4.51894 7.63729 5.64306 6.5 7.03516 6.5Z"
        fill={palette.accentFill}
        stroke={palette.stroke}
      />
      <g filter="url(#organize-shadow)">
        <path
          d="M4 16.8C4 15.1198 4 14.2798 4.32698 13.638C4.6146 13.0735 5.07354 12.6146 5.63803 12.327C6.27976 12 7.11984 12 8.8 12H31.2C32.8802 12 33.7202 12 34.362 12.327C34.9265 12.6146 35.3854 13.0735 35.673 13.638C36 14.2798 36 15.1198 36 16.8V28.2C36 29.8802 36 30.7202 35.673 31.362C35.3854 31.9265 34.9265 32.3854 34.362 32.673C33.7202 33 32.8802 33 31.2 33H8.8C7.11984 33 6.27976 33 5.63803 32.673C5.07354 32.3854 4.6146 31.9265 4.32698 31.362C4 30.7202 4 29.8802 4 28.2V16.8Z"
          fill={palette.bgFill}
        />
        <path
          d="M8.7998 12.5H31.2002C32.0484 12.5 32.6547 12.5002 33.1299 12.5391C33.599 12.5774 33.8962 12.6509 34.1348 12.7725C34.6052 13.0121 34.9879 13.3948 35.2275 13.8652C35.3491 14.1038 35.4226 14.401 35.4609 14.8701C35.4998 15.3453 35.5 15.9516 35.5 16.7998V28.2002C35.5 29.0484 35.4998 29.6547 35.4609 30.1299C35.4226 30.599 35.3491 30.8962 35.2275 31.1348C34.9879 31.6052 34.6052 31.9879 34.1348 32.2275C33.8962 32.3491 33.599 32.4226 33.1299 32.4609C32.6547 32.4998 32.0484 32.5 31.2002 32.5H8.7998C7.95158 32.5 7.34525 32.4998 6.87012 32.4609C6.40101 32.4226 6.10381 32.3491 5.86523 32.2275C5.39483 31.9879 5.01214 31.6052 4.77246 31.1348C4.65094 30.8962 4.5774 30.599 4.53906 30.1299C4.50024 29.6547 4.5 29.0484 4.5 28.2002V16.7998L4.50488 15.6953C4.50983 15.3783 4.51965 15.1077 4.53906 14.8701C4.5774 14.401 4.65094 14.1038 4.77246 13.8652C5.01214 13.3948 5.39483 13.0121 5.86523 12.7725C6.10381 12.6509 6.40101 12.5774 6.87012 12.5391C7.34525 12.5002 7.95158 12.5 8.7998 12.5Z"
          stroke={palette.borderStroke}
          strokeOpacity="0.3"
        />
      </g>
      <defs>
        <filter id="organize-shadow" x="1.37143" y="10.6857" width="37.2571" height="26.2571" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1.31429" />
          <feGaussianBlur stdDeviation="1.31429" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}

/** Official G5t — data/file tile. */
export function DataSuggestionThumbnail({ className, ...props }: ThumbnailProps) {
  const palette = useCoworkSuggestionPalette();
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <g filter="url(#file-shadow)">
        <rect x="5" y="5" width="30" height="30" rx="3" fill={palette.bgFill} />
        <rect x="5.5" y="5.5" width="29" height="29" rx="2.5" stroke={palette.borderStroke} strokeOpacity="0.3" />
        <g opacity="0.7">
          <path
            d="M8.75684 11.2334C9.25282 11.2334 9.68966 10.84 9.94512 10.2432C10.2006 10.84 10.6374 11.2334 11.1334 11.2334C11.6294 11.2334 12.0662 10.84 12.3217 10.2432C12.5772 10.84 13.014 11.2334 13.51 11.2334C14.006 11.2334 14.4428 10.84 14.6983 10.2432"
            stroke={palette.textStroke}
            strokeWidth="0.607623"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.3387 10.2432C17.5942 10.84 18.031 11.2334 18.527 11.2334C19.023 11.2334 19.4598 10.84 19.7153 10.2432C19.9707 10.84 20.4076 11.2334 20.9036 11.2334C21.3995 11.2334 21.8364 10.84 22.0918 10.2432"
            stroke={palette.textStroke}
            strokeWidth="0.607623"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M24.7325 10.2432C24.988 10.84 25.4248 11.2334 25.9208 11.2334C26.4168 11.2334 26.8536 10.84 27.1091 10.2432C27.3645 10.84 27.8014 11.2334 28.2974 11.2334C28.7933 11.2334 29.2302 10.84 29.4856 10.2432"
            stroke={palette.textStroke}
            strokeWidth="0.607623"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <path d="M9.5 27H30.5" stroke={palette.stroke} strokeWidth="0.5" />
        <path d="M9 21C9 19.8954 9.89543 19 11 19H29C30.1046 19 31 19.8954 31 21V23H9V21Z" fill={palette.accentFill} />
        <path d="M9.5 23H30.5" stroke={palette.stroke} strokeWidth="0.5" />
        <rect x="9.35" y="19.35" width="21.3" height="11.3" rx="0.65" stroke={palette.stroke} strokeWidth="0.7" />
        <path d="M20 19.5V30.5" stroke={palette.stroke} strokeWidth="0.5" />
      </g>
      <defs>
        <filter id="file-shadow" x="2.37143" y="3.68571" width="35.2571" height="35.2571" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="1.31429" />
          <feGaussianBlur stdDeviation="1.31429" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
      </defs>
    </svg>
  );
}

/** Official W5t — inbox tile reuses organize body. */
export function InboxSuggestionThumbnail(props: ThumbnailProps) {
  return <OrganizeSuggestionThumbnail {...props} />;
}
