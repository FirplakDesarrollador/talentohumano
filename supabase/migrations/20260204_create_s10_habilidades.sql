-- =============================================
-- S10 Habilidades: Competencias para Líderes
-- =============================================

-- Tabla principal de habilidades S10 para líderes
CREATE TABLE IF NOT EXISTS public.s10_habilidades (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
    cedula INTEGER NOT NULL,
    
    -- Las 10 Habilidades de Liderazgo (cada una con nivel 0-100)
    gestion_integral INTEGER DEFAULT 0 CHECK (gestion_integral >= 0 AND gestion_integral <= 100),
    tecnica_estadistica INTEGER DEFAULT 0 CHECK (tecnica_estadistica >= 0 AND tecnica_estadistica <= 100),
    analisis_falla INTEGER DEFAULT 0 CHECK (analisis_falla >= 0 AND analisis_falla <= 100),
    cinco_s INTEGER DEFAULT 0 CHECK (cinco_s >= 0 AND cinco_s <= 100),
    liderazgo INTEGER DEFAULT 0 CHECK (liderazgo >= 0 AND liderazgo <= 100),
    bitacora INTEGER DEFAULT 0 CHECK (bitacora >= 0 AND bitacora <= 100),
    opt INTEGER DEFAULT 0 CHECK (opt >= 0 AND opt <= 100),
    opt_sis INTEGER DEFAULT 0 CHECK (opt_sis >= 0 AND opt_sis <= 100),
    rrc INTEGER DEFAULT 0 CHECK (rrc >= 0 AND rrc <= 100),
    qrqc INTEGER DEFAULT 0 CHECK (qrqc >= 0 AND qrqc <= 100),
    
    -- Campos de auditoría
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_s10_habilidades_empleado_id ON public.s10_habilidades(empleado_id);
CREATE INDEX IF NOT EXISTS idx_s10_habilidades_cedula ON public.s10_habilidades(cedula);

-- Unique constraint: un registro por empleado
ALTER TABLE public.s10_habilidades ADD CONSTRAINT unique_s10_empleado UNIQUE (empleado_id);

-- RLS Policies
ALTER TABLE public.s10_habilidades ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a todos los usuarios autenticados
CREATE POLICY "Allow read access for authenticated users" ON public.s10_habilidades
    FOR SELECT
    TO authenticated
    USING (true);

-- Política para permitir insert/update/delete a usuarios autenticados
CREATE POLICY "Allow full access for authenticated users" ON public.s10_habilidades
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_s10_habilidades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_s10_habilidades_updated_at
    BEFORE UPDATE ON public.s10_habilidades
    FOR EACH ROW
    EXECUTE FUNCTION update_s10_habilidades_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.s10_habilidades IS 'Almacena las 10 habilidades de liderazgo (S10) para supervisores, jefes, directores y gerentes';
COMMENT ON COLUMN public.s10_habilidades.gestion_integral IS 'GI - Gestión Integral';
COMMENT ON COLUMN public.s10_habilidades.tecnica_estadistica IS 'TE-EE - Técnica Estadística';
COMMENT ON COLUMN public.s10_habilidades.analisis_falla IS 'A/F - Análisis de Falla';
COMMENT ON COLUMN public.s10_habilidades.cinco_s IS '5S - Metodología 5S';
COMMENT ON COLUMN public.s10_habilidades.liderazgo IS 'Liderazgo';
COMMENT ON COLUMN public.s10_habilidades.bitacora IS 'Bitácora';
COMMENT ON COLUMN public.s10_habilidades.opt IS 'OPT - Optimización';
COMMENT ON COLUMN public.s10_habilidades.opt_sis IS 'OPT SIS - Optimización de Sistemas';
COMMENT ON COLUMN public.s10_habilidades.rrc IS 'RRC - Reducción de Riesgo y Control';
COMMENT ON COLUMN public.s10_habilidades.qrqc IS 'QRQC - Quick Response Quality Control';
