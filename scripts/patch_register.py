import io

# ── RegisterPage: panchayat selector ──
p = r'C:\PROJECT-PROJECT REPORT\AWS\SmartGram-Pro\frontend\src\pages\RegisterPage.tsx'
s = io.open(p, encoding='utf-8').read()

old = """import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { usePageTitle } from '../hooks/use-page-title'
import { useToast } from '../components/ui/toast'
import Button from '../components/ui/Button'
import VillageSelect from '../components/ui/VillageSelect'
import type { Village } from '../components/ui/VillageSelect'"""
new = """import { useState } from 'react'
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
import type { Village } from '../components/ui/VillageSelect'"""
assert old in s, 'register imports'
s = s.replace(old, new)

old = """type FieldName = 'username' | 'email' | 'password' | 'phone'
type FormErrors = Partial<Record<FieldName | 'village', string>>"""
new = """type FieldName = 'username' | 'email' | 'password' | 'phone'
type FormErrors = Partial<Record<FieldName | 'village' | 'panchayatId', string>>"""
assert old in s, 'register errors type'
s = s.replace(old, new)

old = """  const [village, setVillage] = useState<Village | null>(null)
  const [showPassword, setShowPassword] = useState(false)"""
new = """  const [village, setVillage] = useState<Village | null>(null)
  const [panchayatId, setPanchayatId] = useState('')
  const [showPassword, setShowPassword] = useState(false)"""
assert old in s, 'register panchayat state'
s = s.replace(old, new)

old = """  const validate = (): boolean => {
    const errors: FormErrors = {}
    if (!formData.username.trim()) errors.username = t('auth.errUsername')
    if (!formData.email.trim()) errors.email = t('auth.errEmail')
    else if (!/^\\S+@\\S+\\.\\S+$/.test(formData.email)) errors.email = t('auth.errEmailInvalid')
    if (!formData.password) errors.password = t('auth.errPassword')
    else if (formData.password.length < 6) errors.password = t('auth.errPasswordShort')
    if (!village) errors.village = t('auth.errVillage')
    if (!formData.phone.trim()) errors.phone = t('auth.errPhone')
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }"""
new = """  const validate = (): boolean => {
    const errors: FormErrors = {}
    if (!formData.username.trim()) errors.username = t('auth.errUsername')
    if (!formData.email.trim()) errors.email = t('auth.errEmail')
    else if (!/^\\S+@\\S+\\.\\S+$/.test(formData.email)) errors.email = t('auth.errEmailInvalid')
    if (!formData.password) errors.password = t('auth.errPassword')
    else if (formData.password.length < 6) errors.password = t('auth.errPasswordShort')
    if (!village) errors.village = t('auth.errVillage')
    if (!formData.phone.trim()) errors.phone = t('auth.errPhone')
    if (!panchayatId) errors.panchayatId = t('auth.errPanchayat')
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }"""
assert old in s, 'register validate'
s = s.replace(old, new)

old = """      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        village: `${village!.name}, ${village!.district} (${village!.state})`,
        phone: formData.phone.trim(),
      })"""
new = """      await register({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        village: `${village!.name}, ${village!.district} (${village!.state})`,
        phone: formData.phone.trim(),
        panchayatId,
      })"""
assert old in s, 'register submit'
s = s.replace(old, new)

# Insert the panchayat selector before the village field
old = """        <div>
          <label htmlFor="village" className="label block mb-2">
            {t('auth.village')}
          </label>"""
new = """        <div>
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
          </label>"""
assert old in s, 'register selector insert'
s = s.replace(old, new)

# Append the PanchayatSelect component at the end of the file
s += """

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
"""

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('register page updated')
