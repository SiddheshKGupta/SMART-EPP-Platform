"use client";

import { Expand, PanelRightClose } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface AdaptiveSplitWorkspaceProps {
  listLabel: string;
  selectedLabel?: string;
  list: ReactNode;
  detail: ReactNode;
  isOpen: boolean;
  onClose(): void;
  onExpand?(): void;
}

export function AdaptiveSplitWorkspace({
  listLabel,
  selectedLabel,
  list,
  detail,
  isOpen,
  onClose,
  onExpand,
}: AdaptiveSplitWorkspaceProps) {
  const [isCompact, setIsCompact] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    }
    if (!isOpen && wasOpenRef.current) {
      returnFocusRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isCompact) return;
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>("[data-detail-heading]")
        ?.focus();
    });
  }, [isCompact, isOpen, selectedLabel]);

  if (isCompact) {
    return (
      <div className="adaptive-workspace adaptive-workspace-compact">
        <section className="adaptive-list" aria-label={listLabel}>
          {list}
        </section>
        <Sheet
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
        >
          <SheetContent
            className="adaptive-detail-sheet"
            aria-describedby="adaptive-detail-description"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              requestAnimationFrame(() => {
                document
                  .querySelector<HTMLElement>("[data-detail-heading]")
                  ?.focus();
              });
            }}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{selectedLabel ?? "Record detail"}</SheetTitle>
              <SheetDescription id="adaptive-detail-description">
                Review the selected master version and its controls.
              </SheetDescription>
            </SheetHeader>
            {detail}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="adaptive-workspace" data-detail-open={isOpen}>
      <section className="adaptive-list" aria-label={listLabel}>
        {list}
      </section>
      {isOpen ? (
        <aside className="adaptive-detail" aria-label={selectedLabel}>
          <div className="adaptive-detail-tools">
            {onExpand ? (
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={onExpand}
                aria-label="Expand detail"
              >
                <Expand aria-hidden />
              </Button>
            ) : null}
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Close detail"
            >
              <PanelRightClose aria-hidden />
            </Button>
          </div>
          {detail}
        </aside>
      ) : null}
    </div>
  );
}
