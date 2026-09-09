'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Search,
    Loader2,
    FileText,
    Folder,
    ExternalLink,
    RefreshCcw,
    HardDrive,
    ChevronDown,
    ChevronRight,
    UploadCloud,
} from 'lucide-react'
import { SubirArchivoModal } from './SubirArchivoModal'

interface Documento {
    id: number
    categoria: string
    carpeta_origen: string | null
    empleado_id: number | null
    nombre_archivo: string
    storage_path: string
    tamano_bytes: number | null
}

interface CarpetaResumen {
    carpeta: string
    cantidad: number
}

const CATEGORIAS = [
    { value: 'ACTIVOS', label: 'Activos' },
    { value: 'RETIRADOS', label: 'Retirados' },
    { value: 'TERCEROS', label: 'Terceros' },
    { value: 'DOCUMENTOS_VARIOS', label: 'Documentos Varios' },
    { value: 'MINUTAS', label: 'Minutas' },
    { value: 'INCAPACIDADES', label: 'Incapacidades' },
    { value: 'DOTACION', label: 'Dotación' },
    { value: 'CONTRATACIONES_INSTALADORES_2025', label: 'Contrataciones Instaladores' },
    { value: 'RAIZ', label: 'Otros' },
]

function formatSize(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Busca por palabras sueltas (sin importar el orden ni si hay nombres
// intermedios), asi "Alba Ospina" encuentra "Alba Lucia Ospina Guerra".
function normalize(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const SUBCARPETAS_ORDEN = ['Contrato', 'Correspondencia', 'Procesos disciplinarios', 'Documentos'] as const

// El storage_path conserva la ruta original de OneDrive al migrar (ej.
// "activos/NOMBRE/Documentos/Contrato/archivo.pdf"), asi que la subcarpeta
// se puede derivar sin tocar la base de datos. Los nombres de carpeta se
// digitaron a mano en el origen (con variaciones/typos), por eso se busca
// por palabra clave en vez de exigir un segmento exacto; lo que no calza
// en ninguna palabra clave cae en "Documentos".
function classifySubcarpeta(storagePath: string): (typeof SUBCARPETAS_ORDEN)[number] {
    const path = normalize(storagePath)
    if (path.includes('disciplin')) return 'Procesos disciplinarios'
    if (path.includes('correspond')) return 'Correspondencia'
    if (path.includes('contrato')) return 'Contrato'
    return 'Documentos'
}

interface ArchivoDigitalTabProps {
    initialBusqueda?: string
    initialCategoria?: string | null
}

export function ArchivoDigitalTab({ initialBusqueda, initialCategoria }: ArchivoDigitalTabProps) {
    const supabase = createClient()
    const [categoria, setCategoria] = useState(initialCategoria || 'ACTIVOS')
    const [busqueda, setBusqueda] = useState(initialBusqueda || '')
    const [openingId, setOpeningId] = useState<number | null>(null)

    // Solo se carga el RESUMEN por carpeta (liviano) al elegir una categoria.
    // Los archivos de cada carpeta se traen solo cuando el usuario la abre.
    const [folders, setFolders] = useState<CarpetaResumen[]>([])
    const [loadingFolders, setLoadingFolders] = useState(true)
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
    const [filesByFolder, setFilesByFolder] = useState<Record<string, Documento[]>>({})
    const [loadingFiles, setLoadingFiles] = useState<Set<string>>(new Set())
    // Clave "carpeta::subcarpeta" — cada subcarpeta (Contrato, Correspondencia, etc.)
    // se despliega por separado, con clic, igual que la carpeta del empleado.
    const [expandedSubcarpetas, setExpandedSubcarpetas] = useState<Set<string>>(new Set())
    const [uploadCarpeta, setUploadCarpeta] = useState<string | null>(null)

    // Si el padre cambia el filtro (ej. "Ver en Archivo Digital" desde un
    // empleado especifico), sincroniza categoria/busqueda con lo nuevo.
    useEffect(() => {
        if (initialCategoria) setCategoria(initialCategoria)
        if (initialBusqueda !== undefined) setBusqueda(initialBusqueda)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBusqueda, initialCategoria])

    const fetchFolders = async () => {
        setLoadingFolders(true)
        setFilesByFolder({})
        setExpandedFolders(new Set())
        try {
            const { data, error } = await (supabase.rpc as any)('get_archivo_digital_resumen', { p_categoria: categoria })
            if (error) throw error
            setFolders((data || []).map((r: any) => ({ carpeta: r.carpeta_origen, cantidad: Number(r.cantidad) })))
        } catch (error) {
            console.error('Error fetching archivo digital folders:', error)
        } finally {
            setLoadingFolders(false)
        }
    }

    useEffect(() => {
        fetchFolders()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoria])

    const fetchFolderFiles = async (carpeta: string) => {
        setLoadingFiles(prev => new Set(prev).add(carpeta))
        try {
            let query = supabase
                .from('archivo_digital_documentos')
                .select('id, categoria, carpeta_origen, empleado_id, nombre_archivo, storage_path, tamano_bytes')
                .eq('categoria', categoria)

            query = carpeta === 'Sin carpeta' ? query.is('carpeta_origen', null) : query.eq('carpeta_origen', carpeta)

            const { data, error } = await (query as any).order('nombre_archivo', { ascending: true })
            if (error) throw error
            setFilesByFolder(prev => ({ ...prev, [carpeta]: data || [] }))
        } catch (error) {
            console.error('Error fetching folder files:', error)
        } finally {
            setLoadingFiles(prev => {
                const next = new Set(prev)
                next.delete(carpeta)
                return next
            })
        }
    }

    const toggleFolder = (carpeta: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev)
            if (next.has(carpeta)) next.delete(carpeta)
            else next.add(carpeta)
            return next
        })
        if (!filesByFolder[carpeta]) {
            fetchFolderFiles(carpeta)
        }
    }

    const toggleSubcarpeta = (carpeta: string, sub: string) => {
        const key = `${carpeta}::${sub}`
        setExpandedSubcarpetas(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    // Tras subir un archivo: refresca esa carpeta (y su contador) sin colapsar
    // ni recargar todo lo demas que el usuario ya tenia abierto.
    const handleFileUploaded = (carpeta: string) => {
        fetchFolderFiles(carpeta)
        setFolders(prev => prev.map(f => f.carpeta === carpeta ? { ...f, cantidad: f.cantidad + 1 } : f))
    }

    const filteredFolders = useMemo(() => {
        if (!busqueda.trim()) return folders
        const tokens = normalize(busqueda).trim().split(/\s+/)
        return folders.filter(f => {
            const haystack = normalize(f.carpeta)
            return tokens.every(t => haystack.includes(t))
        })
    }, [folders, busqueda])

    // Si venimos de "Ver en Archivo Digital" de un empleado especifico,
    // abre directamente su carpeta en vez de dejar todo colapsado.
    useEffect(() => {
        if (!initialBusqueda || folders.length === 0) return
        const tokens = normalize(initialBusqueda).trim().split(/\s+/)
        const match = folders.find(f => tokens.every(t => normalize(f.carpeta).includes(t)))
        if (match) {
            setExpandedFolders(new Set([match.carpeta]))
            if (!filesByFolder[match.carpeta]) fetchFolderFiles(match.carpeta)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialBusqueda, folders])

    const handleOpen = async (doc: Documento) => {
        setOpeningId(doc.id)
        try {
            const { data, error } = await supabase.storage
                .from('archivo-digital')
                .createSignedUrl(doc.storage_path, 60 * 5)

            if (error) throw error
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
        } catch (error) {
            console.error('Error generando link:', error)
            alert('No se pudo abrir el archivo')
        } finally {
            setOpeningId(null)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map(c => (
                    <button
                        key={c.value}
                        onClick={() => setCategoria(c.value)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${categoria === c.value
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
                            }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative group w-full sm:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por carpeta (nombre del empleado)..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 focus:border-blue-400 rounded-2xl outline-none transition-all text-sm font-medium shadow-sm"
                    />
                </div>
                <button
                    onClick={fetchFolders}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
                    title="Refrescar"
                >
                    <RefreshCcw size={18} className={loadingFolders ? 'animate-spin' : ''} />
                </button>
            </div>

            {loadingFolders ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={40} />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Cargando carpetas...</p>
                </div>
            ) : filteredFolders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                    <HardDrive size={48} className="text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Sin documentos en esta categoría</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredFolders.map(({ carpeta, cantidad }) => {
                        const isOpen = expandedFolders.has(carpeta)
                        const docs = filesByFolder[carpeta]
                        const isLoadingFiles = loadingFiles.has(carpeta)
                        return (
                            <div key={carpeta} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleFolder(carpeta)}
                                    className="w-full px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3 text-left hover:bg-slate-100/50 transition-colors"
                                >
                                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                                        <Folder size={18} />
                                    </div>
                                    <h3 className="font-bold text-slate-800">{carpeta}</h3>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-auto shrink-0">
                                        {cantidad} archivo{cantidad !== 1 ? 's' : ''}
                                    </span>
                                    {isOpen ? (
                                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                                    )}
                                </button>
                                {isOpen && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-6 py-3 border-b border-slate-50 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setUploadCarpeta(carpeta)}
                                                className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors"
                                            >
                                                <UploadCloud className="h-4 w-4" />
                                                Subir archivo
                                            </button>
                                        </div>
                                        {isLoadingFiles || !docs ? (
                                            <div className="flex items-center justify-center gap-2 py-8 text-slate-400 text-sm">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Cargando archivos...
                                            </div>
                                        ) : (
                                            (() => {
                                                const grouped = new Map<string, Documento[]>()
                                                docs.forEach(doc => {
                                                    const key = classifySubcarpeta(doc.storage_path)
                                                    if (!grouped.has(key)) grouped.set(key, [])
                                                    grouped.get(key)!.push(doc)
                                                })
                                                return SUBCARPETAS_ORDEN.filter(sub => grouped.has(sub)).map(sub => {
                                                    const subKey = `${carpeta}::${sub}`
                                                    const isSubOpen = expandedSubcarpetas.has(subKey)
                                                    return (
                                                    <div key={sub}>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSubcarpeta(carpeta, sub)}
                                                            className="w-full px-6 py-2 bg-slate-50/70 border-b border-t border-slate-50 flex items-center gap-2 hover:bg-slate-100/70 transition-colors text-left"
                                                        >
                                                            <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{sub}</span>
                                                            <span className="text-[10px] text-slate-400 ml-auto">{grouped.get(sub)!.length}</span>
                                                            {isSubOpen ? (
                                                                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            ) : (
                                                                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                            )}
                                                        </button>
                                                        {isSubOpen && (
                                                        <div className="divide-y divide-slate-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            {grouped.get(sub)!.map(doc => (
                                                                <button
                                                                    key={doc.id}
                                                                    onClick={() => handleOpen(doc)}
                                                                    disabled={openingId === doc.id}
                                                                    className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-blue-50/30 transition-colors text-left group"
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                                                                        <span className="text-sm font-medium text-slate-700 truncate">{doc.nombre_archivo}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 shrink-0 pl-4">
                                                                        <span className="text-[10px] font-bold text-slate-400">{formatSize(doc.tamano_bytes)}</span>
                                                                        {openingId === doc.id ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                                        ) : (
                                                                            <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        )}
                                                    </div>
                                                    )
                                                })
                                            })()
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <SubirArchivoModal
                isOpen={uploadCarpeta !== null}
                onClose={() => setUploadCarpeta(null)}
                categoria={categoria}
                carpetaOrigen={uploadCarpeta || ''}
                onUploaded={() => uploadCarpeta && handleFileUploaded(uploadCarpeta)}
            />
        </div>
    )
}
