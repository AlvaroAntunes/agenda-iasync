import { SubscriptionGuard } from "@/components/SubscriptionGuard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-slate-50">
          {children}
      </div>
    </SubscriptionGuard>
  )
}