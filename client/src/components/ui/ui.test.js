// Behaviour tests for the shared UI kit (keyboard, focus, ARIA state).
// Uses react-dom directly, so no extra test libraries are needed.
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import Tabs from "./Tabs";
import Modal from "./Modal";
import Button from "./Button";
import { Switch, PasswordField, SearchInput } from "./Input";
import { Pagination, pageList, Breadcrumbs } from "./Navigation";
import { useScrollLock } from "../../lib/a11y";

// CRA's Jest can't resolve react-router v7's package exports; these components
// only need <Link>, which renders an anchor.
jest.mock("react-router-dom", () => {
  const R = require("react");
  return {
    Link: R.forwardRef(({ to, children, ...rest }, ref) => R.createElement("a", { href: to, ref, ...rest }, children)),
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
beforeEach(() => {
  // jsdom has no layout; report every element as rendered so focus helpers see it.
  jest.spyOn(Element.prototype, "getClientRects").mockReturnValue([{ width: 1, height: 1 }]);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.restoreAllMocks();
  document.body.style.overflow = "";
});

const render = (ui) => act(() => root.render(ui));
const key = (el, k, opts = {}) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ...opts }));
  });
const click = (el) => act(() => el.dispatchEvent(new MouseEvent("click", { bubbles: true })));

function TabsHarness() {
  const [value, setValue] = useState("a");
  return (
    <Tabs
      label="Sections"
      idPrefix="t"
      value={value}
      onChange={setValue}
      items={[
        { id: "a", label: "Alpha", count: 2 },
        { id: "b", label: "Beta" },
        { id: "c", label: "Gamma" },
      ]}
    />
  );
}

describe("Tabs", () => {
  test("exposes one tab stop and the ARIA tab pattern", () => {
    render(<TabsHarness />);
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(container.querySelector('[role="tablist"]').getAttribute("aria-label")).toBe("Sections");
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-controls")).toBe("t-panel-a");
  });

  test("arrow keys, Home and End move focus and selection, wrapping around", () => {
    render(<TabsHarness />);
    const get = () => [...container.querySelectorAll('[role="tab"]')];
    get()[0].focus();
    key(get()[0], "ArrowRight");
    expect(get()[1].getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(get()[1]);
    key(get()[1], "End");
    expect(get()[2].getAttribute("aria-selected")).toBe("true");
    key(get()[2], "ArrowRight");
    expect(get()[0].getAttribute("aria-selected")).toBe("true");
    key(get()[0], "ArrowLeft");
    expect(get()[2].getAttribute("aria-selected")).toBe("true");
    key(get()[2], "Home");
    expect(get()[0].getAttribute("aria-selected")).toBe("true");
  });
});

function ModalHarness({ onClose }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button id="opener" onClick={() => setOpen(true)}>
        Open
      </button>
      <Modal
        isOpen={open}
        title="Confirm seats"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <button id="inside-a">A</button>
        <button id="inside-b">B</button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  test("is labelled by its title, traps Tab, closes on Escape and restores focus", () => {
    const onClose = jest.fn();
    render(<ModalHarness onClose={onClose} />);
    const opener = container.querySelector("#opener");
    opener.focus();
    click(opener);

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(document.getElementById(titleId).textContent).toBe("Confirm seats");
    expect(document.body.style.overflow).toBe("hidden");

    // Focusable order: Close button, A, B. Tab from the last wraps to the first.
    const items = [...dialog.querySelectorAll("button")];
    const last = items[items.length - 1];
    last.focus();
    key(last, "Tab");
    expect(document.activeElement).toBe(items[0]);
    key(items[0], "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);

    key(document.activeElement, "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Button", () => {
  test("loading disables it, marks it busy and shows the loading text", () => {
    render(
      <Button loading loadingText="Saving…">
        Save
      </Button>
    );
    const btn = container.querySelector("button");
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
    expect(btn.textContent).toContain("Saving…");
    expect(btn.className).toContain("btn-primary");
  });

  test("renders a link when given `to`", () => {
    render(
      <Button to="/movies" variant="secondary">
        Browse
      </Button>
    );
    const a = container.querySelector("a");
    expect(a.getAttribute("href")).toBe("/movies");
    expect(a.className).toContain("btn-secondary");
  });
});

describe("Form controls", () => {
  test("Switch reports and toggles its state", () => {
    function S() {
      const [on, setOn] = useState(false);
      return <Switch label="Automatic mode" checked={on} onChange={setOn} />;
    }
    render(<S />);
    const sw = container.querySelector('[role="switch"]');
    expect(sw.getAttribute("aria-checked")).toBe("false");
    expect(document.getElementById(sw.getAttribute("aria-labelledby")).textContent).toBe("Automatic mode");
    click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  test("PasswordField links its error and toggles visibility", () => {
    render(<PasswordField id="pw" label="Password" error="Use at least 8 characters." />);
    const input = container.querySelector("#pw");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(input.getAttribute("aria-describedby")).textContent).toBe("Use at least 8 characters.");
    expect(container.querySelector('label[for="pw"]').textContent).toBe("Password");
    const toggle = container.querySelector('button[aria-label="Show password"]');
    click(toggle);
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-label")).toBe("Hide password");
  });

  test("SearchInput has a label and a clear button once there is text", () => {
    const onChange = jest.fn();
    render(<SearchInput id="q" label="Search movies" value="neon" onChange={onChange} />);
    expect(container.querySelector('label[for="q"]').textContent).toBe("Search movies");
    click(container.querySelector('button[aria-label="Clear search"]'));
    expect(onChange).toHaveBeenCalledWith({ target: { value: "" } });
  });
});

describe("Navigation", () => {
  test("pageList keeps the ends and neighbours and marks gaps", () => {
    expect(pageList(1, 1)).toEqual([1]);
    expect(pageList(1, 5)).toEqual([1, 2, null, 5]);
    expect(pageList(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageList(10, 10)).toEqual([1, null, 9, 10]);
  });

  test("Pagination marks the current page and disables Previous on page 1", () => {
    const onChange = jest.fn();
    render(<Pagination page={1} pageCount={3} total={30} pageSize={12} onChange={onChange} />);
    expect(container.querySelector('[aria-current="page"]').textContent).toBe("1");
    expect(container.querySelector('button[aria-label="Previous page"]').disabled).toBe(true);
    expect(container.textContent).toContain("1–12");
    click(container.querySelector('button[aria-label="Next page"]'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  test("Pagination renders nothing for a single page", () => {
    render(<Pagination page={1} pageCount={1} onChange={() => {}} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  test("Breadcrumbs link earlier items and mark the current page", () => {
    render(<Breadcrumbs items={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Movies" }]} />);
    expect(container.querySelector("a").getAttribute("href")).toBe("/admin/dashboard");
    expect(container.querySelector('[aria-current="page"]').textContent).toBe("Movies");
  });
});

describe("useScrollLock", () => {
  test("only restores scrolling when the last overlay closes", () => {
    function Lock({ on }) {
      useScrollLock(on);
      return null;
    }
    function Two({ a, b }) {
      return (
        <>
          <Lock on={a} />
          <Lock on={b} />
        </>
      );
    }
    render(<Two a b />);
    expect(document.body.style.overflow).toBe("hidden");
    render(<Two a={false} b />);
    expect(document.body.style.overflow).toBe("hidden");
    render(<Two a={false} b={false} />);
    expect(document.body.style.overflow).toBe("");
  });
});
