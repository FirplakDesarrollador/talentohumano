'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  X, Search, Edit2, Check, Loader2, Award, Briefcase, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'

interface CargosModalProps {
  isOpen: boolean
  onClose: () => void
}

export const CargosModal: React.FC<CargosModalProps> = ({ isOpen, onClose }) => {
  const [cargos, setCargos] = useState<{ id: number; cargo: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingCargo, setEditingCargo] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // New Cargo state
  const [showAdd, setShowAdd] = useState(false)
  const [newCargoName, setNewCargoName] = useState('')
  
  const supabase = createClient()

  const fetchCargos = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('cargos')
        .select('id, cargo')
        .order('cargo')
      
      if (error) throw error
      setCargos(data || [])
    } catch (error: any) {
      toast.error('Error al cargar cargos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isOpen) {
      fetchCargos()
    }
  }, [isOpen, fetchCargos])

  const handleCreateCargo = async () => {
    if (!newCargoName.trim()) return

    // Check if it already exists locally
    if (cargos.some(c => c.cargo?.toLowerCase() === newCargoName.trim().toLowerCase())) {
        toast.error('Este cargo ya existe en el directorio')
        return
    }

    setIsSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('cargos')
        .insert({ cargo: newCargoName.trim() })

      if (error) throw error
      
      toast.success(`Cargo "${newCargoName}" creado exitosamente`)
      setNewCargoName('')
      setShowAdd(false)
      fetchCargos()
    } catch (error: any) {
      toast.error('Error al crear: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateCargo = async (id: number, oldName: string) => {
    if (!newName.trim() || newName === oldName) {
      setEditingCargo(null)
      return
    }

    setIsSaving(true)
    try {
      // 1. Update in master table
      const { error: masterError } = await (supabase as any)
        .from('cargos')
        .update({ cargo: newName.trim() })
        .eq('id', id)

      if (masterError) throw masterError

      // 2. Update in employees table (since it uses strings)
      const { error: empError } = await (supabase as any)
        .from('empleados')
        .update({ cargo: newName.trim() })
        .eq('cargo', oldName)

      if (empError) throw empError
      
      toast.success(`Cargo actualizado de "${oldName}" a "${newName}"`)
      setEditingCargo(null)
      fetchCargos()
    } catch (error: any) {
      toast.error('Error al actualizar: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const filteredCargos = cargos.filter(c => 
    c.cargo?.toLowerCase().includes(search.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[28px] w-full max-w-[600px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">
        
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
              <Briefcase className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Gestión de Cargos</h3>
              <p className="text-blue-200/70 text-xs font-bold uppercase tracking-widest mt-0.5">
                Directorio Maestro
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar & Add Button */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre de cargo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-12 rounded-[18px] border-2 border-gray-100 bg-white focus:border-[#1D3557] focus:ring-0 transition-all font-semibold"
              />
            </div>
            <Button 
              onClick={() => setShowAdd(!showAdd)}
              className="h-12 w-12 rounded-[18px] bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 flex items-center justify-center p-0 transition-all hover:scale-105"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>

          {/* Add New Cargo Section */}
          {showAdd && (
            <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
              <div className="flex gap-3 items-center">
                <div className="flex-1 space-y-1">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-1">Nuevo nombre del cargo</Label>
                  <Input 
                    placeholder="Ej, Auxiliar de Planta"
                    value={newCargoName}
                    onChange={(e) => setNewCargoName(e.target.value)}
                    className="h-11 rounded-xl border-2 border-gray-100 focus:border-blue-500 focus:ring-0 bg-white font-bold"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 self-end pb-1">
                  <Button 
                    size="icon" 
                    className="h-10 w-10 rounded-xl bg-green-500 hover:bg-green-600 text-white"
                    onClick={handleCreateCargo}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-10 w-10 rounded-xl text-gray-400"
                    onClick={() => setShowAdd(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D3557] mb-4" />
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cargando directorio...</p>
            </div>
          ) : filteredCargos.length === 0 ? (
            <div className="py-20 text-center">
               <p className="text-gray-400 font-medium italic">No se encontraron cargos</p>
            </div>
          ) : (
            filteredCargos.map((item) => (
              <div 
                key={item.id}
                className="group flex items-center justify-between p-4 rounded-2xl border-2 border-transparent hover:border-blue-50 hover:bg-blue-50/30 transition-all bg-gray-50/30"
              >
                {editingCargo === item.id ? (
                  <div className="flex-1 flex gap-3 items-center">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-blue-600 ml-1">Nuevo nombre del cargo</Label>
                      <Input 
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="h-11 rounded-xl border-2 border-[#1D3557] focus:ring-0 bg-white font-bold text-[#1D3557]"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2 self-end pb-1">
                      <Button 
                        size="icon" 
                        className="h-10 w-10 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200"
                        onClick={() => handleUpdateCargo(item.id, item.cargo)}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="h-10 w-10 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        onClick={() => setEditingCargo(null)}
                        disabled={isSaving}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-[#1D3557]">
                        <Award className="h-5 w-5 opacity-40" />
                      </div>
                      <span className="font-bold text-[#1D3557] uppercase text-xs tracking-wide">
                        {item.cargo}
                      </span>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-10 w-10 rounded-xl text-blue-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-100/50"
                      onClick={() => {
                        setEditingCargo(item.id)
                        setNewName(item.cargo)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
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
            Finalizar gestión
          </Button>
        </div>
      </div>
    </div>
  )
}
