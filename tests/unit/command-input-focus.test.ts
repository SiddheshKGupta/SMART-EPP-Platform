import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import { Command, CommandInput } from "../../apps/web/components/ui/command";

test("command input participates in the input group focus-visible contract", () => {
  const markup = renderToStaticMarkup(
    createElement(Command, null, createElement(CommandInput, { placeholder: "Search" })),
  );

  expect(markup).toContain('data-slot="input-group-control"');
});
