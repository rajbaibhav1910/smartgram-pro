import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, MapPin } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import { panchayatsAPI } from '../services/api'
import Button from '../components/ui/Button'
import VillageSelect from '../components/ui/VillageSelect'
import type { Village } from '../components/ui/VillageSelect'

type FieldName = 'username' | 'email' | 'password' | 'phone'
type FormErrors = Partial<Record<FieldName | 'village' | 'panchayatId', string>>

const FIELDS: Array<{
  name: FieldName
  label: string
  type: string
  autoComplete?: string
  placeholder: string
}> = [
  { name: 'username', label: 'Username', type: 'text', autoComplete: 'username', placeholder: 'e.g. ramesh_kumar' },
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
  { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', placeholder: 'Choose a strong password' },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel', placeholder: '10-digit mobile number' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { register } = useAuth()
  const { toast } = useToast()
  usePageTitle(t('auth.registerTitle'))
  const [formData, setFormData] = useState<Record<FieldName, string>>({
    username: '',
    email: '',
    password: '',
    phone: '',
  })
  const [village, setVillage] = useState<Village | null>(null)
  const [panchayatId, setPanchayatId] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validate = (): boolean => {
    const errors: FormErrors = {}
    if (!formData.username.trim()) errors.username = t('auth.errUsername')
    if (!formData.email.trim()) errors.email = t('auth.errEmail')
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) errors.email = t('auth.errEmailInvalid')
    if (!formData.password) errors.password = t('auth.errPassword')
    else if (formData.password.length < 6) errors.password = t('auth.errPasswordShort')
    if (!village) errors.village = t('auth.errVillage')
    if (!formData.phone.trim()) errors.phone = t('auth.errPhone')
    if (!panchayatId) errors.panchayatId = t('auth.errPanchayat')
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setIsLoading(true)

    try {
      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        village: `${village!.name}, ${village!.district} (${village!.state})`,
        phone: formData.phone.trim(),
        panchayatId,
      })
      toast(t('auth.accountCreated'))
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
      <h1 className="h1 mb-1.5">{t('auth.registerTitle')}</h1>
      <p className="text-text-muted mb-8">{t('auth.registerSubtitle')}</p>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-danger-subtle border border-danger rounded-lg text-danger text-sm"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {FIELDS.slice(0, 3).map(({ name, type, autoComplete }) => (
          <div key={name}>
            <label htmlFor={name} className="label block mb-2">
              {t(`auth.${name}`)}
            </label>
            {name === 'password' ? (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id={name}
                  autoComplete={autoComplete}
                  value={formData[name]}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined })
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  placeholder={t('auth.passwordPlaceholder')}
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
            ) : (
              <input
                type={type}
                id={name}
                autoComplete={autoComplete}
                value={formData[name]}
                onChange={(e) => {
                  setFormData({ ...formData, [name]: e.target.value })
                  if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined })
                }}
                aria-invalid={Boolean(fieldErrors[name])}
                aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
                placeholder={t(`auth.${name}Placeholder`)}
                className={inputClass(fieldErrors[name])}
              />
            )}
            {fieldErrors[name] && (
              <p id={`${name}-error`} role="alert" className="text-[0.8rem] text-danger mt-1.5">
                {fieldErrors[name]}
              </p>
            )}
          </div>
        ))}

        <div>
          <label htmlFor="panchayat" className="label block mb-2">
            {t('auth.panchayat')}
          </label>
          <PanchayatSelect
            value={panchayatId}
            onChange={(id) => {
              setPanchayatId(id)
              if (fieldErrors.panchayatId) setFieldErrors({ ...fieldErrors, panchayatId: undefined })
            }}
            error={fieldErrors.panchayatId}
          />
          <p className="caption mt-1.5">{t('auth.panchayatHint')}</p>
        </div>

        <div>
          <label htmlFor="village" className="label block mb-2">
            {t('auth.village')}
          </label>
          <VillageSelect
            id="village"
            value={village ? `${village.name}, ${village.district} (${village.state})` : ''}
            onChange={(v) => {
              setVillage(v)
              if (fieldErrors.village) setFieldErrors({ ...fieldErrors, village: undefined })
            }}
            error={fieldErrors.village}
          />
        </div>

        {FIELDS.slice(3).map(({ name, type, autoComplete }) => (
          <div key={name}>
            <label htmlFor={name} className="label block mb-2">
              {t(`auth.${name}`)}
            </label>
            <input
              type={type}
              id={name}
              autoComplete={autoComplete}
              value={formData[name]}
              onChange={(e) => {
                setFormData({ ...formData, [name]: e.target.value })
                if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined })
              }}
              aria-invalid={Boolean(fieldErrors[name])}
              aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
              placeholder={t(`auth.${name}Placeholder`)}
              className={inputClass(fieldErrors[name])}
            />
            {fieldErrors[name] && (
              <p id={`${name}-error`} role="alert" className="text-[0.8rem] text-danger mt-1.5">
                {fieldErrors[name]}
              </p>
            )}
          </div>
        ))}

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          {t('auth.createAccount')}
        </Button>
      </form>

      <p className="mt-6 text-text-muted text-sm">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
          {t('auth.signIn')}
        </Link>
      </p>
    </>
  )
}


/** Dropdown of active panchayats from the public directory. */
function PanchayatSelect({
  value, onChange, error,
}: {
  value: string
  onChange: (id: string) => void
  error?: string
}) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['panchayats', 'public'],
    queryFn: panchayatsAPI.listPublic,
    staleTime: 5 * 60_000,
  })
  const options = data?.panchayats ?? []

  return (
    <div className="relative">
      <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
      <select
        id="panchayat"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={
          'w-full pl-9 pr-3 py-2 border rounded-lg bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ' +
          (error ? 'border-danger' : 'border-border')
        }
      >
        <option value="">{isLoading ? t('auth.loadingPanchayats') : t('auth.selectPanchayat')}</option>
        {options.map((p) => (
          <option key={p.panchayatId} value={p.panchayatId}>
            {p.name} ({p.panchayatId})
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-[0.8rem] text-danger mt-1.5">
          {error}
        </p>
      )}
    </div>
  )
}
