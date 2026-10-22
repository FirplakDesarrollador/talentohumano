'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  X, Plus, Trash2, Edit2, Check, Loader2, ListChecks, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface FuncionesCargoModalProps {
  isOpen: boolean
  onClose: () => void
  cargo: string
}

interface FuncionRow {
  id: number
  funcion: string
  orden: number | null
}

export const FuncionesCargoModal: React.FC<FuncionesCargoModalProps> = ({ isOpen, onClose, cargo }) => {
  const [funciones, setFunciones] = useState<FuncionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [showAdd, setShowAdd] = useState(false)
  const [newFuncionText, setNewFuncionText] = useState('')

  const supabase = createClient()

  const fetchFunciones = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('funciones_cargo')
        .select('id, funcion, orden')
        .ilike('cargo', cargo)
        .order('orden', { ascending: true, nullsFirst: false })
        .order('id', { ascending: true })

      if (error) throw error
      setFunciones(data || [])
    } catch (error: any) {
      toast.error('Error al cargar funciones: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, cargo])

  useEffect(() => {
    if (isOpen) fetchFunciones()
  }, [isOpen, fetchFunciones])

  const handleAdd = async () => {
    if (!newFuncionText.trim()) return
    setIsSaving(true)
    try {
      const maxOrden = funciones.reduce((max, f) => Math.max(max, f.orden ?? 0), 0)
      const { error } = await (supabase as any)
        .from('funciones_cargo')
        .insert({ cargo, funcion: newFuncionText.trim(), orden: maxOrden + 1 })

      if (error) throw error

      toast.success('Función agregada')
      setNewFuncionText('')
      setShowAdd(false)
      fetchFunciones()
    } catch (error: any) {
      toast.error('Error al agregar: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (id: number, oldText: string) => {
    if (!editingText.trim() || editingText === oldText) {
      setEditingId(null)
      return
    }
    setIsSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('funciones_cargo')
        .update({ funcion: editingText.trim(), updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      toast.success('Función actualizada')
      setEditingId(null)
      fetchFunciones()
    } catch (error: any) {
      toast.error('Error al actualizar: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setIsSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('funciones_cargo')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Función eliminada')
      setDeletingId(null)
      fetchFunciones()
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[28px] w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">

        {/* Header */}
        <div className="bg-[#1D3557] text-white p-7 relative">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors p-1"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white/10 p-2.5 rounded-2xl">
              <ListChecks className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Funciones del Cargo</h3>
              <p className="text-blue-200/70 text-xs font-bold uppercase tracking-widest mt-0.5 truncate max-w-[420px]">
                {cargo}
              </p>
            </div>
          </div>
        </div>

        {/* Add bar */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAdd(!showAdd)}
              className="h-11 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 flex items-center gap-2 px-5 font-bold text-xs uppercase tracking-widest"
            >
              <Plus className="h-4 w-4" /> Nueva función
            </Button>
          </div>

          {showAdd && (
            <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
              <div className="flex gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-1">Texto de la función</Label>
                  <Input
                    placeholder="Ej: Realizar seguimiento semanal a los indicadores del área"
                    value={newFuncionText}
                    onChange={(e) => setNewFuncionText(e.target.value)}
                    className="h-11 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 bg-white font-medium"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-xl bg-green-500 hover:bg-green-600 text-white"
                    onClick={handleAdd}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-xl text-gray-400"
                    onClick={() => { setShowAdd(false); setNewFuncionText('') }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D3557] mb-4" />
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cargando funciones...</p>
            </div>
          ) : funciones.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-400 font-medium italic">Este cargo aún no tiene funciones registradas</p>
            </div>
          ) : (
            funciones.map((item, idx) => (
              <div
                key={item.id}
                className="group flex items-start gap-3 p-4 rounded-2xl border-2 border-transparent hover:border-blue-50 hover:bg-blue-50/30 transition-all bg-gray-50/30"
              >
                {editingId === item.id ? (
                  <div className="flex-1 flex gap-3 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-1">Texto de la función</Label>
                      <Input
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="h-11 rounded-xl border-2 border-[#1D3557] focus:ring-0 bg-white font-medium text-[#1D3557]"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200"
                        onClick={() => handleUpdate(item.id, item.funcion)}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        onClick={() => setEditingId(null)}
                        disabled={isSaving}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : deletingId === item.id ? (
                  <div className="flex-1 flex gap-3 items-center justify-between">
                    <div className="flex items-center gap-3 text-red-600">
                      <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wide">
                        ¿Eliminar esta función?
                      </span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="icon"
                        className="h-10 w-10 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200"
                        onClick={() => handleDelete(item.id)}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        onClick={() => setDeletingId(null)}
                        disabled={isSaving}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-7 w-7 rounded-lg bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#1D3557] text-[11px] font-black shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="flex-1 text-sm font-medium text-[#1e2f3d] leading-snug pt-0.5">
                      {item.funcion}
                    </p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl text-blue-500 hover:bg-blue-100/50"
                        onClick={() => {
                          setEditingId(item.id)
                          setEditingText(item.funcion)
                          setDeletingId(null)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-100/50"
                        onClick={() => {
                          setDeletingId(item.id)
                          setEditingId(null)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end">
          <Button
            onClick={onClose}
            className="rounded-[18px] bg-gray-100 hover:bg-gray-200 text-[#1D3557] font-black uppercase text-[10px] tracking-widest h-12 px-8"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
