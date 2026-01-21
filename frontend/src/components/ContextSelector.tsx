import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Namespace } from "@/types/k8s";

interface ContextSelectorProps {
  selectedNamespace: string;
  onNamespaceChange: (namespace: string) => void;
  onContextChange?: () => void;
}

export function ContextSelector({
  selectedNamespace,
  onNamespaceChange,
  onContextChange,
}: ContextSelectorProps) {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [contexts, setContexts] = useState<string[]>([]);
  const [currentContext, setCurrentContext] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch namespaces
    fetch("/api/namespaces")
      .then((res) => res.json())
      .then((data) => {
        setNamespaces(data || []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch namespaces:", err);
        setIsLoading(false);
      });

    // Fetch contexts
    fetch("/api/contexts")
      .then((res) => res.json())
      .then((data) => {
        setContexts(data.contexts || []);
        setCurrentContext(data.current || "");
      })
      .catch((err) => {
        console.error("Failed to fetch contexts:", err);
      });
  }, []);

  const handleContextChange = async (context: string) => {
    try {
      const res = await fetch("/api/contexts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      if (res.ok) {
        setCurrentContext(context);
        // Refresh namespaces for new context
        const nsRes = await fetch("/api/namespaces");
        const nsData = await nsRes.json();
        setNamespaces(nsData || []);
        onNamespaceChange("all");
        onContextChange?.();
      }
    } catch (err) {
      console.error("Failed to switch context:", err);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {contexts.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Context:</span>
          <Select value={currentContext} onValueChange={handleContextChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select context" />
            </SelectTrigger>
            <SelectContent>
              {contexts.map((ctx) => (
                <SelectItem key={ctx} value={ctx}>
                  {ctx}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Namespace:</span>
        <Select
          value={selectedNamespace}
          onValueChange={onNamespaceChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select namespace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All namespaces</SelectItem>
            {namespaces.map((ns) => (
              <SelectItem key={ns.name} value={ns.name}>
                {ns.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
