import React from 'react';

type P = { size?: number; style?: React.CSSProperties };

function Svg({ size = 22, style, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none', ...style }}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconChat = (p: P) => (
  <Svg {...p}>
    <path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4.5 4v-11.5A7.5 7.5 0 0 1 11 4h2.5A7.5 7.5 0 0 1 21 11.5z" />
  </Svg>
);

export const IconKey = (p: P) => (
  <Svg {...p}>
    <circle cx="8.5" cy="15.5" r="4.5" />
    <path d="M11.8 12.2 20 4M16.5 7.5l3 3M13.5 10.5l2.5 2.5" />
  </Svg>
);

export const IconGear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.89a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.05a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M10 5h4M10 5v2M14 5v2M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </Svg>
);

export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Svg>
);

export const IconClip = (p: P) => (
  <Svg {...p}>
    <path d="m21 11-8.5 8.5a5.5 5.5 0 0 1-7.78-7.78L13 3.5a3.67 3.67 0 0 1 5.19 5.19l-8.28 8.28a1.83 1.83 0 0 1-2.6-2.6L15 6.7" />
  </Svg>
);

export const IconSend = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </Svg>
);

export const IconStop = (p: P) => (
  <Svg {...p} >
    <rect x="7" y="7" width="10" height="10" rx="2.5" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="10.5" width="14" height="10" rx="3" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.8L19.7 10.7l-5.8 1.9L12 18.4l-1.9-5.8L4.3 10.7l5.8-1.9L12 3zM19 16l.9 2.6 2.6.9-2.6.9L19 23l-.9-2.6-2.6-.9 2.6-.9L19 16z" />
  </Svg>
);

export const IconRefresh = (p: P) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66M20 3.5V8h-4.5" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </Svg>
);

export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 5.5 18.5 9.5 8 20l-4.7.7L4 16 14.5 5.5z" />
  </Svg>
);

export const IconUp = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
  </Svg>
);

export const IconDown = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5.5 12.5 12 19l6.5-6.5" />
  </Svg>
);

export const IconDoc = (p: P) => (
  <Svg {...p}>
    <path d="M6 3h8l4 4v14H6V3zM14 3v4h4" />
  </Svg>
);

export const IconWallpaper = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="3" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m6 17 4.5-4.5 3 3L17 12l2.5 2.5" />
  </Svg>
);

export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);

export const IconEyeOff = (p: P) => (
  <Svg {...p}>
    <path d="M4 4l16 16" />
    <path d="M10.6 6.1A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 3.9M6.6 6.9A16.4 16.4 0 0 0 2.5 12S6 18.5 12 18.5c1.1 0 2.2-.2 3.1-.6" />
    <path d="M9.9 9.9a2.9 2.9 0 0 0 4.1 4.1" />
  </Svg>
);
