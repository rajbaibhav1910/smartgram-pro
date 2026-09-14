import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  User as UserIcon,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  CalendarDays,
  Fingerprint,
  LogOut,
  Hash,
} from 'lucide-react'
import { format } from 'date-fns'
import { authAPI } from '../services/api'
import { useAuth } from '../hooks/use-auth'
import { useToast } from '../components/ui/toast'
import Button from '../components/ui/Button'
import { Card, ErrorState, Skeleton } from '../components/ui/States'
import { usePageTitle } from '../hooks/use-page-title'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  usePageTitle(t('profile.title'))

  // Revalidate on mount so the profile reflects the server, not just session state
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authAPI.me,
  })

  const user = data?.user

  const handleLogout = async () => {
    await logout()
    toast(t('profile.loggedOut'), 'info')
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="container-page py-8 pb-24 lg:pb-8 max-w-2xl" aria-hidden="true">
        <Skeleton className="h-7 w-40 mb-6" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/2" />
        </Card>
      </div>
    )
  }

  if (isError || !user) {
    return (
      <div className="container-page py-8 pb-24 lg:pb-8 max-w-2xl">
        <Card>
          <ErrorState onRetry={() => refetch()} />
        </Card>
      </div>
    )
  }

  const isAdmin = user.role === 'panchayat_admin'

  const rows = [
    { icon: Hash, label: t('profile.userId'), value: user.user_id, mono: true },
    { icon: Mail, label: t('auth.email'), value: user.email },
    { icon: Phone, label: t('auth.phone'), value: user.phone },
    { icon: MapPin, label: t('auth.village'), value: user.village },
    {
      icon: ShieldCheck,
      label: t('profile.role'),
      value: isAdmin ? t('profile.roleAdmin') : t('profile.roleCitizen'),
    },
    {
      icon: CalendarDays,
      label: t('profile.memberSince'),
      value: format(new Date(user.created_at), 'd MMMM yyyy'),
    },
  ]

  return (
    <div className="container-page py-8 pb-24 lg:pb-8 max-w-2xl">
      <h1 className="h1 mb-1">{t('profile.title')}</h1>
      <p className="text-text-muted mb-6">{t('profile.subtitle')}</p>

      <Card className="p-5 md:p-6">
        <div className="flex items-center gap-4 pb-5 mb-5 border-b border-border">
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-on font-bold text-lg shrink-0">
            {user.username.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="h3 truncate">{user.username}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.72rem] font-medium border bg-primary-subtle text-primary-text border-primary-subtle-border">
                <UserIcon size={11} />
                {isAdmin ? t('profile.roleAdmin') : t('profile.roleCitizen')}
              </span>
            </div>
            <p className="text-sm text-text-muted truncate">{user.email}</p>
          </div>
        </div>

        <dl className="space-y-4">
          {rows.map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={16} className="text-text-faint mt-0.5 shrink-0" />
              <div className="min-w-0">
                <dt className="caption mb-0.5">{label}</dt>
                <dd
                  className={
                    'text-sm font-medium text-ink break-words' + (mono ? ' font-mono' : '')
                  }
                >
                  {value || '—'}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 mt-4">
        <div className="flex items-start gap-3">
          <Fingerprint size={16} className="text-text-faint mt-0.5 shrink-0" />
          <div>
            <h3 className="label mb-1">{t('profile.securityTitle')}</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              {t('profile.securityDesc')}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end mt-5">
        <Button variant="danger-ghost" onClick={handleLogout}>
          <LogOut size={15} />
          {t('nav.logOut')}
        </Button>
      </div>
    </div>
  )
}
