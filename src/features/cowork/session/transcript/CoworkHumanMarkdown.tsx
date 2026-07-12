import { useMemo } from "react";
import { CoworkMarkdownTree, parseCoworkMarkdown } from "./CoworkMarkdown";

export function CoworkHumanMarkdown({ text }: { text: string }) {
  const root = useMemo(() => parseCoworkMarkdown(text), [text]);
  return <CoworkMarkdownTree profile="human" root={root} source={text} />;
}
