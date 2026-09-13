"use client";

/**
 * Chrome-style tab bar: active tab connects flush to the panel below.
 */
export function BrowserTabs({ className = "", children }) {
  return <div className={`browser-tabs${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function BrowserTabBar({ className = "", children, ...props }) {
  return (
    <div className={`browser-tabs__bar${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </div>
  );
}

export function BrowserTab({
  active = false,
  used = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      type="button"
      role="tab"
      className={`browser-tabs__tab${active ? " browser-tabs__tab--active" : ""}${
        used ? " browser-tabs__tab--used" : ""
      }${className ? ` ${className}` : ""}`}
      aria-selected={active}
      {...props}
    >
      {children}
    </button>
  );
}

export function BrowserTabPanel({ className = "", children, ...props }) {
  return (
    <div className={`browser-tabs__panel${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </div>
  );
}
