import { useState, useEffect } from "react";
import React from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ConfigMapRow } from "./ConfigMapRow";
import { ConfigMapCard } from "./ConfigMapCard";
import { useTableSort } from "@/hooks/useTableSort";
import type { ConfigMap } from "@/types/k8s";

interface ConfigMapListProps {
  configmaps: (ConfigMap & { animationClass?: string })[];
  isLoading: boolean;
}

export function ConfigMapList({ configmaps, isLoading }: ConfigMapListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Clear selection when configmaps change
  useEffect(() => {
    if (selectedKey && !configmaps.find(c => `${c.namespace}/${c.name}` === selectedKey)) {
      setSelectedKey(null);
    }
  }, [configmaps, selectedKey]);

  const toggle = (configmap: ConfigMap) => {
    const key = `${configmap.namespace}/${configmap.name}`;
    setSelectedKey(selectedKey === key ? null : key);
  };

  const { sortedItems, handleSort, getSortDirection } = useTableSort(configmaps, {
    key: 'name',
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

  if (configmaps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📄</div>
        <h3 className="text-lg font-medium">No configmaps found</h3>
        <p className="text-sm text-muted-foreground">
          There are no configmaps in this namespace
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
          <SortableTableHead onSort={() => handleSort('dataCount')} sortDirection={getSortDirection('dataCount')}>
            Keys
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('age')} sortDirection={getSortDirection('age')}>
            Age
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.map((configmap) => {
          const key = `${configmap.namespace}/${configmap.name}`;
          const isSelected = selectedKey === key;
          return (
            <React.Fragment key={key}>
              <ConfigMapRow configmap={configmap} isSelected={isSelected} onClick={() => toggle(configmap)} />
              {isSelected && (
                <TableRow>
                  <TableCell colSpan={5} className="p-4 bg-muted/30">
                    <ConfigMapCard configmap={configmap} />
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
