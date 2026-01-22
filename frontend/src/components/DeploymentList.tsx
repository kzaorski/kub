import { useState, useEffect } from "react";
import React from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { DeploymentRow } from "./DeploymentRow";
import { DeploymentCard } from "./DeploymentCard";
import { useTableSort } from "@/hooks/useTableSort";
import type { Deployment } from "@/types/k8s";

interface DeploymentListProps {
  deployments: (Deployment & { animationClass?: string })[];
  isLoading: boolean;
}

export function DeploymentList({ deployments, isLoading }: DeploymentListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Clear selection when deployments change
  useEffect(() => {
    if (selectedKey && !deployments.find(d => `${d.namespace}/${d.name}` === selectedKey)) {
      setSelectedKey(null);
    }
  }, [deployments, selectedKey]);

  const toggle = (deployment: Deployment) => {
    const key = `${deployment.namespace}/${deployment.name}`;
    setSelectedKey(selectedKey === key ? null : key);
  };

  // Add readyRatio for sorting
  const deploymentsWithRatio = deployments.map(d => ({
    ...d,
    readyRatio: d.replicas > 0 ? d.readyReplicas / d.replicas : 0,
  }));

  const { sortedItems, handleSort, getSortDirection } = useTableSort(deploymentsWithRatio, {
    key: 'readyRatio',
    direction: 'desc',
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

  if (deployments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">📦</div>
        <h3 className="text-lg font-medium">No deployments found</h3>
        <p className="text-sm text-muted-foreground">
          There are no deployments in this namespace
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
          <SortableTableHead onSort={() => handleSort('readyRatio')} sortDirection={getSortDirection('readyRatio')}>
            Ready
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('strategy')} sortDirection={getSortDirection('strategy')}>
            Strategy
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('age')} sortDirection={getSortDirection('age')}>
            Age
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.map((deployment) => {
          const key = `${deployment.namespace}/${deployment.name}`;
          const isSelected = selectedKey === key;
          return (
            <React.Fragment key={key}>
              <DeploymentRow deployment={deployment} isSelected={isSelected} onClick={() => toggle(deployment)} />
              {isSelected && (
                <TableRow>
                  <TableCell colSpan={6} className="p-4 bg-muted/30">
                    <DeploymentCard deployment={deployment} />
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
