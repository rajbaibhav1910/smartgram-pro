import { Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Landmark, ShieldCheck, BellRing, Smartphone, ArrowLeft } from 'lucide-react'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

/** Full-screen split layout for auth pages: form panel left,
 *  civic-green brand panel right (hidden on mobile). */
export default function AuthLayout() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex">
      {/* Form panel */}
      <div className="flex flex-col w-full lg:w-[480px] xl:w-[520px] shrink-0 px-6 sm:px-10 xl:px-14 py-8">
        <div className="flex items-center justify-between mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-ink"
          >
            <ArrowLeft size={15} />
            {t('auth.backHome')}
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Link to="/" className="flex items-center gap-2.5 lg:hidden" aria-label={t('footer.home')}>
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-on shadow-xs">
                <Landmark size={17} />
              </span>
              <span className="font-bold tracking-[-0.02em] text-ink">{t('common.appName')}</span>
            </Link>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto lg:mx-0 py-8">
          <Outlet />
        </div>

        <p className="hidden lg:flex items-center justify-center gap-1.5 text-[0.75rem] text-text-faint mt-10">
          <ShieldCheck size={13} />
          {t('common.securityNote')}
        </p>
      </div>

      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 bg-primary text-primary-on flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Subtle texture rings */}
        <div aria-hidden="true" className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full border-[40px] border-white/5" />
        <div aria-hidden="true" className="absolute -bottom-40 -left-24 w-[380px] h-[380px] rounded-full border-[36px] border-white/5" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3 text-primary-on" aria-label={t('footer.home')}>
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/15">
              <Landmark size={19} />
            </span>
            <span className="font-bold tracking-[-0.02em] text-lg">{t('common.appNamePro')}</span>
          </Link>
          <p className="text-2xl font-semibold leading-snug tracking-[-0.01em] mt-14 max-w-md">
            {t('landing.heroTitle')}
          </p>
          <p className="text-primary-on/75 mt-3 max-w-md leading-relaxed">
            {t('footer.connect')}
          </p>
        </div>

        <ul className="relative space-y-4 mt-12">
          {[
            { icon: Smartphone, text: t('landing.feature1Desc') },
            { icon: BellRing, text: t('landing.feature2Desc') },
            { icon: ShieldCheck, text: t('landing.feature6Desc') },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-primary-on/90 text-[0.9375rem]">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 shrink-0">
                <Icon size={17} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <p className="relative text-primary-on/50 text-[0.8rem] mt-12">
          {t('common.copyright')}
        </p>
      </div>
    </div>
  )
}
