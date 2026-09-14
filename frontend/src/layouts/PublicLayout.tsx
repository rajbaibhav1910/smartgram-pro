import { useEffect, useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../hooks/use-theme'
import { useAuth } from '../hooks/use-auth'
import { Landmark, Menu, Sun, Moon, LayoutDashboard, ShieldCheck, X } from 'lucide-react'
import Button from '../components/ui/Button'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

export default function PublicLayout() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu with Escape and lock page scroll while open
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/notices', label: t('nav.notices') },
    { to: '/schemes', label: t('nav.schemes') },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link print:hidden">
        {t('nav.skipToContent')}
      </a>

      {/* Public Navigation */}
      <header className="sticky top-0 z-50 bg-surface/88 backdrop-blur-md border-b border-border print:hidden">
        <div className="container-page flex items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-3" aria-label={t('footer.home')}>
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-on shadow-inner">
              <Landmark size={18} />
            </span>
            <span className="font-bold tracking-[-0.02em] text-ink">{t('common.appName')}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6" aria-label={t('nav.primaryNav')}>
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="text-ink hover:text-primary-hover transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            <button
              onClick={toggleTheme}
              className="hidden md:flex p-2 items-center justify-center text-text-muted hover:text-ink hover:bg-surface-subtle rounded-lg transition-colors"
              aria-label={t('nav.switchTheme')}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {user ? (
              <Link to={user.role === 'villager' ? '/dashboard' : '/admin'} className="hidden md:block">
                <Button variant="primary" size="sm">
                  <LayoutDashboard size={15} />
                  {t('nav.dashboard')}
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden md:block">
                  <Button variant="ghost" size="sm">{t('nav.login')}</Button>
                </Link>
                <Link to="/register" className="hidden md:block">
                  <Button variant="primary" size="sm">{t('nav.getStarted')}</Button>
                </Link>
              </>
            )}

            <button
              className="md:hidden p-2 text-ink hover:bg-surface-subtle rounded-lg"
              aria-label={t('nav.openMenu')}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={19} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={
          'fixed top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-surface border-l border-border z-[70] md:hidden ' +
          'transition-transform duration-200 ease-out ' +
          (menuOpen ? 'translate-x-0' : 'translate-x-full')
        }
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.primaryNav')}
        hidden={!menuOpen}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-on shadow-inner">
              <Landmark size={17} />
            </span>
            <span className="font-bold tracking-[-0.02em] text-ink">{t('common.appName')}</span>
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 text-ink hover:bg-surface-subtle rounded-lg"
            aria-label={t('nav.closeMenu')}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="p-4" aria-label={t('nav.primaryNav')}>
          <ul className="space-y-1">
            {navLinks.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-ink hover:bg-surface-subtle transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-ink hover:bg-surface-subtle transition-colors"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            {t('nav.switchTheme')}
          </button>
          {user ? (
            <Link to={user.role === 'villager' ? '/dashboard' : '/admin'} className="block" onClick={() => setMenuOpen(false)}>
              <Button variant="primary" className="w-full">
                <LayoutDashboard size={15} />
                {t('nav.dashboard')}
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="block" onClick={() => setMenuOpen(false)}>
                <Button variant="default" className="w-full">{t('nav.login')}</Button>
              </Link>
              <Link to="/register" className="block" onClick={() => setMenuOpen(false)}>
                <Button variant="primary" className="w-full">{t('nav.getStarted')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-auto print:hidden">
        <div className="container-page py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link to="/" className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-on shadow-inner">
                  <Landmark size={18} />
                </span>
                <div>
                  <span className="font-bold tracking-[-0.02em] text-ink block">{t('common.appName')}</span>
                  <span className="text-[0.62rem] font-semibold tracking-[0.1em] uppercase text-text-faint block">
                    {t('common.tagline')}
                  </span>
                </div>
              </Link>
              <p className="text-text-muted text-sm">{t('footer.connect')}</p>
            </div>

            <div>
              <h3 className="font-semibold text-ink mb-4">{t('footer.services')}</h3>
              <div className="flex flex-col gap-2">
                <Link to="/#how-it-works" className="text-text-muted hover:text-primary transition-colors">{t('footer.reportIssue')}</Link>
                <Link to="/notices" className="text-text-muted hover:text-primary transition-colors">{t('footer.panchayatNotices')}</Link>
                <Link to="/schemes" className="text-text-muted hover:text-primary transition-colors">{t('footer.governmentSchemes')}</Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-ink mb-4">{t('footer.account')}</h3>
              {user ? (
                <div className="flex flex-col gap-2">
                  <Link to={user.role === 'villager' ? '/dashboard' : '/admin'} className="text-text-muted hover:text-primary transition-colors">
                    {t('nav.myDashboard')}
                  </Link>
                  <Link to="/profile" className="text-text-muted hover:text-primary transition-colors">{t('profile.title')}</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link to="/login" className="text-text-muted hover:text-primary transition-colors">{t('nav.login')}</Link>
                  <Link to="/register" className="text-text-muted hover:text-primary transition-colors">{t('footer.createAccount')}</Link>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-ink mb-4">{t('footer.trustSafety')}</h3>
              <div className="flex flex-col gap-2">
                <Link to="/#trust" className="text-text-muted hover:text-primary transition-colors">{t('footer.dataProtection')}</Link>
                <Link to="/#transparency" className="text-text-muted hover:text-primary transition-colors">{t('footer.transparency')}</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mt-8 pt-8 border-t border-border text-sm text-text-muted">
            <span>{t('common.copyright')}</span>
            <span className="flex items-center gap-2 mt-2 md:mt-0">
              <ShieldCheck size={13} />
              {t('common.poweredBy')}
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
