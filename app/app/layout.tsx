import { AccountGate } from "@/components/AccountGate";
import { ProgressStrip } from "@/components/ProgressStrip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AccountGate>
      <ProgressStrip />
      {children}
    </AccountGate>
  );
}
