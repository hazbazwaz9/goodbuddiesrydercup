/**
 * GBRC crest logo. Renders the brand image from /public/logo.png.
 * Size it via className, e.g. "h-9 w-auto". Aspect ratio is preserved.
 */
export function Logo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logo.png"
      alt="Good Buddies Ryder Cup"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
