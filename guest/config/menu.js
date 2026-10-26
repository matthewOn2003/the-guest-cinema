// The guest portal currently has one tab. Each tab owns the routes listed in `paths`.
export const menu = [
  {
    key: "dashboard",
    labelKey: "portal_nav_home",
    href: "/dashboard",
    icon: "home",
    paths: ["/dashboard"],
  },
];

/** The tab whose routes contain the given pathname (without locale prefix). */
export function activeTabFor(pathname) {
  return (
    menu.find((item) => item.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) ?? menu[0]
  );
}
