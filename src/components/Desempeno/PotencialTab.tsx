'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain, Star, CheckCircle, Save, Lightbulb, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const PREGUNTAS_POTENCIAL = [
    {
        id: 'q1',
        categoria: 'Crecimiento',
        pregunta: '¿Tiene la capacidad de asumir responsabilidades más grandes o complejas en los próximos 1-2 años?',
    },
    {
        id: 'q2',
        categoria: 'Iniciativa y Autonomía',
        pregunta: '¿Muestra iniciativa, autonomía y disposición para aprender constantemente?',
    },
    {
        id: 'q3',
        categoria: 'Influencia y Liderazgo',
        pregunta: '¿Influye positivamente en su equipo o compañeros, incluso sin tener un cargo de liderazgo formal?',
    },
    {
        id: 'q4',
        categoria: 'Ejecución y Resultados',
        pregunta: 'Capacidad de cumplimiento de tareas en planner',
    }
]

interface PotencialTabProps {
    cedula: string | number
    nombre: string
    cargo: string
}

export function PotencialTab({ cedula, nombre, cargo }: PotencialTabProps) {
    const supabase = createClient()
    const [respuestas, setRespuestas] = useState<Record<string, number>>({})
    const [guardado, setGuardado] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [registroId, setRegistroId] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('potencial_empleados')
                .select('*')
                .eq('cedula', String(cedula))
                .maybeSingle()

            if (error) throw error

            if (data) {
                setRegistroId((data as any).id)
                setRespuestas((data as any).respuestas || {})
            }
        } catch (error) {
            console.error('Error fetching potencial data:', error)
        } finally {
            setLoading(false)
        }
    }, [cedula, supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleSelect = (preguntaId: string, valor: number) => {
        setRespuestas(prev => ({ ...prev, [preguntaId]: valor }))
        setGuardado(false)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            if (registroId) {
                const { error } = await (supabase
                    .from('potencial_empleados') as any)
                    .update({
                        respuestas: respuestas,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', registroId)
                if (error) throw error
            } else {
                const { data, error } = await (supabase
                    .from('potencial_empleados') as any)
                    .insert({
                        cedula: String(cedula),
                        nombre: nombre,
                        cargo: cargo,
                        respuestas: respuestas
                    })
                    .select('id')
                    .single()
                
                if (error) throw error
                if (data) setRegistroId(data.id)
            }

            setGuardado(true)
            setTimeout(() => setGuardado(false), 3000)
        } catch (error) {
            console.error('Error saving potencial data:', error)
            alert('Hubo un error al guardar los datos.')
        } finally {
            setSaving(false)
        }
    }

    const calculoTotal = Object.values(respuestas).reduce((a, b) => a + b, 0)
    const maxPosible = PREGUNTAS_POTENCIAL.length * 100
    const porcentaje = Object.keys(respuestas).length > 0 
        ? Math.round((calculoTotal / maxPosible) * 100) 
        : 0

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="h-10 w-10 text-purple-600 animate-spin opacity-20" />
                <p className="text-gray-400 text-sm animate-pulse">Cargando evaluación de potencial...</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Cabecera */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Lightbulb className="w-32 h-32" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                            <Brain className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold">Evaluación de Potencial</h2>
                    </div>
                    <p className="text-purple-100 max-w-xl">
                        Evalúa la capacidad de crecimiento, liderazgo y adaptabilidad del empleado para proyectar su plan de carrera en la organización.
                    </p>
                </div>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between col-span-1 md:col-span-3">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center border-4 border-purple-100">
                            <Star className="h-8 w-8 text-purple-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nivel de Potencial</p>
                            <p className="text-3xl font-black text-[#2d4356]">
                                {porcentaje}% <span className="text-lg text-gray-400 font-medium">/ 100%</span>
                            </p>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <p className="text-sm text-gray-500 font-medium">Preguntas respondidas</p>
                        <p className="text-xl font-bold text-purple-600">
                            {Object.keys(respuestas).length} de {PREGUNTAS_POTENCIAL.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cuestionario */}
            <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 md:p-8 space-y-8">
                    {PREGUNTAS_POTENCIAL.map((item, index) => {
                        const valor = respuestas[item.id] || 0;
                        return (
                        <div key={item.id} className="border-b border-gray-50 pb-8 last:border-0 last:pb-0">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="bg-purple-100 text-purple-700 font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-1 block">
                                        {item.categoria}
                                    </span>
                                    <h3 className="text-lg font-semibold text-[#2d4356]">
                                        {item.pregunta}
                                    </h3>
                                </div>
                            </div>
                            
                            <div className="pl-12 max-w-2xl mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-500">Calificación</label>
                                    <span className="text-sm font-bold text-purple-600">{valor}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={valor}
                                    onChange={(e) => handleSelect(item.id, parseInt(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-600"
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                                    <span>0% - Nada</span>
                                    <span>100% - Totalmente</span>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
                
                <div className="bg-gray-50 p-6 flex items-center justify-between border-t border-gray-100">
                    <p className="text-sm text-gray-500 font-medium">
                        {Object.keys(respuestas).length === PREGUNTAS_POTENCIAL.length 
                            ? 'Has respondido todas las preguntas.' 
                            : `Mueve el slider para responder las ${PREGUNTAS_POTENCIAL.length - Object.keys(respuestas).length} preguntas restantes.`}
                    </p>
                    <Button 
                        onClick={handleSave}
                        disabled={saving}
                        className={`px-8 h-12 rounded-xl text-white font-bold transition-all shadow-md ${
                            guardado 
                                ? 'bg-green-500 hover:bg-green-600' 
                                : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                    >
                        {saving ? (
                            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando</>
                        ) : guardado ? (
                            <><CheckCircle className="mr-2 h-5 w-5" /> Guardado</>
                        ) : (
                            <><Save className="mr-2 h-5 w-5" /> Guardar Evaluación</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
