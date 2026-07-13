import type { ConnectorListItem } from "./connectorTypes";

const STORAGE_KEY = "open-claude.customize.custom-connectors.v1";

function readStored(): ConnectorListItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ConnectorListItem =>
        !!item &&
        typeof item === "object" &&
        typeof (item as ConnectorListItem).id === "string" &&
        typeof (item as ConnectorListItem).name === "string",
    );
  } catch {
    return [];
  }
}

function writeStored(items: ConnectorListItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / private mode
  }
}

let items: ConnectorListItem[] = readStored();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getConnectorItems(): ConnectorListItem[] {
  return items;
}

export function subscribeConnectorItems(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addCustomConnector(input: { name: string; url: string }): ConnectorListItem {
  const name = input.name.trim();
  const url = input.url.trim();
  const item: ConnectorListItem = {
    id: `custom-${crypto.randomUUID()}`,
    name: name || url,
    description: url,
    isConnected: false,
    iconType: "mcp",
    url,
    source: "local-custom",
    searchTerms: [url, name].filter(Boolean),
  };
  items = [...items, item];
  writeStored(items);
  emit();
  return item;
}

export function removeConnector(id: string): void {
  items = items.filter((item) => item.id !== id);
  writeStored(items);
  emit();
}
