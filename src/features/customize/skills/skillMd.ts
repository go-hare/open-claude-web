/**
 * Official c0659e756 F name sanitizer + c4101dbe9 / D8e upload parse.
 * .md YAML frontmatter; .zip/.skill must include SKILL.md.
 */

const RESERVED = ["anthropic", "claude"] as const;

export function sanitizeSkillName(value: string): string {
  let next = "";
  for (const char of value) {
    if (/[\s\p{Pc}]/u.test(char)) next += "-";
    else if (
      /[\p{Lu}\p{Ll}\p{Lt}\p{Lm}\p{Lo}\p{Nl}\p{Mn}\p{Mc}\p{Nd}-]/u.test(char) ||
      char === "‌" ||
      char === "‍"
    ) {
      next += char;
    }
  }
  return next.toLowerCase().slice(0, 64);
}

export function reservedWordInName(name: string): string | null {
  const lower = name.toLowerCase();
  for (const word of RESERVED) {
    if (lower.includes(word)) return word;
  }
  return null;
}

export function descriptionHasXmlTags(value: string): boolean {
  return /[<﹤＜].+[>﹥＞]/.test(value);
}

/** Official index HLe / VLe — SKILL.md for saveLocalSkill. */
export function formatSkillMarkdown(
  name: string,
  description: string,
  instructions: string,
): string {
  return `---\nname: "${escapeSkillYaml(name)}"\ndescription: "${escapeSkillYaml(description)}"\n---\n\n${instructions}\n`;
}

function escapeSkillYaml(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

export function isSkillUploadName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".zip") || lower.endsWith(".skill") || lower.endsWith(".md");
}

export type ParsedSkillMd = {
  description: string;
  instructions: string;
  name: string;
};

export function parseSkillMarkdown(text: string, fallbackName = ""): ParsedSkillMd | { error: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      error: ".md file must contain skill name and description formatted in YAML",
    };
  }
  const fields = parseYamlScalarMap(match[1] ?? "");
  const instructions = (match[2] ?? "").trim();
  const name = fields.name || fallbackName;
  const description = fields.description ?? "";
  if (!name || !description) {
    return {
      error: ".md file must contain skill name and description formatted in YAML",
    };
  }
  return { name: sanitizeSkillName(name), description, instructions };
}

/** Official pzt / WPt — name + description, including YAML `>` / `|` scalars. */
function parseYamlScalarMap(block: string): Record<string, string> {
  const lines = block.split(/\r?\n/);
  const out: Record<string, string> = {};
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }
    const key = match[1] ?? "";
    const rest = (match[2] ?? "").trim();
    if (rest === ">" || rest === ">-" || rest === "|" || rest === "|-") {
      const folded = rest.startsWith(">");
      index += 1;
      const collected: string[] = [];
      while (index < lines.length) {
        const next = lines[index] ?? "";
        if (/^[A-Za-z0-9_-]+:\s*/.test(next) && !/^\s/.test(next)) break;
        collected.push(next.replace(/^\s{1,2}/, ""));
        index += 1;
      }
      out[key] = folded ? foldYamlScalar(collected) : collected.join("\n").replace(/^\n/, "").trimEnd();
      continue;
    }
    out[key] = unquoteYaml(rest);
    index += 1;
  }
  return out;
}

function foldYamlScalar(lines: string[]): string {
  const paragraphs: string[] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) paragraphs.push(current.join(" "));
      current = [];
      continue;
    }
    current.push(line.trim());
  }
  if (current.length > 0) paragraphs.push(current.join(" "));
  return paragraphs.join("\n\n");
}

function unquoteYaml(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function readU16(buf: Uint8Array, offset: number): number {
  return buf[offset]! | (buf[offset + 1]! << 8);
}

function readU32(buf: Uint8Array, offset: number): number {
  return (
    buf[offset]! |
    (buf[offset + 1]! << 8) |
    (buf[offset + 2]! << 16) |
    (buf[offset + 3]! << 24)
  ) >>> 0;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractSkillMdFromZip(buf: Uint8Array): Promise<string | null> {
  let offset = 0;
  while (offset + 30 <= buf.length) {
    if (buf[offset] !== 0x50 || buf[offset + 1] !== 0x4b) break;
    if (buf[offset + 2] === 0x01 && buf[offset + 3] === 0x02) break;
    if (buf[offset + 2] !== 0x03 || buf[offset + 3] !== 0x04) break;
    const method = readU16(buf, offset + 8);
    const flags = readU16(buf, offset + 6);
    if (flags & 0x8) break;
    const compSize = readU32(buf, offset + 18);
    const nameLen = readU16(buf, offset + 26);
    const extraLen = readU16(buf, offset + 28);
    const nameStart = offset + 30;
    const name = new TextDecoder().decode(buf.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    const isSkillMd = name === "SKILL.md" || name.endsWith("/SKILL.md");
    if (isSkillMd) {
      if (method === 0) return new TextDecoder().decode(data);
      if (method === 8) return new TextDecoder().decode(await inflateRaw(data));
      return null;
    }
    offset = dataStart + compSize;
  }
  return null;
}

export async function parseSkillUploadFile(file: File): Promise<ParsedSkillMd | { error: string }> {
  if (!isSkillUploadName(file.name)) {
    return { error: "Skill files must have a .skill, .zip, or .md file extension." };
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".md")) {
    const text = await file.text();
    const fallback = file.name.replace(/\.md$/i, "");
    return parseSkillMarkdown(text, fallback);
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const md = await extractSkillMdFromZip(buf);
  if (!md) return { error: ".zip or .skill file must include a SKILL.md file" };
  return parseSkillMarkdown(md, file.name.replace(/\.(zip|skill)$/i, ""));
}
