import { ReactNode } from "react";

export type IconName = "home" | "spark" | "trend" | "chat" | "doc" | "folder" | "play" | "external" | "arrow" | "plus" | "mail" | "lock" | "shield" | "logout" | "menu" | "download" | "check" | "star" | "search" | "target" | "close" | "calendar" | "map" | "steps" | "list" | "page" | "code" | "copy" | "calc" | "rocket" | "cube" | "bot" | "send" | "image";

const iconPaths: Record<IconName, ReactNode> = {
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  spark: (
    <>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v11H8l-4 4z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  doc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </>
  ),
  folder: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M12 10v5M9.5 12.5 12 15l2.5-2.5" />
    </>
  ),
  play: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="3" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z" />,
  logout: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  check: <path d="m5 12 5 5 9-10" />,
  star: <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="currentColor" stroke="none" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2.5" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />,
  steps: <path d="M4 19h5v-5h5V9h5V4" />,
  list: (
    <>
      <path d="m4 7 1.5 1.5L8 6M4 13l1.5 1.5L8 12M4 19l1.5 1.5L8 18" />
      <path d="M11 7h9M11 13h9M11 19h9" />
    </>
  ),
  page: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M7 13h6M7 16h10" />
    </>
  ),
  code: <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />,
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m21 16-5-5-9 9" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  calc: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h.01M12 18h.01" />
    </>
  ),
  rocket: (
    <>
      <path d="M14 4c3-1 6-1 6-1s0 3-1 6l-6 6-5-5z" />
      <path d="M8 10H5l-2 3 4 1M14 16v3l-3 2-1-4M5 19c0-2 1-3 2-3s2 1 2 2-1 2-4 1z" />
    </>
  ),
  cube: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 4v4M9 13h.01M15 13h.01M9 16h6" />
    </>
  ),
  send: <path d="M4 12 20 4l-6 16-3-7z" />,
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name]}
    </svg>
  );
}
