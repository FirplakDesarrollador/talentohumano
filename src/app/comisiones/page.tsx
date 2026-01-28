'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/Navbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DollarSign, Upload, History, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ComisionesPage() {
    const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload')
    const [loading, setLoading] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [comisiones, setComisiones] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form state
    const [formData, setFormData] = useState({
        area: '',
        ano: new Date().getFullYear().toString(),
        mes: '',
        comentarios: '',
    })
    const [file, setFile] = useState<File | null>(null)

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

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)

        if (!file) {
            setError('Por favor selecciona un archivo')
            return
        }
        if (!formData.area || !formData.mes) {
            setError('Por favor completa todos los campos obligatorios')
            return
        }

        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Usuario no autenticado')

            // 1. Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${formData.area}_${formData.ano}_${formData.mes}_${Math.random().toString(36).substring(7)}.${fileExt}`
            const filePath = `${formData.area}/${formData.ano}/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('comisiones')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('comisiones')
                .getPublicUrl(filePath)

            // 2. Insert record into database
            const { error: insertError } = await supabase
                .from('comisiones')
                .insert([{
                    nombreArchivo: file.name,
                    urlArchivo: publicUrl,
                    ano: formData.ano,
                    mes: formData.mes,
                    area: formData.area,
                    creador: user.email!,
                    comentarios: formData.comentarios,
                    fechaCreacion: new Date().toISOString(),
                }] as any)

            if (insertError) throw insertError

            setSuccess('Comisión cargada exitosamente')
            setFile(null)
            setFormData({
                ...formData,
                comentarios: '',
            })
            // Reset file input
            const fileInput = document.getElementById('file-upload') as HTMLInputElement
            if (fileInput) fileInput.value = ''

        } catch (err: any) {
            console.error('Error uploading commission:', err)
            setError(err.message || 'Error al cargar la comisión')
        } finally {
            setLoading(false)
        }
    }

    const areas = ['Administración', 'Ventas', 'Operaciones', 'RRHH', 'Finanzas', 'Logística']
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    const years = [
        new Date().getFullYear().toString(),
        (new Date().getFullYear() - 1).toString(),
        (new Date().getFullYear() - 2).toString()
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Comisiones</h1>
                        <p className="text-gray-600">Administra y consulta las comisiones de los empleados</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-lg mb-8 w-fit">
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === 'upload' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Upload className="h-4 w-4" />
                        Cargar comisiones
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <History className="h-4 w-4" />
                        Historial comisiones
                    </button>
                </div>

                {activeTab === 'upload' ? (
                    <Card className="max-w-2xl">
                        <CardHeader>
                            <CardTitle>Cargar Nuevo Archivo de Comisiones</CardTitle>
                            <CardDescription>Completa la información para subir una nueva planilla</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpload} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Área</label>
                                        <select
                                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.area}
                                            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                            required
                                        >
                                            <option value="">Seleccione el área...</option>
                                            {areas.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Año</label>
                                        <select
                                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.ano}
                                            onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                                            required
                                        >
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Mes</label>
                                        <select
                                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={formData.mes}
                                            onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                                            required
                                        >
                                            <option value="">Seleccione el mes...</option>
                                            {meses.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Archivo (Excel/PDF)</label>
                                    <div
                                        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${file ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-300'}`}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0])
                                        }}
                                    >
                                        <div className="space-y-1 text-center">
                                            {file ? (
                                                <div className="flex flex-col items-center">
                                                    <FileText className="h-10 w-10 text-blue-500 mb-2" />
                                                    <span className="text-sm font-medium text-blue-900">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFile(null)}
                                                        className="text-xs text-red-500 mt-2 hover:underline"
                                                    >
                                                        Cambiar archivo
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                                    <div className="flex text-sm text-gray-600">
                                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                                                            <span>Sube un archivo</span>
                                                            <input id="file-upload" type="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                                        </label>
                                                        <p className="pl-1">o arrastra y suelta</p>
                                                    </div>
                                                    <p className="text-xs text-gray-500">Formato Excel o PDF hasta 10MB</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Comentarios</label>
                                    <textarea
                                        className="min-h-[100px] w-full flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Agrega una nota u observación..."
                                        value={formData.comentarios}
                                        onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                                    />
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                                        <AlertCircle className="h-4 w-4" />
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                                        <CheckCircle2 className="h-4 w-4" />
                                        {success}
                                    </div>
                                )}

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Cargando planilla...
                                        </>
                                    ) : 'Cargar Comisión'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Cargas</CardTitle>
                            <CardDescription>Visualiza el registro de planillas subidas anteriormente</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                                    <p className="text-gray-500">Obteniendo historial...</p>
                                </div>
                            ) : comisiones.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600 font-medium">No se encontraron registros</p>
                                    <p className="text-sm text-gray-500">Aún no has cargado ninguna comisión.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Archivo</th>
                                                <th className="px-6 py-3 font-semibold">Área</th>
                                                <th className="px-6 py-3 font-semibold">Periodo</th>
                                                <th className="px-6 py-3 font-semibold">Fecha de Carga</th>
                                                <th className="px-6 py-3 font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {comisiones.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-gray-400" />
                                                            {item.nombreArchivo}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">{item.area}</td>
                                                    <td className="px-6 py-4">{item.mes} {item.ano}</td>
                                                    <td className="px-6 py-4">
                                                        {item.fechaCreacion ? new Date(item.fechaCreacion).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <a
                                                            href={item.urlArchivo}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            Descargar
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
