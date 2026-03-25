'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
    Award, 
    Loader2,
    Plus,
    Save,
    X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CompetenciasTabProps {
    cedula: number
    nombre: string
    cargo: string
}

interface CompetenciaItem {
    nombre: string
    nivel: number
    nivel_esperado: number
    comentario: string
    isPlaceholder: boolean
}

export function CompetenciasTab({ cedula, nombre, cargo }: CompetenciasTabProps) {
    const supabase = createClient()
    const [competencias, setCompetencias] = useState<CompetenciaItem[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [newCompName, setNewCompName] = useState('')
    const [registroId, setRegistroId] = useState<string | null>(null)
    // Store raw row data for upsert
    const [rawRow, setRawRow] = useState<any>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // 1. Obtener registro del empleado en ComptEmpleados
            const { data: empData, error: empError } = await supabase
                .from('ComptEmpleados' as any)
                .select('*')
                .eq('cedula', String(cedula))

            if (empError) {
                console.error('Error fetching employee competencias:', empError)
            }

            // 2. Obtener la plantilla de competencias para el CARGO
            const { data: cargoData, error: cargoError } = await supabase
                .from('cargos_competencias' as any)
                .select('competencias')
                .eq('cargo', cargo)
                .limit(1)

            if (cargoError) {
                console.error('Error fetching cargo template:', cargoError)
            }

            // 3. Extraer competencias del cargo (lista oficial)
            const cargoCompNames = new Set<string>()
            if (cargoData && (cargoData as any[]).length > 0) {
                const row = (cargoData as any[])[0]
                // El formato en BD es: competencias: { competencias: ["Comp1", "Comp2"] }
                const compsJson = row.competencias
                if (compsJson && Array.isArray(compsJson.competencias)) {
                    compsJson.competencias.forEach((compName: string) => {
                        cargoCompNames.add(compName)
                    })
                } else if (Array.isArray(compsJson)) {
                     // En caso de que sea un array directo
                     compsJson.forEach((compName: string) => {
                        cargoCompNames.add(compName)
                    })
                }
            }

            // 4. Build final list
            const result: CompetenciaItem[] = []
            const registeredNames = new Set<string>()

            // Datos del empleado actual
            const empRow = empData && (empData as any[]).length > 0 ? (empData as any[])[0] : null
            setRawRow(empRow)
            setRegistroId(empRow?.id || null)

            if (empRow) {
                const comps = empRow.competencias || {}
                const niveles = empRow.nivel || {}
                const esperados = empRow.nivel_esperado || {}
                const comentarios = empRow.comentario || {}

                Object.keys(comps).forEach(key => {
                    registeredNames.add(key)
                    result.push({
                        nombre: key,
                        nivel: typeof niveles[key] === 'number' ? niveles[key] : parseFloat(niveles[key]) || 0,
                        nivel_esperado: typeof esperados[key] === 'number' ? esperados[key] : parseFloat(esperados[key]) || 100,
                        comentario: comentarios[key] || '',
                        isPlaceholder: false
                    })
                })
            }

            // Competencias del cargo no registradas en el empleado
            cargoCompNames.forEach(compName => {
                if (!registeredNames.has(compName)) {
                    result.push({
                        nombre: compName,
                        nivel: 0,
                        // Asumimos 100 como nivel esperado por defecto para la plantilla del cargo
                        nivel_esperado: 100,
                        comentario: '',
                        isPlaceholder: true
                    })
                }
            })

            setCompetencias(result)
        } catch (error) {
            console.error('General error in CompetenciasTab:', error)
        } finally {
            setLoading(false)
        }
    }, [cedula, cargo, supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSave = async (comp: CompetenciaItem, newNivel: number, newEsperado: number, newComentario: string) => {
        setSaving(comp.nombre)
        try {
            // Build updated JSON objects from current state
            const currentComps: Record<string, boolean> = {}
            const currentNiveles: Record<string, number> = {}
            const currentEsperados: Record<string, number> = {}
            const currentComentarios: Record<string, string> = {}

            // Start from existing raw row data
            if (rawRow) {
                Object.assign(currentComps, rawRow.competencias || {})
                Object.assign(currentNiveles, rawRow.nivel || {})
                Object.assign(currentEsperados, rawRow.nivel_esperado || {})
                Object.assign(currentComentarios, rawRow.comentario || {})
            }

            // Update the specific competency
            currentComps[comp.nombre] = true
            currentNiveles[comp.nombre] = newNivel
            currentEsperados[comp.nombre] = newEsperado
            currentComentarios[comp.nombre] = newComentario

            if (registroId) {
                // Update existing row
                const { error } = await (supabase.from('ComptEmpleados') as any)
                    .update({
                        competencias: currentComps,
                        nivel: currentNiveles,
                        nivel_esperado: currentEsperados,
                        comentario: currentComentarios,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', registroId)

                if (error) throw error
            } else {
                // Insert new row
                const { error } = await (supabase.from('ComptEmpleados') as any)
                    .insert({
                        cedula: String(cedula),
                        nombre: nombre,
                        cargo: cargo,
                        competencias: currentComps,
                        nivel: currentNiveles,
                        nivel_esperado: currentEsperados,
                        comentario: currentComentarios,
                    })

                if (error) throw error
            }

            await fetchData()
        } catch (error) {
            console.error('Error saving competencia:', error)
            alert('Error al guardar la competencia')
        } finally {
            setSaving(null)
        }
    }

    const handleAddNew = async () => {
        if (!newCompName.trim()) return
        // Add via the same save mechanism
        const fakeComp: CompetenciaItem = {
            nombre: newCompName.trim(),
            nivel: 0,
            nivel_esperado: 0,
            comentario: '',
            isPlaceholder: true
        }
        await handleSave(fakeComp, 0, 0, '')
        setNewCompName('')
        setShowAddForm(false)
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin opacity-20" />
                <p className="text-gray-400 text-sm animate-pulse">Cargando competencias...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
                        <Award className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-[#2d4356]">Competencias por Cargo</h2>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 rounded-lg px-3 py-1">
                    {competencias.length} Competencias
                </Badge>
            </div>

            {/* Chips de competencias actuales */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Competencias actuales</p>
                <div className="flex flex-wrap gap-2">
                    {competencias.map((c, i) => (
                        <span
                            key={i}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all
                                ${c.isPlaceholder 
                                    ? 'bg-gray-100 text-gray-400 border border-dashed border-gray-300' 
                                    : 'bg-[#2d4356] text-white shadow-sm'
                                }`}
                        >
                            {c.nombre}
                            {c.isPlaceholder && <span className="ml-1 text-[10px]">(Pendiente)</span>}
                        </span>
                    ))}
                    {competencias.length === 0 && (
                        <p className="text-gray-400 text-sm">No hay competencias definidas para este cargo.</p>
                    )}
                </div>
            </div>

            {/* Competency Cards with Sliders */}
            <div className="grid grid-cols-1 gap-4">
                {competencias.map((comp, idx) => (
                    <CompetenciaEditCard 
                        key={comp.nombre + idx} 
                        comp={comp} 
                        saving={saving === comp.nombre}
                        onSave={handleSave}
                    />
                ))}
            </div>

            {/* Añadir competencia nueva */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                <p className="text-sm font-bold text-[#2d4356]">Añadir competencia nueva</p>
                {showAddForm ? (
                    <div className="flex gap-2">
                        <Input
                            placeholder="Ingresa la competencia"
                            value={newCompName}
                            onChange={(e) => setNewCompName(e.target.value)}
                            className="flex-1 rounded-xl"
                        />
                        <Button 
                            onClick={handleAddNew} 
                            disabled={saving !== null || !newCompName.trim()}
                            className="rounded-xl bg-[#2d4356] hover:bg-[#1a2b38]"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" onClick={() => { setShowAddForm(false); setNewCompName('') }} className="rounded-xl">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <Button 
                        variant="outline" 
                        onClick={() => setShowAddForm(true)}
                        className="w-full rounded-xl border-dashed border-2 py-3 text-gray-500 hover:text-blue-600 hover:border-blue-300"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Añadir competencia
                    </Button>
                )}
            </div>
        </div>
    )
}

// --- Sub-component: Editable Competency Card ---
function CompetenciaEditCard({ comp, saving, onSave }: { 
    comp: CompetenciaItem; 
    saving: boolean;
    onSave: (comp: CompetenciaItem, nivel: number, esperado: number, comentario: string) => void 
}) {
    const [nivel, setNivel] = useState(comp.nivel)
    const [esperado, setEsperado] = useState(comp.nivel_esperado)
    const [comentario, setComentario] = useState(comp.comentario)
    const [dirty, setDirty] = useState(false)

    const handleNivelChange = (v: number) => { setNivel(v); setDirty(true) }
    const handleEsperadoChange = (v: number) => { setEsperado(v); setDirty(true) }
    const handleComentarioChange = (v: string) => { setComentario(v); setDirty(true) }

    return (
        <div className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${comp.isPlaceholder ? 'border-dashed border-gray-200 opacity-90' : 'border-gray-100'} ${dirty ? 'ring-2 ring-blue-200' : ''}`}>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h4 className="font-bold text-[#2d4356] text-lg">{comp.nombre}</h4>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        {comp.isPlaceholder ? 'Competencia del cargo — Sin calificación' : 'Competencia calificada'}
                    </p>
                </div>
                {dirty && (
                    <Button
                        size="sm"
                        onClick={() => onSave(comp, nivel, esperado, comentario)}
                        disabled={saving}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1"
                    >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Guardar
                    </Button>
                )}
            </div>

            {/* Slider: Nivel de Competencia */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-500">competencia</label>
                    <span className="text-sm font-bold text-[#2d4356]">{nivel.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={nivel}
                    onChange={(e) => handleNivelChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#2d4356]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>0</span>
                    <span>100</span>
                </div>
            </div>

            {/* Slider: Nivel Esperado */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-500">Nivel esperado de competencia</label>
                    <span className="text-sm font-bold text-[#2d4356]">{esperado.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={esperado}
                    onChange={(e) => handleEsperadoChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#2d4356]"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>0</span>
                    <span>100</span>
                </div>
            </div>

            {/* Comentarios */}
            <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Comentarios</label>
                <textarea
                    placeholder="Ingresa los comentarios"
                    value={comentario}
                    onChange={(e) => handleComentarioChange(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                />
            </div>
        </div>
    )
}
