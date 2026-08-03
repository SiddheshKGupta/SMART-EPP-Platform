import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

export default function Link({
  href,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) {
  const routeHref = href.startsWith("#") ? href : `#${href}`;
  return (
    <a
      {...props}
      href={routeHref}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (href.startsWith("#") && !href.startsWith("#/")) {
          event.preventDefault();
          document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
          return;
        }
        if (href.startsWith("/")) {
          event.preventDefault();
          window.location.hash = href;
          window.location.reload();
        }
      }}
    >
      {children}
    </a>
  );
}
