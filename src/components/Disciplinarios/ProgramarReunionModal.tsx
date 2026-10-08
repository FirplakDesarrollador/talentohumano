'use client'

import { useState } from 'react'
import { X, Loader2, Video } from 'lucide-react'
import { toast } from 'sonner'

interface ProgramarReunionModalProps {
    proceso: { id: number | string }
    onClose: () => void
}

const inputClass = 'w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-[#1D3557]'
const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2'

export function ProgramarReunionModal({ proceso, onClose }: ProgramarReunionModalProps) {
    const [fecha, setFecha] = useState('')
    const [horaInicio, setHoraInicio] = useState('08:00')
    const [horaFin, setHoraFin] = useState('09:00')
    const [programando, setProgramando] = useState(false)

    const puedeProgramar = !!fecha && !!horaInicio && !!horaFin && horaFin > horaInicio

    const handleProgramar = async () => {
        setProgramando(true)
        try {
            const res = await fetch('/api/procesos-disciplinarios/programar-reunion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ procesoId: proceso.id, fecha, horaInicio, horaFin }),
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'No se pudo programar la reunión')

            if (json.empleadoSinCorreo) {
                toast.warning('Reunión creada, pero el empleado no tiene correo registrado: solo quedó invitada Renata')
            } else {
                toast.success('Reunión de Teams programada e invitaciones enviadas')
            }
            onClose()
        } catch (err: any) {
            console.error('Error programando reunión:', err)
            toast.error(err.message || 'No se pudo programar la reunión')
        } finally {
            setProgramando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-300 border border-white">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-xl text-[#1D3557] tracking-tight">Programar reunión</h3>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>
                <p className="text-sm text-slate-500 font-medium mt-1 mb-6">
                    Se creará una reunión de Teams con Renata Lainez y el empleado para la audiencia de descargos.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className={labelClass}>Fecha <span className="text-rose-500">*</span></label>
                        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Hora inicio <span className="text-rose-500">*</span></label>
                            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Hora fin <span className="text-rose-500">*</span></label>
                            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    {fecha && horaFin && horaInicio && horaFin <= horaInicio && (
                        <p className="text-xs text-rose-500 font-semibold">La hora de fin debe ser posterior a la hora de inicio.</p>
                    )}
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} disabled={programando} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 disabled:opacity-40 transition-all">
                        Cancelar
                    </button>
                    <button
                        disabled={!puedeProgramar || programando}
                        onClick={handleProgramar}
                        className="flex-1 h-11 rounded-xl bg-[#1D3557] text-white font-bold text-sm hover:bg-[#162943] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {programando ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Video className="h-4 w-4" /> Programar</>}
                    </button>
                </div>
            </div>
        </div>
    )
}
