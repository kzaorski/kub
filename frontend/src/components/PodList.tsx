import { useState, useEffect } from "react";
import React from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { PodRow } from "./PodRow";
import { PodCard } from "./PodCard";
import { useTableSort } from "@/hooks/useTableSort";
import type { Pod } from "@/types/k8s";

interface PodListProps {
  pods: (Pod & { animationClass?: string })[];
  isLoading: boolean;
}

export function PodList({ pods, isLoading }: PodListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Clear selection when pods change (e.g., pod deleted)
  useEffect(() => {
    if (selectedKey && !pods.find(p => `${p.namespace}/${p.name}` === selectedKey)) {
      setSelectedKey(null);
    }
  }, [pods, selectedKey]);

  const toggle = (pod: Pod) => {
    const key = `${pod.namespace}/${pod.name}`;
    setSelectedKey(selectedKey === key ? null : key);
  };

  const { sortedItems, handleSort, getSortDirection } = useTableSort(pods, {
    key: 'status',
    direction: 'asc',
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-lg border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (pods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">🫙</div>
        <h3 className="text-lg font-medium">No pods found</h3>
        <p className="text-sm text-muted-foreground">
          There are no pods in this namespace
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <SortableTableHead onSort={() => handleSort('name')} sortDirection={getSortDirection('name')}>
            Name
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('namespace')} sortDirection={getSortDirection('namespace')}>
            Namespace
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('ready')} sortDirection={getSortDirection('ready')}>
            Ready
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('restarts')} sortDirection={getSortDirection('restarts')}>
            Restarts
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('age')} sortDirection={getSortDirection('age')}>
            Age
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.map((pod) => {
          const key = `${pod.namespace}/${pod.name}`;
          const isSelected = selectedKey === key;
          return (
            <React.Fragment key={key}>
              <PodRow pod={pod} isSelected={isSelected} onClick={() => toggle(pod)} />
              {isSelected && (
                <TableRow>
                  <TableCell colSpan={6} className="p-4 bg-muted/30">
                    <PodCard pod={pod} />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
