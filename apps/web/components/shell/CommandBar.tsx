"use client";

import { ArrowRight, Play, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PLATFORM_MODULES } from "@smart-epp/domain";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatform } from "@/features/platform/store/PlatformProvider";
import { platformSubmoduleHref } from "./ModuleNavigation";

function actorLabel(roleKeys: readonly string[]) {
  return roleKeys[0]?.toLowerCase().split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") ?? "Profile";
}

export function CommandBar() {
  const router = useRouter();
  const { activeProfile, setActiveProfile, snapshot, startJourney, registerJourneyTrigger } = usePlatform();
  const demoTrigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const routes = useMemo(() => PLATFORM_MODULES.flatMap((module) => {
    const root = `/${module.slug}`;
    return [
      { label: module.label, href: root },
      ...module.submodules.map((submodule) => ({ label: `${module.label}: ${submodule.label}`, href: platformSubmoduleHref(module, submodule) })),
    ];
  }), []);

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

  useEffect(() => {
    registerJourneyTrigger(demoTrigger.current);
    return () => registerJourneyTrigger(null);
  }, [registerJourneyTrigger]);

  const navigate = (href: string) => { setOpen(false); router.push(href); };
  const startDemoJourney = () => {
    const journey = snapshot.guidedJourneys[0];
    if (journey) startJourney(journey.id);
  };

  return (
    <>
      <header className="command-bar" aria-label="Workspace controls">
        <Button className="command-trigger" variant="outline" onClick={() => setOpen(true)} aria-label="Open command menu">
          <Search aria-hidden /><span>Go to a workspace</span><kbd>Ctrl K</kbd>
        </Button>
        <div className="command-actions" aria-label="Command shortcuts">
          <Button ref={demoTrigger} variant="outline" size="sm" onClick={startDemoJourney}><Play aria-hidden />Start Demo Journey</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/workbench/my-tasks")}>Work queue</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/command-centre/control-alerts")}>Alerts</Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/command-centre/integration-health")}>Integration health</Button>
        </div>
        <div className="actor-control">
          <span className="actor-caption">Working as</span>
          <Select value={activeProfile.userId} onValueChange={(userId) => {
            const profile = snapshot.profiles.find((candidate) => candidate.userId === userId);
            if (profile) setActiveProfile(profile);
          }}>
            <SelectTrigger aria-label="Active role" role="button"><SelectValue>{actorLabel(activeProfile.roleKeys)}</SelectValue></SelectTrigger>
            <SelectContent align="end">{snapshot.profiles.map((profile) => <SelectItem key={profile.userId} value={profile.userId}>{actorLabel(profile.roleKeys)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </header>
      <CommandDialog open={open} onOpenChange={setOpen} title="Platform navigation" description="Go directly to a Smart EPP capability." className="command-dialog">
        <Command><CommandInput autoFocus aria-label="Search commands" placeholder="Go to a workspace…" /><CommandList><CommandEmpty>No matching destination.</CommandEmpty><CommandGroup heading="Capabilities">{routes.map((route) => <CommandItem key={`${route.label}-${route.href}`} value={route.label} onSelect={() => navigate(route.href)}><span>{route.label}</span><CommandShortcut><ArrowRight aria-hidden /></CommandShortcut></CommandItem>)}</CommandGroup></CommandList></Command>
      </CommandDialog>
    </>
  );
}
