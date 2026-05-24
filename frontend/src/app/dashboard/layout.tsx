import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f5f4f0]">
      <Sidebar />
      <div className="flex-1 ml-[260px] min-h-screen flex flex-col bg-surface-primary">
        {children}
      </div>
    </div>
  );
}