import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, focusable: false, ...p,
});

export const ChevronDown = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>);
export const Paperclip = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>);
export const SendPlane = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7Z" /></svg>);
export const StopSquare = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)} fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2.5" /></svg>);
export const Locate = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>);
export const Copy = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>);
export const Check = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="m5 12 5 5L20 7" /></svg>);
export const Volume = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>);
export const Flag = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M4 22V4M4 4h13l-2 4 2 4H4" /></svg>);
export const X = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>);
export const Alert = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v5M12 18h.01" /></svg>);
export const Info = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>);
export const External = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>);
export const ArrowDown = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M12 5v14M6 13l6 6 6-6" /></svg>);
export const Bookmark = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>);
export const Mic = (p: SVGProps<SVGSVGElement>) => (<svg {...base(p)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>);
