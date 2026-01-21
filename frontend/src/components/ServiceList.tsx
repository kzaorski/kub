import { ServiceCard } from "./ServiceCard";
import type { Service } from "@/types/k8s";

interface ServiceListProps {
  services: (Service & { animationClass?: string })[];
  isLoading: boolean;
}

export function ServiceList({ services, isLoading }: ServiceListProps) {
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

  // Sort services by name
  const sortedServices = [...services].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedServices.map((service) => (
        <ServiceCard key={`${service.namespace}/${service.name}`} service={service} />
      ))}
    </div>
  );
}
