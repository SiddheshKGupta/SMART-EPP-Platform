"use client";

import {
  ArrowRight,
  ClipboardCheck,
  Database,
  FileInput,
  LayoutDashboard,
  ScrollText,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubvention } from "@/features/subvention/store/SubventionProvider";

interface CommandRoute {
  label: string;
  href: string;
  icon: ComponentType<{ "aria-hidden"?: boolean; className?: string }>;
}

const routes: CommandRoute[] = [
  { label: "Subvention overview", href: "/subvention", icon: LayoutDashboard },
  { label: "Operations workbench", href: "/subvention/operations", icon: ClipboardCheck },
  { label: "Upload documents", href: "/subvention/purchase-imports", icon: FileInput },
  { label: "Claims and tracking", href: "/subvention/claims", icon: ScrollText },
  { label: "Master data", href: "/subvention/masters", icon: Database },
  { label: "Data model", href: "/subvention/administration/data-model", icon: Database },
];

function actorLabel(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function CommandBar() {
  const router = useRouter();
  const { activeActor, setActiveActor, snapshot } = useSubvention();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <header className="command-bar" aria-label="Workspace controls">
        <Button
          className="command-trigger"
          variant="outline"
          onClick={() => setOpen(true)}
          aria-label="Open command menu"
        >
          <Search aria-hidden />
          <span>Go to a Subvention workspace</span>
          <kbd>Ctrl K</kbd>
        </Button>

        <div className="actor-control">
          <span className="actor-caption">Working as</span>
          <Select
            value={activeActor.userId}
            onValueChange={(userId) => {
              const actor = snapshot.actors.find(
                (candidate) => candidate.userId === userId,
              );
              if (actor) setActiveActor(actor);
            }}
          >
            <SelectTrigger aria-label="Active role" role="button">
              <SelectValue>{actorLabel(activeActor.role)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {snapshot.actors.map((actor) => (
                <SelectItem key={actor.userId} value={actor.userId}>
                  {actorLabel(actor.role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Subvention navigation"
        description="Go directly to a Subvention workspace."
        className="command-dialog"
      >
        <Command>
          <CommandInput
            autoFocus
            aria-label="Search commands"
            placeholder="Go to a workspace…"
          />
          <CommandList>
            <CommandEmpty>No matching destination.</CommandEmpty>
            <CommandGroup heading="Go to">
              {routes.map((route) => {
                const Icon = route.icon;
                return (
                  <CommandItem
                    key={route.href}
                    value={route.label}
                    onSelect={() => navigate(route.href)}
                  >
                    <Icon aria-hidden />
                    <span>{route.label}</span>
                    <CommandShortcut>
                      <ArrowRight aria-hidden />
                    </CommandShortcut>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
