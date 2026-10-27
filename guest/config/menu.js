// Guest portal tabs. Each tab owns the routes listed in `paths`.
export const menu = [
  { key: "home", label: "Home", href: "/dashboard", icon: "home", paths: ["/dashboard"] },
  { key: "movies", label: "Movies", href: "/movies", icon: "movie", paths: ["/movies", "/booking"] },
  { key: "cinemas", label: "Cinemas", href: "/cinemas", icon: "theaters", paths: ["/cinemas"] },
  { key: "profile", label: "Profile", href: "/profile", icon: "account_circle", paths: ["/profile", "/about"] },
];

/** The tab whose routes contain the given pathname (without locale prefix). */
export function activeTabFor(pathname) {
  return (
    menu.find((item) => item.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) ?? menu[0]
  );
}
