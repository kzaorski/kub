import { useState, useEffect } from "react";
import React from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { ServiceRow } from "./ServiceRow";
import { ServiceCard } from "./ServiceCard";
import { useTableSort } from "@/hooks/useTableSort";
import type { Service } from "@/types/k8s";

interface ServiceListProps {
  services: (Service & { animationClass?: string })[];
  isLoading: boolean;
}

export function ServiceList({ services, isLoading }: ServiceListProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Clear selection when services change
  useEffect(() => {
    if (selectedKey && !services.find(s => `${s.namespace}/${s.name}` === selectedKey)) {
      setSelectedKey(null);
    }
  }, [services, selectedKey]);

  const toggle = (service: Service) => {
    const key = `${service.namespace}/${service.name}`;
    setSelectedKey(selectedKey === key ? null : key);
  };

  const { sortedItems, handleSort, getSortDirection } = useTableSort(services, {
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

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-4">🌐</div>
        <h3 className="text-lg font-medium">No services found</h3>
        <p className="text-sm text-muted-foreground">
          There are no services in this namespace
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
          <SortableTableHead onSort={() => handleSort('type')} sortDirection={getSortDirection('type')}>
            Type
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('clusterIP')} sortDirection={getSortDirection('clusterIP')}>
            Cluster IP
          </SortableTableHead>
          <SortableTableHead onSort={() => handleSort('age')} sortDirection={getSortDirection('age')}>
            Age
          </SortableTableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedItems.map((service) => {
          const key = `${service.namespace}/${service.name}`;
          const isSelected = selectedKey === key;
          return (
            <React.Fragment key={key}>
              <ServiceRow service={service} isSelected={isSelected} onClick={() => toggle(service)} />
              {isSelected && (
                <TableRow>
                  <TableCell colSpan={7} className="p-4 bg-muted/30">
                    <ServiceCard service={service} />
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
