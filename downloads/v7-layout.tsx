// src/app/v7/layout.tsx
// VERSION: v7.1.1 - Minimales Layout
// Header wird von den einzelnen Seiten selbst gerendert

export default function V7Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
