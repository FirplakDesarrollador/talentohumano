'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        email: '',
        cedula: '',
        password: '',
        confirmPassword: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const validatePassword = (password: string) => {
        const hasMinLength = password.length >= 8
        const hasUpper = /[A-Z]/.test(password)
        const hasLower = /[a-z]/.test(password)
        const hasNumber = /[0-9]/.test(password)
        const hasSpecial = /[@$!%*?&._-]/.test(password)

        return {
            isValid: hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial,
            requirements: {
                minLength: hasMinLength,
                upper: hasUpper,
                lower: hasLower,
                number: hasNumber,
                special: hasSpecial
            }
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        const { isValid } = validatePassword(formData.password)

        if (!isValid) {
            setError('La contraseña no cumple con los requisitos de seguridad.')
            setLoading(false)
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden.')
            setLoading(false)
            return
        }

        try {
            // 1. Verificar si el empleado existe
            const { data: empleado, error: empError } = await supabase
                .from('empleados')
                .select('id, nombreCompleto, nivelCargo')
                .eq('id', formData.cedula)
                .single()

            if (empError || !empleado) {
                setError('No se encontró un empleado registrado con esta cédula. Por favor contacta a Talento Humano.')
                setLoading(false)
                return
            }

            // 2. Verificar si ya tiene un usuario creado
            const { data: usuarioExistente } = await supabase
                .from('usuarios')
                .select('id')
                .eq('empleado_id', formData.cedula)
                .single()

            if (usuarioExistente) {
                setError('Ya existe un usuario vinculado a esta cédula. Intenta recuperar tu contraseña.')
                setLoading(false)
                return
            }

            // 3. Crear usuario en Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: empleado.nombreCompleto,
                        cedula: empleado.id
                    }
                }
            })

            if (authError) {
                setError(authError.message)
                setLoading(false)
                return
            }

            if (!authData.user) {
                setError('Error inesperado al crear la cuenta de autenticación.')
                setLoading(false)
                return
            }

            // 4. El registro en public.usuarios ahora se maneja automáticamente
            // mediante un trigger de base de datos (handle_new_user) 
            // que se dispara tras el signUp exitoso.

            setSuccess(true)
            setTimeout(() => {
                router.push('/login')
            }, 3000)

        } catch (err) {
            setError('Error durante el registro. Inténtalo de nuevo.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const passwordStatus = validatePassword(formData.password)

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="bg-green-100 p-4 rounded-full">
                            <CheckCircle2 className="h-12 w-12 text-green-600" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">¡Registro Exitoso!</h1>
                    <p className="text-gray-600">
                        Tu cuenta ha sido creada correctamente. Hemos vinculado tus datos y permisos automáticamente.
                    </p>
                    <p className="text-sm text-gray-400">Redirigiendo al login en unos segundos...</p>
                    <Button 
                        onClick={() => router.push('/login')}
                        className="w-full bg-[#2d4356] hover:bg-[#1e2d3a] text-white"
                    >
                        Ir al Login ahora
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex bg-white font-sans">
            {/* Left Side: Form Section */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 overflow-y-auto">
                <div className="w-full max-w-[400px] space-y-8 py-8">
                    <div className="flex items-center">
                        <Link 
                            href="/login" 
                            className="text-gray-400 hover:text-gray-600 transition-colors flex items-center text-sm"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Volver al login
                        </Link>
                    </div>

                    <div className="text-center space-y-1">
                        <h1 className="text-4xl font-bold tracking-tight text-[#1a365d]">
                            FIRPLAK
                        </h1>
                        <p className="text-sm text-gray-500 mt-2">
                            Registro de nuevo usuario
                        </p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 ml-1">Email corporativo</label>
                                <Input
                                    type="email"
                                    placeholder="correo@firplak.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    disabled={loading}
                                    className="bg-slate-50 border-none h-11 px-4 focus-visible:ring-1 focus-visible:ring-gray-300"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 ml-1">Número de Cédula</label>
                                <Input
                                    type="text"
                                    placeholder="Sin puntos ni comas"
                                    value={formData.cedula}
                                    onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                    required
                                    disabled={loading}
                                    className="bg-slate-50 border-none h-11 px-4 focus-visible:ring-1 focus-visible:ring-gray-300"
                                />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 ml-1">Contraseña</label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Mínimo 8 caracteres"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        disabled={loading}
                                        className="bg-slate-50 border-none h-11 px-4 pr-12 focus-visible:ring-1 focus-visible:ring-gray-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password Requirements Checklist */}
                            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg text-[10px]">
                                <div className="flex items-center space-x-1">
                                    {passwordStatus.requirements.minLength ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-gray-300" />}
                                    <span className={passwordStatus.requirements.minLength ? 'text-green-600' : 'text-gray-500'}>8+ caracteres</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {passwordStatus.requirements.upper ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-gray-300" />}
                                    <span className={passwordStatus.requirements.upper ? 'text-green-600' : 'text-gray-500'}>Mayúscula</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {passwordStatus.requirements.lower ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-gray-300" />}
                                    <span className={passwordStatus.requirements.lower ? 'text-green-600' : 'text-gray-500'}>Minúscula</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {passwordStatus.requirements.number ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-gray-300" />}
                                    <span className={passwordStatus.requirements.number ? 'text-green-600' : 'text-gray-500'}>Número</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {passwordStatus.requirements.special ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-gray-300" />}
                                    <span className={passwordStatus.requirements.special ? 'text-green-600' : 'text-gray-500'}>Carac. especial (@$!%*?&._-)</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 ml-1">Confirmar contraseña</label>
                                <Input
                                    type="password"
                                    placeholder="Repite tu contraseña"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    disabled={loading}
                                    className="bg-slate-50 border-none h-11 px-4 focus-visible:ring-1 focus-visible:ring-gray-300"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-lg flex items-center">
                                <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading || !passwordStatus.isValid || formData.password !== formData.confirmPassword}
                            className="w-full bg-[#2d4356] hover:bg-[#1e2d3a] text-white h-12 rounded-lg text-base font-medium transition-colors mt-4"
                        >
                            {loading ? 'Creando cuenta...' : 'Registrarme'}
                        </Button>
                    </form>
                </div>
            </div>

            {/* Right Side: Image Section (Same as Login) */}
            <div className="hidden lg:flex flex-1 p-6 bg-slate-50">
                <div className="relative w-full h-full rounded-[40px] overflow-hidden shadow-2xl">
                    <Image
                        src="/login-bg.jpg"
                        alt="Talento Humano Firplak"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#1a365d]/20 to-[#1a365d]/60 flex flex-col justify-end p-12 text-white">
                        <h2 className="text-3xl font-bold mb-2">Bienvenido a la red</h2>
                        <p className="text-white/80 max-w-md">
                            Al registrarte, tendrás acceso a todos los módulos de Talento Humano según tu cargo y responsabilidades.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
