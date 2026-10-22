'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, Loader2, Save, FileText, Briefcase, GraduationCap, Users, Link2, AlertTriangle, Settings, HeartPulse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface PerfilCargoModalProps {
  isOpen: boolean
  onClose: () => void
  cargo: string
}

// Tablas de referencia tal como están en la plantilla de Excel de Talento Humano.
const TIPOS_RIESGO = [
  { value: 'I', label: 'I — Administrativos que no están constantemente en planta' },
  { value: 'II', label: 'II — Almacén, CEDI, logística y administrativos que permanezcan en planta' },
  { value: 'III', label: 'III — Operarios, asesores y promotores' },
]

const NIVELES_CARGO_PERFIL = [
  { value: '0', label: '0 — Gerencia y junta' },
  { value: '1', label: '1 — Directores' },
  { value: '2', label: '2 — Jefes' },
  { value: '3', label: '3 — Coordinadores' },
  { value: '4', label: '4 — Analistas, supervisores - Especialistas' },
  { value: '5', label: '5 — Auxiliares' },
  { value: '6', label: '6 — Operarios-líderes' },
]

const emptyForm = {
  nivel_cargo: '',
  tipo_riesgo: '',
  area: '',
  jefe_encargado: '',
  cargo_jefe: '',
  descripcion_general: '',
  producto_final_valioso: '',
  indicadores: '',
  estudios_formacion: '',
  saberes_tecnicos: '',
  tiempo_experiencia: '',
  requisitos_complementarios: '',
  competencias: '',
  relacionamiento_externos: '',
  problemas_resuelve: '',
  tipo_contrato: '',
  manejo_presupuesto: false,
  modalidad_trabajo: '',
  personal_a_cargo: false,
  cantidad_personas_cargo: '',
  perfil_antropometrico: '',
}

const inputClass = 'h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium text-sm'
const selectClass = 'flex h-11 w-full rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium'
const textareaClass = 'min-h-[90px] rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all text-sm font-medium'

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] font-black uppercase tracking-widest text-[#1e2f3d] ml-1">{label}</Label>
    {children}
  </div>
)

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50 flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
        {icon}
      </div>
      <h4 className="text-xs font-black uppercase tracking-widest text-[#1e2f3d]">{title}</h4>
    </div>
    <div className="p-6 space-y-5">
      {children}
    </div>
  </div>
)

