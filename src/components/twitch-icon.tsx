import type { SVGProps } from "react";

export default function TwitchIcon({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M4.5 2 1 5.5V19h5v3l3-3h4l7-7V2H4.5Zm13.7 9.1-3.8 3.8h-4l-2.7 2.7v-2.7H4.8V3.8h13.4v7.3ZM14.4 6h1.5v4.5h-1.5V6Zm-4 0h1.5v4.5h-1.5V6Z" /></svg>;
}
