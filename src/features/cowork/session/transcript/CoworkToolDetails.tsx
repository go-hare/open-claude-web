import { useState } from "react";
import { CoworkButton } from "../../ui/CoworkButton";
import { stringValue } from "../recordUtils";
import type { CoworkToolUse } from "../types";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";

export function CoworkToolDetails({ tool }: { tool: CoworkToolUse }) {
  if (tool.name === "Bash" || tool.name === "BashTool") return <CoworkBashToolDetails tool={tool} />;
  if (tool.name === "Read" && tool.output && !tool.isError) return <CoworkReadFileDetails tool={tool} />;
  if (tool.name === "ExitPlanMode" && typeof tool.input.plan === "string") return <CoworkTextToolDetails label="Plan" text={tool.input.plan} />;
  return <CoworkGenericToolDetails tool={tool} />;
}

function CoworkBashToolDetails({ tool }: { tool: CoworkToolUse }) {
  const command = stringValue(tool.input.command);
  const copyText = [command ? `$ ${command}` : "", tool.output ?? ""].filter(Boolean).join("\n\n");
  return (
    <div className="group/body py-p6"><div className="bg-t1 rounded-r6 flex flex-col">
      <div className="flex items-center px-p6 py-p5"><span className="flex-1 text-body text-assistant-secondary">Bash</span><CopyToolDetailsButton text={copyText} /></div>
      <div className="flex flex-col gap-g8 px-p6 pb-p8 text-code">{command ? <div className="whitespace-pre-wrap">$ {command}</div> : null}{tool.output ? <div className={`whitespace-pre-wrap break-all ${tool.isError ? "text-extended-pink" : "text-assistant-secondary"}`}>{tool.output}</div> : null}</div>
    </div></div>
  );
}

function CoworkReadFileDetails({ tool }: { tool: CoworkToolUse }) {
  const path = stringValue(tool.input.file_path) ?? "file";
  const contents = normalizeReadFileOutput(tool.output ?? "");
  return (
    <div className="group/body py-p6"><div className="bg-t1 rounded-r6 overflow-clip flex flex-col">
      <div className="flex items-center gap-g3 px-p6 py-p5"><ToolPathButton path={path} /><CopyToolDetailsButton text={contents} /></div>
      <pre className="m-0 px-p6 pb-p8 text-code text-assistant-secondary whitespace-pre-wrap break-all">{contents}</pre>
    </div></div>
  );
}

function CoworkGenericToolDetails({ tool }: { tool: CoworkToolUse }) {
  const inputKeys = Object.keys(tool.input);
  return (
    <div className="group/body relative flex flex-col w-full pt-p3"><div className="flex w-full">
      <div className={`flex-1 min-w-0 flex flex-col gap-g4 text-body whitespace-pre-wrap break-words ${tool.isError ? "" : "text-assistant-secondary"}`}>
        {inputKeys.length ? <div className="text-assistant-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
        {tool.output ? <div className={tool.isError ? "text-extended-pink" : undefined}>{tool.output}</div> : null}
      </div>
      <CopyToolDetailsButton text={toolCopyText(tool)} />
    </div></div>
  );
}

function CoworkTextToolDetails({ label, text }: { label: string; text: string }) {
  return <div className="group/body py-p6"><div className="bg-t1 rounded-r6 flex flex-col overflow-hidden"><div className="px-p6 pt-p5 pb-p3 text-body text-assistant-secondary">{label}</div><pre className="m-0 px-p6 pb-p5 text-code text-t8 whitespace-pre-wrap break-words">{text}</pre></div></div>;
}

function ToolPathButton({ path }: { path: string }) {
  const actions = useCoworkTranscriptActions();
  return <button className="flex flex-1 min-w-0 text-left text-body text-assistant-secondary outline-none hide-focus-ring ring-focus hover:underline underline-offset-[3px] bg-transparent border-0 p-0 m-0 cursor-default" onClick={(event) => { event.stopPropagation(); actions?.openFile({ path }); }} type="button"><span className="truncate">{basename(path)}</span></button>;
}

function ToolInputLine({ input, inputKey }: { input: Record<string, unknown>; inputKey: string }) {
  const actions = useCoworkTranscriptActions();
  const value = inputValueText(input[inputKey]);
  const isPath = inputKey === "file_path" || inputKey === "notebook_path" || inputKey === "path";
  return <div>{inputKey}: {isPath ? <button className="rounded-[4px] outline-none hide-focus-ring ring-focus bg-transparent border-0 p-0 m-0 text-left cursor-default" onClick={(event) => { event.stopPropagation(); actions?.openFile({ path: value }); }} type="button"><code className="epitaxy-code-chip">{value}</code></button> : value}</div>;
}

function CopyToolDetailsButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const copy = () => { void navigator.clipboard?.writeText(text).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1200); }); };
  return <div className="opacity-0 group-hover/body:opacity-100 focus-within:opacity-100 transition-opacity"><CoworkButton ariaLabel={copied ? "Copied" : "Copy"} icon={copied ? "CheckSelection" : "CopySquareBehind"} onClick={copy} size="small" /></div>;
}

function inputValueText(value: unknown) {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

function toolCopyText(tool: CoworkToolUse) {
  const input = Object.keys(tool.input).map((key) => `${key}: ${inputValueText(tool.input[key])}`).join("\n");
  return [input, tool.output].filter(Boolean).join("\n\n");
}

function normalizeReadFileOutput(output: string) {
  const stripped = output.replace(/\n<system-reminder>[\s\S]*$/, "").replace(/\n+$/, "");
  const lines = stripped.split("\n");
  const numbered = /^ *\d+(?:[:|→] ?|\t)/;
  return lines.every((line) => !line || numbered.test(line)) ? lines.map((line) => line.replace(numbered, "")).join("\n") : stripped;
}

function basename(path: string) { return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path; }
