import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, ArrowLeftRight, PieChart, PiggyBank, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Gastos' },
  { to: '/budget', icon: PieChart, label: 'Presupuesto' },
  { to: '/savings', icon: PiggyBank, label: 'Ahorro' },
  { to: '/settings', icon: Settings, label: 'Config' },
]

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-area-pb">
        <div className="max-w-lg mx-auto flex">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
