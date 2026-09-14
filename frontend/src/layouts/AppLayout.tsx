import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/use-theme'
import { useAuth } from '../hooks/use-auth'
import { Landmark, Menu, PanelLeft, Sun, Moon, LogOut, LayoutDashboard, LayoutList, FilePlus2, Megaphone, HeartHandshake, Map as MapIcon, ShieldCheck, UserRound, X } from 'lucide-react'
import Button from '../components/ui/Button'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import { useToast } from '../components/ui/toast'
import { cn } from '../lib/utils'

export default function AppLayout() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { user, panchayatName, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sg-sidebar-collapsed') === '1',
  )

  const isAdmin = user?.role === 'panchayat_admin' || user?.role === 'super_admin'

  // Persist the collapsed-sidebar preference across visits
  useEffect(() => {
    localStorage.setItem('sg-sidebar-collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  // Close the mobile drawer with Escape
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  const isActive = (path: string) => location.pathname === path

  const handleLogout = async () => {
    await logout()
    toast(t('nav.loggedOutToast'), 'info')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">
        {t('nav.skipToContent')}
      </a>

      {/* Topbar */}
      <header className="sticky top-0 z-50 bg-surface/88 backdrop-blur-md border-b border-border h-[60px] print:hidden">
        <div className="flex items-center gap-3 h-full px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-ink hover:bg-surface-subtle rounded-lg"
            aria-label={t('nav.openMenu')}
          >
            <Menu size={19} />
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 text-ink hover:bg-surface-subtle rounded-lg transition-transform"
            aria-label={t('nav.collapseSidebar')}
          >
            <PanelLeft size={17} className={cn('transition-transform', sidebarCollapsed && 'rotate-180')} />
          </button>

          <Link to="/" className="flex items-center gap-3" aria-label={t('footer.home')}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-on shadow-inner">
              <Landmark size={18} />
            </span>
          </Link>

          <div className="flex items-center gap-0.6 min-w-0 ml-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[0.95rem] font-semibold tracking-[-0.01em] text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                {user?.role === 'super_admin' ? t('superAdmin.brand') : isAdmin ? t('nav.operations') : t('nav.myDashboard')}
              </span>
              <span className="text-[0.72rem] text-text-faint whitespace-nowrap">
                {user?.role === 'super_admin'
                  ? t('superAdmin.brandSub')
                  : panchayatName
                    ? `${t('nav.panchayat')}: ${panchayatName}`
                    : isAdmin
                      ? t('nav.operationsConsole')
                      : user?.village}
              </span>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {!isAdmin && (
              <Link to="/complaints/new">
                <Button variant="primary" size="sm">
                  <FilePlus2 size={15} />
                  <span className="hidden md:inline">{t('nav.reportIssueShort')}</span>
                </Button>
              </Link>
            )}

            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="p-2 text-text-muted hover:text-ink hover:bg-surface-subtle rounded-lg transition-colors"
              aria-label={t('nav.switchTheme')}
            >
              {theme === 'light' ? <Sun size={17} className="i-sun" /> : <Moon size={17} className="i-moon" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-[60px] h-[calc(100vh-60px)] bg-surface border-r border-border z-40 transition-all duration-200 print:hidden',
            'lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-[252px]'
          )}
          aria-label={t('nav.sidebarNav')}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-on shadow-inner">
                <Landmark size={18} />
              </span>
              {!sidebarCollapsed && (
                <div>
                  <span className="font-bold tracking-[-0.02em] text-ink block">{t('common.appName')}</span>
                  <span className="text-[0.62rem] font-semibold tracking-[0.1em] uppercase text-text-faint block">
                    {t('common.tagline')}
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-ink hover:bg-surface-subtle rounded-lg"
              aria-label={t('nav.closeMenu')}
            >
              <X size={18} />
            </button>
          </div>

          <nav className="p-4">
            <p className="text-[0.75rem] font-semibold text-text-faint uppercase tracking-wider mb-3">
              {t('nav.main')}
            </p>
            <ul className="space-y-1">
              {isAdmin ? (
                <>
                  <li>
                    <Link
                      to="/admin"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                        isActive('/admin') && 'bg-primary-subtle text-primary-text'
                      )}
                      title={t('nav.operations')}
                    >
                      <LayoutDashboard size={18} />
                      {!sidebarCollapsed && <span>{t('nav.operations')}</span>}
                    </Link>
                  </li>
                  {user?.role === 'super_admin' && (
                    <li>
                      <Link
                        to="/super-admin"
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                          isActive('/super-admin') && 'bg-primary-subtle text-primary-text'
                        )}
                        title={t('superAdmin.nav')}
                      >
                        <ShieldCheck size={18} />
                        {!sidebarCollapsed && <span>{t('superAdmin.nav')}</span>}
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link
                      to="/complaints"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                        isActive('/complaints') && 'bg-primary-subtle text-primary-text'
                      )}
                      title={t('nav.allComplaints')}
                    >
                      <LayoutList size={18} />
                      {!sidebarCollapsed && <span>{t('nav.allComplaints')}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/notices"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                        isActive('/notices') && 'bg-primary-subtle text-primary-text'
                      )}
                      title={t('nav.notices')}
                    >
                      <Megaphone size={18} />
                      {!sidebarCollapsed && <span>{t('nav.notices')}</span>}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      to="/dashboard"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                        isActive('/dashboard') && 'bg-primary-subtle text-primary-text'
                      )}
                      title={t('nav.myDashboard')}
                    >
                      <LayoutDashboard size={18} />
                      {!sidebarCollapsed && <span>{t('nav.myDashboard')}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/complaints"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                        isActive('/complaints') && 'bg-primary-subtle text-primary-text'
                      )}
                      title={t('nav.myComplaints')}
                    >
                      <LayoutList size={18} />
                      {!sidebarCollapsed && <span>{t('nav.myComplaints')}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/complaints/new"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                        isActive('/complaints/new') && 'bg-primary-subtle text-primary-text'
                      )}
                      title={t('nav.reportIssue')}
                    >
                      <FilePlus2 size={18} />
                      {!sidebarCollapsed && <span>{t('nav.reportIssue')}</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/notices"
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                        isActive('/notices') && 'bg-primary-subtle text-primary-text'
                      )}
                      title={t('nav.notices')}
                    >
                      <Megaphone size={18} />
                      {!sidebarCollapsed && <span>{t('nav.notices')}</span>}
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link
                  to="/map"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                    isActive('/map') && 'bg-primary-subtle text-primary-text'
                  )}
                  title={t('nav.map')}
                >
                  <MapIcon size={18} />
                  {!sidebarCollapsed && <span>{t('nav.map')}</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/schemes"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors',
                    isActive('/schemes') && 'bg-primary-subtle text-primary-text'
                  )}
                  title={t('nav.schemes')}
                >
                  <HeartHandshake size={18} />
                  {!sidebarCollapsed && <span>{t('nav.schemes')}</span>}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="mt-auto p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex items-center gap-3 flex-1 min-w-0 rounded-lg hover:bg-surface-subtle -mx-1 px-1 py-1 transition-colors"
                title={t('profile.title')}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-on font-semibold shrink-0">
                  {user?.username.slice(0, 2).toUpperCase()}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{user?.username}</div>
                    <div className="text-[0.75rem] text-text-muted truncate">
                      {isAdmin ? t('nav.panchayatAdmin') : `${t('nav.citizen')} · ${user?.village}`}
                    </div>
                  </div>
                )}
              </Link>
              {!sidebarCollapsed && (
                <Link
                  to="/profile"
                  className="p-2 text-text-muted hover:text-ink hover:bg-surface-subtle rounded-lg transition-colors"
                  title={t('profile.title')}
                  aria-label={t('profile.title')}
                >
                  <UserRound size={16} />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="p-2 text-text-muted hover:text-danger hover:bg-danger-subtle rounded-lg transition-colors"
                title={t('nav.logOut')}
                aria-label={t('nav.logOut')}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile scrim */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main id="main-content" className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 print:hidden" aria-label={t('nav.mobileNav')}>
        <ul className="flex justify-around">
          {isAdmin ? (
            <>
              <li>
                <Link
                  to="/admin"
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 text-text-muted',
                    isActive('/admin') && 'text-primary'
                  )}
                >
                  <LayoutDashboard size={18} />
                  <span className="text-xs">{t('nav.operations')}</span>
                </Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link
                  to="/dashboard"
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 text-text-muted',
                    isActive('/dashboard') && 'text-primary'
                  )}
                >
                  <LayoutDashboard size={18} />
                  <span className="text-xs">{t('nav.home')}</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/complaints/new"
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 text-text-muted',
                    isActive('/complaints/new') && 'text-primary'
                  )}
                >
                  <FilePlus2 size={18} />
                  <span className="text-xs">{t('nav.reportIssue')}</span>
                </Link>
              </li>
            </>
          )}
          <li>
            <Link
              to="/notices"
              className={cn(
                'flex flex-col items-center gap-1 p-3 text-text-muted',
                isActive('/notices') && 'text-primary'
              )}
            >
              <Megaphone size={18} />
              <span className="text-xs">{t('nav.notices')}</span>
            </Link>
          </li>
          <li>
            <Link
              to="/schemes"
              className={cn(
                'flex flex-col items-center gap-1 p-3 text-text-muted',
                isActive('/schemes') && 'text-primary'
              )}
            >
              <HeartHandshake size={18} />
              <span className="text-xs">{t('nav.schemes')}</span>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}