'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ComisionesPage() {
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload')
    const [loading, setLoading] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [comisiones, setComisiones] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [formData, setFormData] = useState({
        area: '',
        ano: '2025',
        mes: '',
        comentarios: '',
    })
    const [file, setFile] = useState<File | null>(null)

    const router = useRouter()
    const supabase = createClient()

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('comisiones')
                .select('*')
                .eq('creador', user.email as string)
                .order('fechaCreacion', { ascending: false })

            if (error) throw error
            setComisiones(data || [])
        } catch (err) {
            console.error('Error fetching history:', err)
        } finally {
            setHistoryLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistory()
        }
    }, [activeTab, fetchHistory])

    const handleUploadClick = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!formData.area || !formData.ano || !formData.mes) {
            setError('Por favor completa todos los campos de selección')
            return
        }

        setShowConfirm(true)
    }

    const processUpload = async () => {
        setShowConfirm(false)

        // Trigger file selection if not already selected
        if (!file) {
            fileInputRef.current?.click()
            return
        }

        performUpload(file)
    }

    const performUpload = async (fileToUpload: File) => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuario no autenticado')

            // 1. Upload file to Supabase Storage
            const fileExt = fileToUpload.name.split('.').pop()
            const storagePath = `${formData.area}/${formData.ano}/${fileToUpload.name}`

            const { error: uploadError } = await supabase.storage
                .from('comisiones')
                .upload(storagePath, fileToUpload, {
                    upsert: true
                })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('comisiones')
                .getPublicUrl(storagePath)

            // 2. Insert record into database
            const { error: insertError } = await supabase
                .from('comisiones')
                .insert([{
                    nombreArchivo: `${formData.area}${formData.ano}${formData.mes}`,
                    urlArchivo: publicUrl,
                    ano: formData.ano,
                    mes: formData.mes,
                    area: formData.area,
                    creador: user.email!,
                    pagado: false,
                    comentarios: formData.comentarios,
                    fechaCreacion: new Date().toISOString(),
                }] as any)

            if (insertError) throw insertError

            setSuccess('El archivo de comisiones se ha cargado correctamente')
            setFile(null)
            setFormData({
                ...formData,
                comentarios: '',
            })

        } catch (err: any) {
            console.error('Error uploading commission:', err)
            setError(err.message || 'Error al cargar la comisión')
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            performUpload(selectedFile)
        }
    }

    const areas = ['Ecommerce', 'Ventas_asesores', 'Ventas_promotores', 'Behome', 'Logistica']
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    const years = ['2024', '2025', '2026']

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header / AppBar style */}
            <div className="bg-[#2d4356] h-14 flex items-center px-4 sticky top-0 z-50 shadow-md">
                <button
                    onClick={() => router.push('/menu')}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <ArrowLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="flex-1 text-center text-white font-medium text-lg">Comisiones</h1>
                <div className="w-8" /> {/* Spacer to center title */}
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Custom Tab Switcher */}
                <div className="flex w-full border-b border-gray-200 mb-8">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 py-3 text-sm font-medium transition-all relative ${activeTab === 'upload' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Cargar comisiones
                        {activeTab === 'upload' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#2d4356]" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-medium transition-all relative ${activeTab === 'history' ? 'text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Historial comisiones
                        {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#2d4356]" />}
                    </button>
                </div>

                {activeTab === 'upload' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <form onSubmit={handleUploadClick} className="space-y-8">
                            {/* Dropdowns row */}
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="flex-1 min-w-[280px]">
                                    <select
                                        className="w-full h-12 rounded-lg border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d4356] transition-shadow shadow-sm appearance-none cursor-pointer"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                                        value={formData.area}
                                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                        required
                                    >
                                        <option value="">Seleccione el área...</option>
                                        {areas.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-32">
                                    <select
                                        className="w-full h-12 rounded-lg border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d4356] transition-shadow shadow-sm appearance-none cursor-pointer"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                                        value={formData.ano}
                                        onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                                        required
                                    >
                                        <option value="">Año</option>
                                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:w-40">
                                    <select
                                        className="w-full h-12 rounded-lg border border-gray-200 bg-white px-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d4356] transition-shadow shadow-sm appearance-none cursor-pointer"
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.25rem' }}
                                        value={formData.mes}
                                        onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                                        required
                                    >
                                        <option value="">Mes</option>
                                        {meses.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                {/* Comments Field */}
                                <div className="flex-1 min-w-[300px] relative group">
                                    <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] text-gray-400 group-focus-within:text-[#2d4356] transition-colors">
                                        Comentarios
                                    </label>
                                    <textarea
                                        className="w-full h-12 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#2d4356] transition-all shadow-sm resize-none"
                                        placeholder="Escriba algún comentario que desee enviar a nómina..."
                                        value={formData.comentarios}
                                        onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-center pt-4">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[#2d4356] hover:bg-[#1e2d3a] text-white px-10 h-10 rounded-lg shadow-sm font-medium transition-all active:scale-95 flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    Cargar
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".xlsx,.xls,.pdf"
                                />
                            </div>

                            {error && (
                                <div className="max-w-md mx-auto flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-100">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="max-w-md mx-auto flex items-center gap-2 text-sm text-green-600 bg-green-50 p-4 rounded-lg border border-green-100">
                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                    {success}
                                </div>
                            )}
                        </form>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        {historyLoading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 text-[#2d4356] animate-spin mb-4" />
                                <p className="text-gray-400 text-sm">Obteniendo historial...</p>
                            </div>
                        ) : comisiones.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm">
                                <FileText className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No se encontraron registros</p>
                                <p className="text-xs text-gray-400">Aún no has cargado ninguna comisión.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {comisiones.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-wrap items-center justify-between gap-4"
                                    >
                                        <div className="flex flex-col gap-1 flex-grow">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-[#2d4356] uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded">
                                                    {item.area?.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleString() : 'N/A'}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-700">
                                                {item.creador}
                                            </p>
                                            <p className="text-xs text-gray-500 italic">
                                                {item.comentarios || 'Sin comentarios'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">PERIODO</span>
                                                <span className="text-xs font-medium text-gray-600">{item.mes} {item.ano}</span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/5 h-9 px-4 rounded-lg flex items-center gap-2"
                                                onClick={() => window.open(item.urlArchivo, '_blank')}
                                            >
                                                <FileSpreadsheet className="h-4 w-4" />
                                                Ver archivo
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmar acción</h3>
                            <p className="text-sm text-gray-500 mb-6">¿Está seguro que desea enviar este archivo de comisiones?</p>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    className="flex-1 h-11 rounded-xl text-gray-500 font-medium"
                                    onClick={() => setShowConfirm(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 h-11 rounded-xl bg-[#2d4356] hover:bg-[#1e2d3a] text-white font-medium"
                                    onClick={processUpload}
                                >
                                    Confirmar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
