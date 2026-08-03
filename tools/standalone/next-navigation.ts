import { useEffect, useState } from "react";

function routeValue() {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.startsWith("/") ? hash : "/subvention";
}

function useRoute() {
  const [route, setRoute] = useState(routeValue);
  useEffect(() => {
    const update = () => setRoute(routeValue());
    window.addEventListener("hashchange", update);
    update();
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

export function usePathname() {
  return useRoute().split("?")[0] || "/subvention";
}

export function useSearchParams() {
  return new URLSearchParams(useRoute().split("?")[1] ?? "");
}

function navigate(href: string) {
  if (href.startsWith("#") && !href.startsWith("#/")) {
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    return;
  }
  window.location.hash = href.startsWith("/") ? href : `/subvention${href}`;
}

export function useRouter() {
  return {
    push: navigate,
    replace: navigate,
    refresh: () => window.dispatchEvent(new HashChangeEvent("hashchange")),
    back: () => window.history.back(),
    forward: () => window.history.forward(),
    prefetch: async () => undefined,
  };
}
