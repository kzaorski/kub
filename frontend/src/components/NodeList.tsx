import { useState, useEffect } from "react";
import React from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { NodeRow } from "./NodeRow";
import { NodeCard } from "./NodeCard";
import { useTableSort } from "@/hooks/useTableSort";
import type { Node } from "@/types/k8s";

interface NodeListProps {
  nodes: Node[];
  isLoading: boolean;
}

export function NodeList({ nodes, isLoading }: NodeListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Clear selection when nodes change
  useEffect(() => {
    if (selectedKey && !nodes.find(n => n.name === selectedKey)) {
      setSelectedKey(null);
    }
  }, [nodes, selectedKey]);

  const toggle = (node: Node) => {
    setSelectedKey(selectedKey === node.name ? null : node.name);
  };

  // Add isControlPlane for sorting
  const nodesWithControl = nodes.map(n => ({
    ...n,
    isControlPlane: n.roles.includes("control-plane") || n.roles.includes("master"),
  }));

  const { sortedItems, handleSort, getSortDirection } = useTableSort(nodesWithControl, {
    key: 'isControlPlane',
    direction: 'desc',
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-lg border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">
          <svg className="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No nodes found</h3>
        <p className="text-sm text-muted-foreground">
          Unable to retrieve cluster nodes
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
          <SortableTableHead onSort={() => handleSort('roles')} sortDirection={getSortDirection('roles')}>
            Roles
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('status')} sortDirection={getSortDirection('status')}>
            Status
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('cpuPercent')} sortDirection={getSortDirection('cpuPercent')}>
            CPU %
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('memoryPercent')} sortDirection={getSortDirection('memoryPercent')}>
            Mem %
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('podCount')} sortDirection={getSortDirection('podCount')}>
            Pods
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('age')} sortDirection={getSortDirection('age')}>
            Age
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.map((node) => {
          const isSelected = selectedKey === node.name;
          return (
            <React.Fragment key={node.name}>
              <NodeRow node={node} isSelected={isSelected} onClick={() => toggle(node)} />
              {isSelected && (
                <TableRow>
                  <TableCell colSpan={8} className="p-4 bg-muted/30">
                    <NodeCard node={node} />
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
