import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuth()
  const { toast } = useToast()
  usePageTitle(t('auth.loginTitle'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {}
    if (!username.trim()) errors.username = t('auth.errUsername')
    if (!password) errors.password = t('auth.errPassword')
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setIsLoading(true)

    try {
      const user = await login(username.trim(), password)
      toast(t('auth.welcomeBack', { name: user.username }))
      navigate(user.role === 'super_admin' ? '/super-admin' : user.role === 'panchayat_admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.errLoginFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = (hasError?: string) =>
    `w-full px-3 py-2 border rounded-lg bg-surface text-ink placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
      hasError ? 'border-danger' : 'border-border'
    }`

  return (
    <>
      <h1 className="h1 mb-1.5">{t('auth.loginTitle')}</h1>
      <p className="text-text-muted mb-8">{t('auth.loginSubtitle')}</p>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-danger-subtle border border-danger rounded-lg text-danger text-sm"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="username" className="label block mb-2">
            {t('auth.username')}
          </label>
          <input
            type="text"
            id="username"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: undefined })
            }}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            placeholder={t('auth.usernamePlaceholder')}
            className={inputClass(fieldErrors.username)}
          />
          {fieldErrors.username && (
            <p id="username-error" role="alert" className="text-[0.8rem] text-danger mt-1.5">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label block mb-2">
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined })
              }}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              placeholder={t('auth.passwordPlaceholderLogin')}
              className={inputClass(fieldErrors.password) + ' pr-11'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-ink rounded-md transition-colors"
              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="text-[0.8rem] text-danger mt-1.5">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {t('auth.signIn')}
        </Button>
      </form>

      <p className="mt-6 text-text-muted text-sm">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-primary hover:text-primary-hover">
          {t('footer.createAccount')}
        </Link>
      </p>
    </>
  )
}
