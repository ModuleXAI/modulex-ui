export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 h-full min-h-0 flex flex-col py-2.5 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}


