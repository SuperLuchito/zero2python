import { ProgressStrip } from "@/components/ProgressStrip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProgressStrip />
      {children}
    </>
  );
}
