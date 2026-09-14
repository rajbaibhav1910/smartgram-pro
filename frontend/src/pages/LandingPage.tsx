import { ReactNode } from 'react'
import { motion, MotionConfig, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FilePlus2,
  HeartHandshake,
  ShieldCheck,
  Zap,
  Smartphone,
  Check,
  Bell,
  Megaphone,
  Route,
  Search,
  ClipboardList,
  ArrowRight,
  LoaderCircle,
  Eye,
  Lock,
  Server,
  Users,
  Landmark as LandmarkIcon,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { statsAPI, schemesAPI, noticesAPI } from '../services/api'
import Button from '../components/ui/Button'
import { usePageTitle } from '../hooks/use-page-title'

/** Restrained scroll reveal: fade + slight rise, once, only when scrolled into view. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  usePageTitle(null)

  // Public, real platform statistics — the strip is hidden entirely if the
  // API is unreachable rather than showing invented numbers.
  const stats = useQuery({ queryKey: ['stats'], queryFn: statsAPI.get, staleTime: 60_000 })
  const schemes = useQuery({ queryKey: ['schemes'], queryFn: schemesAPI.list, staleTime: 60_000 })
  const notices = useQuery({ queryKey: ['notices'], queryFn: () => noticesAPI.list(), staleTime: 60_000 })

  const features = [
    { icon: FilePlus2, title: t('landing.feature1Title'), desc: t('landing.feature1Desc') },
    { icon: Route, title: t('landing.feature2Title'), desc: t('landing.feature2Desc') },
    { icon: Bell, title: t('landing.feature3Title'), desc: t('landing.feature3Desc') },
    { icon: Megaphone, title: t('landing.feature4Title'), desc: t('landing.feature4Desc') },
    { icon: HeartHandshake, title: t('landing.feature5Title'), desc: t('landing.feature5Desc') },
    { icon: ShieldCheck, title: t('landing.feature6Title'), desc: t('landing.feature6Desc') },
  ]

  const steps = [
    { icon: FilePlus2, title: t('landing.step1Title'), desc: t('landing.step1Desc') },
    { icon: ClipboardList, title: t('landing.step2Title'), desc: t('landing.step2Desc') },
    { icon: Check, title: t('landing.step3Title'), desc: t('landing.step3Desc') },
  ]

  const trustPoints = [
    { icon: Lock, title: t('landing.trust1Title'), desc: t('landing.trust1Desc') },
    { icon: Server, title: t('landing.trust2Title'), desc: t('landing.trust2Desc') },
    { icon: Eye, title: t('landing.trust3Title'), desc: t('landing.trust3Desc') },
  ]

  const s = stats.data

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="py-16 md:py-24 px-4">
          <div className="container-page">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary mb-4">
                  <Leaf size={11} />
                  {t('landing.badge')}
                </span>
                <h1 className="display mb-6">{t('landing.heroTitle')}</h1>
                <p className="text-lg text-text-muted mb-8 max-w-2xl">
                  {t('landing.heroSubtitle')}
                </p>
                <div className="flex flex-wrap gap-4 mb-8">
                  <Link to="/register">
                    <Button variant="primary" size="lg">
                      <FilePlus2 size={17} />
                      {t('landing.ctaReport')}
                    </Button>
                  </Link>
                  <Link to="/schemes">
                    <Button size="lg">
                      <HeartHandshake size={17} />
                      {t('landing.ctaSchemes')}
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-6 text-sm text-text-muted">
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={15} />
                    {t('landing.trustSecure')}
                  </span>
                  <span className="flex items-center gap-2">
                    <Zap size={15} />
                    {t('landing.trustTracking')}
                  </span>
                  <span className="flex items-center gap-2">
                    <Smartphone size={15} />
                    {t('landing.trustAnyPhone')}
                  </span>
                </div>
              </motion.div>

              {/* Tracker mock */}
              <Reveal delay={0.15}>
                <div className="bg-surface rounded-xl border border-border p-6 shadow-lg" aria-hidden="true">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-semibold text-ink mb-1">{t('landing.trackerTitle')}</div>
                      <div className="text-sm text-text-muted">{t('landing.trackerId')}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-status-progress-bg text-status-progress-text border border-status-progress-border">
                      {t('status.In Progress')}
                    </span>
                  </div>
                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 h-1 rounded-full bg-status-resolved-dot" />
                    <div className="flex-1 h-1 rounded-full bg-status-resolved-dot" />
                    <div className="flex-1 h-1 rounded-full bg-status-progress-dot" />
                    <div className="flex-1 h-1 rounded-full bg-border" />
                  </div>
                  <ol className="space-y-4">
                    {[
                      { label: t('landing.trackerSubmitted'), date: t('landing.trackerD1'), done: true },
                      { label: t('landing.trackerAssigned'), date: t('landing.trackerD2'), done: true },
                      {
                        label: t('landing.trackerRepair'),
                        date: t('landing.trackerD3'),
                        done: false,
                      },
                    ].map((ev) => (
                      <li key={ev.label} className="flex gap-3">
                        <span
                          className={
                            'flex items-center justify-center w-6 h-6 rounded-full text-white shrink-0 ' +
                            (ev.done ? 'bg-status-resolved-dot' : 'bg-status-progress-dot')
                          }
                        >
                          {ev.done ? <Check size={13} /> : <LoaderCircle size={13} className="animate-spin" />}
                        </span>
                        <div>
                          <div className="font-medium text-ink">{ev.label}</div>
                          <div className="text-sm text-text-muted">{ev.date}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Live platform statistics (real data; hidden if unavailable) ──── */}
        {stats.isSuccess && s && (
          <section className="bg-surface border-y border-border py-8" aria-label={t('landing.statsLabel')}>
            <div className="container-page grid grid-cols-1 sm:grid-cols-3 gap-8">
              <Reveal>
                <div className="text-center">
                  <div className="text-4xl font-bold text-ink mb-2">{s.total}</div>
                  <div className="text-text-muted">{t('landing.statsFiled')}</div>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="text-center">
                  <div className="text-4xl font-bold text-ink mb-2">{s.resolved}</div>
                  <div className="text-text-muted">{t('landing.statsResolved')}</div>
                </div>
              </Reveal>
              <Reveal delay={0.16}>
                <div className="text-center">
                  <div className="text-4xl font-bold text-ink mb-2">{notices.data?.notices.length ?? '—'}</div>
                  <div className="text-text-muted">{t('landing.statsNotices')}</div>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* ── Why SmartGram ────────────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="container-page">
            <Reveal>
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary mb-4">
                  <LandmarkIcon size={13} />
                  {t('landing.whyBadge')}
                </span>
                <h2 className="text-3xl font-bold text-ink mb-4">{t('landing.whyTitle')}</h2>
                <p className="text-text-muted max-w-2xl mx-auto">{t('landing.whySubtitle')}</p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <Reveal key={feature.title} delay={(i % 3) * 0.08}>
                  <div className="h-full bg-surface rounded-xl border border-border p-6 hover:shadow-md hover:border-border-strong transition-all duration-200">
                    <feature.icon size={20} className="text-primary mb-4" />
                    <h3 className="font-semibold text-ink mb-2">{feature.title}</h3>
                    <p className="text-text-muted text-sm">{feature.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 px-4 bg-surface border-y border-border scroll-mt-20">
          <div className="container-page">
            <Reveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-ink mb-4">{t('landing.howTitle')}</h2>
                <p className="text-text-muted max-w-2xl mx-auto">{t('landing.howSubtitle')}</p>
              </div>
            </Reveal>

            <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {steps.map((step, i) => (
                <Reveal key={step.title} delay={i * 0.1}>
                  <li className="h-full relative bg-canvas border border-border rounded-xl p-6">
                    <span className="absolute top-5 right-5 text-5xl font-bold text-border/70 leading-none select-none" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary text-primary-on mb-4">
                      <step.icon size={20} />
                    </span>
                    <h3 className="font-semibold text-ink mb-2">{step.title}</h3>
                    <p className="text-text-muted text-sm">{step.desc}</p>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Complaint tracking ───────────────────────────────────────────── */}
        <section className="py-20 px-4">
          <div className="container-page">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <Reveal>
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary mb-4">
                  <Route size={13} />
                  {t('landing.trackingBadge')}
                </span>
                <h2 className="text-3xl font-bold text-ink mb-4">{t('landing.trackingTitle')}</h2>
                <p className="text-text-muted mb-6 max-w-xl">{t('landing.trackingDesc')}</p>
                <ul className="space-y-3 mb-8">
                  {['landing.trackingPoint1', 'landing.trackingPoint2', 'landing.trackingPoint3'].map((k) => (
                    <li key={k} className="flex items-start gap-2.5 text-sm text-ink">
                      <Check size={16} className="text-status-resolved-dot shrink-0 mt-0.5" />
                      {t(k)}
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button variant="primary">
                    {t('landing.ctaReport')}
                    <ArrowRight size={15} />
                  </Button>
                </Link>
              </Reveal>

              {/* Status flow visualization */}
              <Reveal delay={0.12}>
                <div className="bg-surface rounded-xl border border-border p-6 shadow-md" aria-hidden="true">
                  <div className="font-semibold text-ink mb-5">{t('landing.trackingFlowTitle')}</div>
                  <ol className="space-y-0">
                    {[
                      { label: t('status.Pending'), state: 'done' },
                      { label: t('landing.trackingAssigned'), state: 'done' },
                      { label: t('status.In Progress'), state: 'current' },
                      { label: t('status.Resolved'), state: 'upcoming' },
                    ].map((st, i, arr) => (
                      <li key={st.label} className="relative flex gap-3 pb-7 last:pb-0">
                        {i < arr.length - 1 && (
                          <span
                            className={
                              'absolute left-[9px] top-6 bottom-0 w-px ' +
                              (st.state === 'done' ? 'bg-primary' : 'bg-border')
                            }
                          />
                        )}
                        <span
                          className={
                            'relative flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 z-10 bg-surface ' +
                            (st.state === 'done' && 'border-primary bg-primary') +
                            (st.state === 'current' && 'border-primary') +
                            (st.state === 'upcoming' && 'border-border')
                          }
                        >
                          {st.state === 'done' && <Check size={12} className="text-primary-on" />}
                          {st.state === 'current' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                          {st.state === 'upcoming' && <span className="w-1.5 h-1.5 rounded-full bg-border-strong" />}
                        </span>
                        <span
                          className={
                            'text-sm font-medium pt-0.5 ' +
                            (st.state === 'upcoming' ? 'text-text-faint' : 'text-ink')
                          }
                        >
                          {st.label}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Government schemes preview (real data) ───────────────────────── */}
        {schemes.isSuccess && schemes.data.schemes.length > 0 && (
          <section className="py-20 px-4 bg-surface border-y border-border">
            <div className="container-page">
              <Reveal>
                <div className="row-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-ink mb-2">{t('landing.schemesTitle')}</h2>
                    <p className="text-text-muted max-w-2xl">{t('landing.schemesSubtitle')}</p>
                  </div>
                  <Link to="/schemes" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover">
                    {t('common.viewAll')}
                    <ChevronRight size={15} />
                  </Link>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {schemes.data.schemes.slice(0, 3).map((scheme, i) => (
                  <Reveal key={scheme.name} delay={i * 0.08}>
                    <Link
                      to="/schemes"
                      className="block h-full bg-canvas border border-border rounded-xl p-5 hover:border-border-strong hover:shadow-md transition-all duration-200"
                    >
                      <HeartHandshake size={18} className="text-primary mb-3" />
                      <h3 className="font-semibold text-ink mb-1.5">{scheme.name}</h3>
                      <p className="text-sm text-text-muted">{scheme.description}</p>
                    </Link>
                  </Reveal>
                ))}
              </div>
              <Link to="/schemes" className="sm:hidden inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">
                {t('common.viewAll')}
                <ChevronRight size={15} />
              </Link>
            </div>
          </section>
        )}

        {/* ── Notices preview (real data) ──────────────────────────────────── */}
        {notices.isSuccess && notices.data.notices.length > 0 && (
          <section className="py-20 px-4">
            <div className="container-page">
              <Reveal>
                <div className="row-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-ink mb-2">{t('landing.noticesTitle')}</h2>
                    <p className="text-text-muted max-w-2xl">{t('landing.noticesSubtitle')}</p>
                  </div>
                  <Link to="/notices" className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover">
                    {t('common.viewAll')}
                    <ChevronRight size={15} />
                  </Link>
                </div>
              </Reveal>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {notices.data.notices.slice(0, 3).map((notice, i) => (
                  <Reveal key={notice.notice_id} delay={i * 0.08}>
                    <Link
                      to="/notices"
                      className="block h-full bg-surface border border-border rounded-xl p-5 hover:border-border-strong hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {notice.category === 'Alert' && (
                          <AlertTriangle size={13} className="text-status-rejected-text" />
                        )}
                        <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-text-faint">
                          {t(`noticeCategory.${notice.category}`)}
                        </span>
                      </div>
                      <h3 className="font-semibold text-ink mb-1.5 leading-snug">{notice.title}</h3>
                      <p className="text-sm text-text-muted line-clamp-2">{notice.content}</p>
                      <p className="caption mt-3">{format(new Date(notice.posted_at), 'd MMM yyyy')}</p>
                    </Link>
                  </Reveal>
                ))}
              </div>
              <Link to="/notices" className="sm:hidden inline-flex items-center gap-1 text-sm font-medium text-primary mt-4">
                {t('common.viewAll')}
                <ChevronRight size={15} />
              </Link>
            </div>
          </section>
        )}

        {/* ── Transparency ─────────────────────────────────────────────────── */}
        <section id="transparency" className="py-20 px-4 bg-surface border-y border-border scroll-mt-20">
          <div className="container-page">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <Reveal>
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary mb-4">
                  <Eye size={13} />
                  {t('landing.transparencyBadge')}
                </span>
                <h2 className="text-3xl font-bold text-ink mb-4">{t('landing.transparencyTitle')}</h2>
                <p className="text-text-muted mb-6 max-w-xl">{t('landing.transparencyDesc')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Users, label: t('landing.transparencyItem1') },
                    { icon: ClipboardList, label: t('landing.transparencyItem2') },
                    { icon: Megaphone, label: t('landing.transparencyItem3') },
                    { icon: Route, label: t('landing.transparencyItem4') },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2.5 p-3 bg-canvas border border-border rounded-lg">
                      <item.icon size={16} className="text-primary shrink-0" />
                      <span className="text-sm font-medium text-ink">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Reveal>

              {/* Community impact */}
              <Reveal delay={0.1}>
                <div className="bg-canvas border border-border rounded-xl p-6 md:p-8">
                  <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary mb-4">
                    <Users size={13} />
                    {t('landing.impactBadge')}
                  </span>
                  <h3 className="h3 mb-4">{t('landing.impactTitle')}</h3>
                  <p className="text-text-muted text-sm leading-relaxed mb-6">
                    {t('landing.impactDesc')}
                  </p>
                  {stats.isSuccess && s && (
                    <dl className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-surface border border-border rounded-lg">
                        <dt className="caption mb-1">{t('landing.statsFiled')}</dt>
                        <dd className="text-2xl font-bold text-ink">{s.total}</dd>
                      </div>
                      <div className="p-3 bg-surface border border-border rounded-lg">
                        <dt className="caption mb-1">{t('landing.statsResolved')}</dt>
                        <dd className="text-2xl font-bold text-ink">{s.resolved}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── Trust & security ─────────────────────────────────────────────── */}
        <section id="trust" className="py-20 px-4 scroll-mt-20">
          <div className="container-page">
            <Reveal>
              <div className="text-center mb-12">
                <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary mb-4">
                  <ShieldCheck size={13} />
                  {t('landing.trustBadge')}
                </span>
                <h2 className="text-3xl font-bold text-ink mb-4">{t('landing.trustTitle')}</h2>
                <p className="text-text-muted max-w-2xl mx-auto">{t('landing.trustSubtitle')}</p>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trustPoints.map((point, i) => (
                <Reveal key={point.title} delay={i * 0.08}>
                  <div className="h-full bg-surface rounded-xl border border-border p-6 text-center">
                    <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary-subtle text-primary-text mb-4">
                      <point.icon size={20} />
                    </span>
                    <h3 className="font-semibold text-ink mb-2">{point.title}</h3>
                    <p className="text-text-muted text-sm">{point.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="py-16 px-4">
          <div className="container-page">
            <Reveal>
              <div className="bg-primary text-primary-on rounded-2xl px-6 py-12 md:py-16 text-center relative overflow-hidden">
                <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full border-[32px] border-white/5" />
                <div aria-hidden="true" className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full border-[28px] border-white/5" />
                <div className="relative max-w-xl mx-auto">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-[-0.02em] mb-3">
                    {t('landing.ctaTitle')}
                  </h2>
                  <p className="text-primary-on/80 mb-8">{t('landing.ctaSubtitle')}</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Link to="/register">
                      <Button
                        variant="default"
                        size="lg"
                        className="!bg-white !text-primary hover:!bg-primary-on/90 !border-transparent"
                      >
                        <FilePlus2 size={16} />
                        {t('landing.ctaReport')}
                      </Button>
                    </Link>
                    <Link to="/schemes">
                      <Button
                        variant="ghost"
                        size="lg"
                        className="!text-white hover:!bg-white/10 !border-white/30"
                      >
                        <Search size={16} />
                        {t('landing.ctaSchemesShort')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </div>
    </MotionConfig>
  )
}

function Leaf({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}
