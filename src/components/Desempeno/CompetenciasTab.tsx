'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    Award,
    Loader2,
    Plus,
    Save,
    X,
    Pencil,
    Check,
    Trash2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

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

    // Edicion del nombre de una competencia (chips de "Competencias actuales")
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editValue, setEditValue] = useState('')
    const [pendingEdit, setPendingEdit] = useState<number | null>(null)
    const [pendingSave, setPendingSave] = useState<{ index: number; newValue: string } | null>(null)

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

    const handleRename = async (comp: CompetenciaItem, newName: string) => {
        const trimmed = newName.trim()
        if (!trimmed || trimmed === comp.nombre) return

        setSaving(comp.nombre)
        try {
            const currentComps: Record<string, boolean> = {}
            const currentNiveles: Record<string, number> = {}
            const currentEsperados: Record<string, number> = {}
            const currentComentarios: Record<string, string> = {}

            if (rawRow) {
                Object.assign(currentComps, rawRow.competencias || {})
                Object.assign(currentNiveles, rawRow.nivel || {})
                Object.assign(currentEsperados, rawRow.nivel_esperado || {})
                Object.assign(currentComentarios, rawRow.comentario || {})
            }

            // Quita el nombre anterior (si existia) y agrega el nuevo con los mismos valores
            delete currentComps[comp.nombre]
            delete currentNiveles[comp.nombre]
            delete currentEsperados[comp.nombre]
            delete currentComentarios[comp.nombre]

            currentComps[trimmed] = true
            currentNiveles[trimmed] = comp.nivel
            currentEsperados[trimmed] = comp.nivel_esperado
            currentComentarios[trimmed] = comp.comentario

            if (registroId) {
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
            console.error('Error renombrando competencia:', error)
            alert('Error al renombrar la competencia')
        } finally {
            setSaving(null)
        }
    }

    const handleDelete = async (comp: CompetenciaItem) => {
        if (!rawRow || !registroId) return

        setSaving(comp.nombre)
        try {
            const currentComps: Record<string, boolean> = { ...(rawRow.competencias || {}) }
            const currentNiveles: Record<string, number> = { ...(rawRow.nivel || {}) }
            const currentEsperados: Record<string, number> = { ...(rawRow.nivel_esperado || {}) }
            const currentComentarios: Record<string, string> = { ...(rawRow.comentario || {}) }

            delete currentComps[comp.nombre]
            delete currentNiveles[comp.nombre]
            delete currentEsperados[comp.nombre]
            delete currentComentarios[comp.nombre]

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

            await fetchData()
        } catch (error) {
            console.error('Error eliminando competencia:', error)
            alert('Error al eliminar la competencia')
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
                        <div
                            key={i}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all
                                ${c.isPlaceholder
                                    ? 'bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                                    : 'bg-[#2d4356] text-white shadow-sm'
                                }`}
                        >
                            {editingIndex === i ? (
                                <>
                                    <input
                                        autoFocus
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className={`bg-transparent border-b outline-none min-w-0 w-40 ${
                                            c.isPlaceholder ? 'border-gray-400 text-gray-700' : 'border-white/50 text-white'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setPendingSave({ index: i, newValue: editValue })}
                                        disabled={!editValue.trim()}
                                        className="shrink-0 opacity-90 hover:opacity-100 hover:scale-110 transition-all disabled:opacity-40"
                                        title="Guardar o cancelar edición"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span>{c.nombre}</span>
                                    {c.isPlaceholder && <span className="text-[10px]">(Pendiente)</span>}
                                    <button
                                        type="button"
                                        onClick={() => setPendingEdit(i)}
                                        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                                        title="Editar nombre de la competencia"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                    {competencias.length === 0 && (
                        <p className="text-gray-400 text-sm">No hay competencias definidas para este cargo.</p>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={pendingEdit !== null}
                variant="info"
                title="¿Editar esta competencia?"
                description={pendingEdit !== null ? `Vas a editar el nombre de "${competencias[pendingEdit].nombre}".` : ''}
                confirmLabel="Editar"
                cancelLabel="Cancelar"
                onConfirm={() => {
                    if (pendingEdit === null) return
                    setEditValue(competencias[pendingEdit].nombre)
                    setEditingIndex(pendingEdit)
                    setPendingEdit(null)
                }}
                onCancel={() => setPendingEdit(null)}
            />

            <ConfirmDialog
                isOpen={pendingSave !== null}
                variant="info"
                title="¿Guardar los cambios?"
                description={
                    pendingSave !== null
                        ? `"${competencias[pendingSave.index].nombre}" pasará a llamarse "${pendingSave.newValue.trim()}".`
                        : ''
                }
                confirmLabel="Guardar"
                cancelLabel="Cancelar edición"
                onConfirm={() => {
                    if (pendingSave === null) return
                    handleRename(competencias[pendingSave.index], pendingSave.newValue)
                    setEditingIndex(null)
                    setPendingSave(null)
                }}
                onCancel={() => {
                    setEditingIndex(null)
                    setPendingSave(null)
                }}
            />

            {/* Competency Cards with Sliders */}
            <div className="grid grid-cols-1 gap-4">
                {competencias.map((comp, idx) => (
                    <CompetenciaEditCard
                        key={comp.nombre + idx}
                        comp={comp}
                        saving={saving === comp.nombre}
                        onSave={handleSave}
                        onDelete={handleDelete}
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

// Color segun el valor: 0-59 rojo, 60-79 naranja, 80-100 verde
function getNivelColor(value: number): string {
    if (value < 60) return '#ef4444'
    if (value < 80) return '#f97316'
    return '#22c55e'
}

// --- Sub-component: Editable Competency Card ---
function CompetenciaEditCard({ comp, saving, onSave, onDelete }: {
    comp: CompetenciaItem;
    saving: boolean;
    onSave: (comp: CompetenciaItem, nivel: number, esperado: number, comentario: string) => void
    onDelete: (comp: CompetenciaItem) => void
}) {
    const [nivel, setNivel] = useState(comp.nivel)
    const [esperado, setEsperado] = useState(comp.nivel_esperado)
    const [comentario, setComentario] = useState(comp.comentario)
    const [dirty, setDirty] = useState(false)
    const [pendingDelete, setPendingDelete] = useState(false)

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
                <div className="flex items-center gap-2">
                    {!comp.isPlaceholder && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPendingDelete(true)}
                            disabled={saving}
                            className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 gap-1"
                            title="Eliminar competencia"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    )}
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
            </div>

            <ConfirmDialog
                isOpen={pendingDelete}
                variant="danger"
                title="¿Eliminar esta competencia?"
                description={`Se eliminará "${comp.nombre}" de las competencias calificadas de este empleado. Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
                onConfirm={() => { onDelete(comp); setPendingDelete(false) }}
                onCancel={() => setPendingDelete(false)}
            />

            {/* Slider: Nivel de Competencia */}
            <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-500">competencia</label>
                    <span className="text-sm font-bold" style={{ color: getNivelColor(nivel) }}>{nivel.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={nivel}
                    onChange={(e) => handleNivelChange(parseFloat(e.target.value))}
                    style={{
                        accentColor: getNivelColor(nivel),
                        background: `linear-gradient(to right, ${getNivelColor(nivel)} ${nivel}%, #e5e7eb ${nivel}%)`
                    }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
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
                    <span className="text-sm font-bold" style={{ color: getNivelColor(esperado) }}>{esperado.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.5"
                    value={esperado}
                    onChange={(e) => handleEsperadoChange(parseFloat(e.target.value))}
                    style={{
                        accentColor: getNivelColor(esperado),
                        background: `linear-gradient(to right, ${getNivelColor(esperado)} ${esperado}%, #e5e7eb ${esperado}%)`
                    }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
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