export const PerfilCargoModal: React.FC<PerfilCargoModalProps> = ({ isOpen, onClose, cargo }) => {
  const [formData, setFormData] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const fetchPerfil = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await (supabase as any)
        .from('perfiles_cargo')
        .select('*')
        .ilike('cargo', cargo)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setFormData({
          nivel_cargo: data.nivel_cargo || '',
          tipo_riesgo: data.tipo_riesgo || '',
          area: data.area || '',
          jefe_encargado: data.jefe_encargado || '',
          cargo_jefe: data.cargo_jefe || '',
          descripcion_general: data.descripcion_general || '',
          producto_final_valioso: data.producto_final_valioso || '',
          indicadores: data.indicadores || '',
          estudios_formacion: data.estudios_formacion || '',
          saberes_tecnicos: data.saberes_tecnicos || '',
          tiempo_experiencia: data.tiempo_experiencia || '',
          requisitos_complementarios: data.requisitos_complementarios || '',
          competencias: data.competencias || '',
          relacionamiento_externos: data.relacionamiento_externos || '',
          problemas_resuelve: data.problemas_resuelve || '',
          tipo_contrato: data.tipo_contrato || '',
          manejo_presupuesto: !!data.manejo_presupuesto,
          modalidad_trabajo: data.modalidad_trabajo || '',
          personal_a_cargo: !!data.personal_a_cargo,
          cantidad_personas_cargo: data.cantidad_personas_cargo || '',
          perfil_antropometrico: data.perfil_antropometrico || '',
        })
      } else {
        setFormData(emptyForm)
      }
    } catch (error: any) {
      toast.error('Error al cargar el perfil: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [supabase, cargo])

  useEffect(() => {
    if (isOpen) fetchPerfil()
  }, [isOpen, fetchPerfil])

  const updateField = (field: keyof typeof emptyForm, value: any) => setFormData((prev) => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('perfiles_cargo')
        .upsert({ cargo, ...formData, updated_at: new Date().toISOString() }, { onConflict: 'cargo' })

      if (error) throw error
      toast.success('Perfil del cargo guardado')
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[28px] w-full max-w-[760px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-gray-100">

        {/* Header */}
        <div className="bg-[#1D3557] text-white p-7 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors p-1"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-white/10 p-2.5 rounded-2xl">
              <FileText className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">Perfil del Cargo</h3>
              <p className="text-blue-200/70 text-xs font-bold uppercase tracking-widest mt-0.5 truncate max-w-[500px]">
                {cargo}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D3557] mb-4" />
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cargando perfil...</p>
            </div>
          ) : (
            <>
              <Section title="Información del cargo" icon={<Briefcase className="h-4 w-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Nivel del cargo">
                    <select
                      value={formData.nivel_cargo}
                      onChange={(e) => updateField('nivel_cargo', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Seleccione nivel</option>
                      {NIVELES_CARGO_PERFIL.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Tipo de riesgo">
                    <select
                      value={formData.tipo_riesgo}
                      onChange={(e) => updateField('tipo_riesgo', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Seleccione tipo de riesgo</option>
                      {TIPOS_RIESGO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Área/departamento">
                    <Input value={formData.area} onChange={(e) => updateField('area', e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="Jefe encargado">
                    <Input value={formData.jefe_encargado} onChange={(e) => updateField('jefe_encargado', e.target.value)} className={inputClass} />
                  </FormField>
                  <FormField label="Cargo del jefe">
                    <Input value={formData.cargo_jefe} onChange={(e) => updateField('cargo_jefe', e.target.value)} className={inputClass} />
                  </FormField>
                </div>
                <FormField label="Descripción general del cargo (misión, para qué)">
                  <Textarea value={formData.descripcion_general} onChange={(e) => updateField('descripcion_general', e.target.value)} className={textareaClass} />
                </FormField>
                <FormField label="Producto final valioso (PFV)">
                  <Textarea value={formData.producto_final_valioso} onChange={(e) => updateField('producto_final_valioso', e.target.value)} className={textareaClass} />
                </FormField>
                <FormField label="Estadísticas/indicadores que maneja">
                  <Textarea value={formData.indicadores} onChange={(e) => updateField('indicadores', e.target.value)} className={textareaClass} />
                </FormField>
              </Section>

              <Section title="Requisitos del cargo" icon={<GraduationCap className="h-4 w-4" />}>
                <FormField label="Estudios/formación">
                  <Textarea value={formData.estudios_formacion} onChange={(e) => updateField('estudios_formacion', e.target.value)} className={textareaClass} />
                </FormField>
                <FormField label="Saberes o conocimientos técnicos (HACER)">
                  <Textarea value={formData.saberes_tecnicos} onChange={(e) => updateField('saberes_tecnicos', e.target.value)} className={textareaClass} />
                </FormField>
                <FormField label="Tiempo de experiencia y desempeñando qué funciones">
                  <Textarea value={formData.tiempo_experiencia} onChange={(e) => updateField('tiempo_experiencia', e.target.value)} className={textareaClass} />
                </FormField>
                <FormField label="Conocimientos o requisitos complementarios">
                  <Textarea value={formData.requisitos_complementarios} onChange={(e) => updateField('requisitos_complementarios', e.target.value)} className={textareaClass} />
                </FormField>
              </Section>

              <Section title="Competencias del cargo (SER)" icon={<Users className="h-4 w-4" />}>
                <Textarea value={formData.competencias} onChange={(e) => updateField('competencias', e.target.value)} className={textareaClass} />
              </Section>

              <Section title="Relacionamiento con externos" icon={<Link2 className="h-4 w-4" />}>
                <FormField label="¿Con qué externos tiene relación?">
                  <Textarea value={formData.relacionamiento_externos} onChange={(e) => updateField('relacionamiento_externos', e.target.value)} className={textareaClass} />
                </FormField>
              </Section>

              <Section title="Problemas que resuelve" icon={<AlertTriangle className="h-4 w-4" />}>
                <Textarea value={formData.problemas_resuelve} onChange={(e) => updateField('problemas_resuelve', e.target.value)} className={textareaClass} />
              </Section>

              <Section title="Condiciones del cargo" icon={<Settings className="h-4 w-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField label="Tipo de contrato">
                    <Input value={formData.tipo_contrato} onChange={(e) => updateField('tipo_contrato', e.target.value)} placeholder="Ej: Indefinido, Obra labor..." className={inputClass} />
                  </FormField>
                  <FormField label="Modalidad de trabajo y horarios">
                    <Input value={formData.modalidad_trabajo} onChange={(e) => updateField('modalidad_trabajo', e.target.value)} className={inputClass} />
                  </FormField>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm font-bold text-[#1e2f3d]">Manejo de presupuesto</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${!formData.manejo_presupuesto ? 'text-[#1D3557]' : 'text-gray-300'}`}>No</span>
                    <Switch checked={formData.manejo_presupuesto} onCheckedChange={(val) => updateField('manejo_presupuesto', val)} />
                    <span className={`text-xs font-bold ${formData.manejo_presupuesto ? 'text-[#1D3557]' : 'text-gray-300'}`}>Sí</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-sm font-bold text-[#1e2f3d]">Personal a cargo</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${!formData.personal_a_cargo ? 'text-[#1D3557]' : 'text-gray-300'}`}>No</span>
                    <Switch checked={formData.personal_a_cargo} onCheckedChange={(val) => updateField('personal_a_cargo', val)} />
                    <span className={`text-xs font-bold ${formData.personal_a_cargo ? 'text-[#1D3557]' : 'text-gray-300'}`}>Sí</span>
                  </div>
                </div>

                {formData.personal_a_cargo && (
                  <FormField label="Cantidad de personas a cargo">
                    <Input
                      type="number"
                      min={0}
                      value={formData.cantidad_personas_cargo}
                      onChange={(e) => updateField('cantidad_personas_cargo', e.target.value)}
                      className={inputClass}
                    />
                  </FormField>
                )}
              </Section>

              <Section title="Requisitos físicos y mentales" icon={<HeartPulse className="h-4 w-4" />}>
                <Textarea
                  value={formData.perfil_antropometrico}
                  onChange={(e) => updateField('perfil_antropometrico', e.target.value)}
                  placeholder="N/A si no aplica"
                  className={textareaClass}
                />
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={saving}
            className="rounded-[18px] border-gray-200 text-gray-600 font-black uppercase text-[10px] tracking-widest h-12 px-8"
          >
            Cerrar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="rounded-[18px] bg-[#1D3557] hover:bg-[#162943] text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}
