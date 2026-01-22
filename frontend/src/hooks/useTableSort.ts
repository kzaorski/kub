import { useState, useMemo } from "react";

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Status priority for Pods
const statusPriority: Record<string, number> = {
  Running: 0,
  Pending: 1,
  Terminating: 2,
  Failed: 3,
  Unknown: 4,
};

// Helper to get nested value from object by key path
function getValueByKey<T extends Record<string, any>>(obj: T, key: string): any {
  return obj[key];
}

// Custom sort function that handles different types
function compareValues<T extends Record<string, any>>(
  a: T,
  b: T,
  key: string,
  direction: 'asc' | 'desc'
): number {
  const aValue = getValueByKey(a, key);
  const bValue = getValueByKey(b, key);

  // Handle null/undefined
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return direction === 'asc' ? -1 : 1;
  if (bValue == null) return direction === 'asc' ? 1 : -1;

  // Special handling for status field (Pods, Nodes)
  if (key === 'status' && typeof aValue === 'string' && typeof bValue === 'string') {
    const aPriority = statusPriority[aValue] ?? 99;
    const bPriority = statusPriority[bValue] ?? 99;
    const result = aPriority - bPriority;
    return direction === 'asc' ? result : -result;
  }

  // String comparison
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    const result = aValue.localeCompare(bValue);
    return direction === 'asc' ? result : -result;
  }

  // Number comparison
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    const result = aValue - bValue;
    return direction === 'asc' ? result : -result;
  }

  // Boolean comparison
  if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
    const result = aValue === bValue ? 0 : aValue ? -1 : 1;
    return direction === 'asc' ? result : -result;
  }

  return 0;
}

export function useTableSort<T extends Record<string, any>>(
  items: T[],
  initialSort?: SortConfig
) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(initialSort ?? null);

  const sortedItems = useMemo(() => {
    if (!sortConfig) {
      return items;
    }

    const sortableItems = [...items];
    sortableItems.sort((a, b) =>
      compareValues(a, b, sortConfig.key, sortConfig.direction)
    );
    return sortableItems;
  }, [items, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        // Toggle to null (no sort) on third click
        setSortConfig(null);
        return;
      }
    }
    setSortConfig({ key, direction });
  };

  const getSortDirection = (key: string): 'asc' | 'desc' | null => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction;
  };

  return {
    sortedItems,
    sortConfig,
    handleSort,
    getSortDirection,
  };
}
