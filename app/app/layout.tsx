import { ProgressStrip } from "@/components/ProgressStrip";
import { ProgressProvider } from "@/components/ProgressProvider";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProgressProvider>
      <ProgressStrip />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </ProgressProvider>
  );
}
