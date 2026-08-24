/**
 * Official index-BELzQL5P UYt / $Yt residual.
 *
 *   UYt = zustand({ pending, open, close })
 *   $Yt(sessionId, action) → getUncommittedChanges; empty → true;
 *     else Promise resolved by VYt ConfirmDialog.
 */

export type OfficialWorktreeDisposalAction = "archive" | "delete";

export type OfficialWorktreeDisposalPending = {
  action: OfficialWorktreeDisposalAction;
  changes: string[];
  resolve: (confirmed: boolean) => void;
};

type StoreState = {
  close: () => void;
  open: (pending: OfficialWorktreeDisposalPending) => void;
  pending: OfficialWorktreeDisposalPending | null;
};

type Listener = () => void;

let pending: OfficialWorktreeDisposalPending | null = null;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export const officialWorktreeDisposalStore = {
  getState(): StoreState {
    return {
      pending,
      open: (next) => {
        pending = next;
        emit();
      },
      close: () => {
        pending = null;
        emit();
      },
    };
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Official $Yt(sessionId, "archive"|"delete").
 * Missing getUncommittedChanges / error / empty → true (proceed).
 * User cancel → false.
 */
export async function confirmOfficialWorktreeDisposal(
  sessionId: string,
  action: OfficialWorktreeDisposalAction,
  getUncommittedChanges?: (id: string) => Promise<string[] | null>,
): Promise<boolean> {
  if (!getUncommittedChanges) return true;
  let changes: string[] | null = null;
  try {
    changes = await getUncommittedChanges(sessionId);
  } catch {
    return true;
  }
  // Official $Yt: !n || n.length===0 → true (null = no managed worktree).
  if (!changes || changes.length === 0) return true;
  return new Promise<boolean>((resolve) => {
    officialWorktreeDisposalStore.getState().open({
      changes,
      action,
      resolve,
    });
  });
}
