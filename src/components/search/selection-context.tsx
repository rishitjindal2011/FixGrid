"use client";

import * as React from "react";

/**
 * Shared hover / selection state for the results list and the map.
 *
 * The two views are siblings, not parent and child, and the list is a long
 * server-rendered tree. Lifting this into React state on the page would make
 * the whole page a client component; a tiny context keeps the boundary at the
 * two pieces that actually need to talk to each other.
 */

export interface SelectionState {
  /** Fixer id under the cursor, in either view. */
  hoveredId: string | null;
  /** Fixer id the visitor clicked — the map pans to this one. */
  selectedId: string | null;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
}

const SelectionContext = React.createContext<SelectionState | null>(null);

export function SelectionProvider({ children }: { children: React.ReactNode }) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const value = React.useMemo<SelectionState>(
    () => ({ hoveredId, selectedId, setHoveredId, setSelectedId }),
    [hoveredId, selectedId],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

/**
 * Returns a no-op implementation outside a provider rather than throwing, so a
 * result card can also be rendered standalone (on the home page, say) without
 * dragging the map machinery along.
 */
export function useSelection(): SelectionState {
  const context = React.useContext(SelectionContext);
  return context ?? NO_SELECTION;
}

const NO_SELECTION: SelectionState = {
  hoveredId: null,
  selectedId: null,
  setHoveredId: () => {},
  setSelectedId: () => {},
};
