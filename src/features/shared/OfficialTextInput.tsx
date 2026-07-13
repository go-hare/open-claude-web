/**
 * Official vIe TextInput (index-BELzQL5P yIe + vIe).
 * Used by gYt filter and uYt name/description fields.
 */
import {
  forwardRef,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

const sizeChrome = {
  default: "h-9 px-3 py-2 rounded-lg",
  sm: "h-8 rounded-md px-3 font-small",
  lg: "h-11 px-3 rounded-[0.6rem]",
} as const;

const inputBase =
  "bg-bg-000 border border-border-300 hover:border-border-200 transition-colors placeholder:text-text-500 can-focus disabled:cursor-not-allowed disabled:opacity-50 font-large";

export type OfficialTextInputProps = {
  append?: ReactNode;
  className?: string;
  error?: boolean;
  label?: ReactNode;
  onValueChange?: (value: string) => void;
  prepend?: ReactNode;
  size?: keyof typeof sizeChrome;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;

export const OfficialTextInput = forwardRef<HTMLInputElement, OfficialTextInputProps>(
  function OfficialTextInput(
    {
      append,
      className,
      error,
      id,
      label,
      onChange,
      onValueChange,
      prepend,
      size = "default",
      ...rest
    },
    ref,
  ) {
    const localRef = useRef<HTMLInputElement | null>(null);
    const setRefs = (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const shell = [
      inputBase,
      sizeChrome[size],
      error ? "!border-danger-200/50 hover:!border-danger-200/90 focus:!border-danger-200" : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    const handleChange: InputHTMLAttributes<HTMLInputElement>["onChange"] = (event) => {
      onChange?.(event);
      onValueChange?.(event.target.value);
    };

    return (
      <>
        {label ? (
          <label className="text-text-200 mb-1 block font-base" htmlFor={id}>
            {label}
          </label>
        ) : null}
        {prepend || append ? (
          <div
            className={`${shell} inline-flex cursor-text items-stretch gap-2 can-focus-within`}
            data-official-source="index-BELzQL5P.js:vIe prepend"
            onClick={() => localRef.current?.focus()}
          >
            {prepend ? <div className="flex items-center">{prepend}</div> : null}
            <input
              className="w-full placeholder:text-text-500 m-0 bg-transparent p-0 hide-focus-ring disabled:cursor-not-allowed disabled:opacity-50"
              id={id}
              onChange={handleChange}
              ref={setRefs}
              {...rest}
            />
            {append ? (
              <div
                className={[
                  "flex items-center",
                  size === "default" || size === "sm" ? "-mr-2" : "",
                  size === "lg" ? "-mr-1.5" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {append}
              </div>
            ) : null}
          </div>
        ) : (
          <input
            className={shell}
            data-official-source="index-BELzQL5P.js:vIe"
            id={id}
            onChange={handleChange}
            ref={setRefs}
            {...rest}
          />
        )}
      </>
    );
  },
);
