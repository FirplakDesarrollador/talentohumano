import { createClient } from '@/lib/supabase/client'

/**
 * FF-Ported: Busca el ID de un cargo basándose en una descripción.
 * Retorna el ID del primer cargo encontrado que coincida o esté contenido en la descripción.
 */
export async function consultarIdCargo(descripcion: string | null): Promise<number | null> {
    if (!descripcion || descripcion.trim() === '') {
        return null;
    }

    const descripcionNormalizada = descripcion.trim().toLowerCase();
    const supabase = createClient();

    try {
        const { data: cargos, error } = await supabase
            .from('cargos')
            .select('id, cargo');

        if (error) {
            console.error('Error fetching cargos:', error);
            return null;
        }

        if (!cargos || cargos.length === 0) return null;

        for (const row of cargos) {
            const r = row as any;
            const cargoDB = r.cargo?.toString().trim().toLowerCase();
            if (!cargoDB) continue;

            // La lógica Dart original revisa si la descripción (input) contiene el cargo (DB)
            // if (descripcionNormalizada == cargoDB || descripcionNormalizada.contains(cargoDB))
            if (descripcionNormalizada === cargoDB || descripcionNormalizada.includes(cargoDB)) {
                return r.id;
            }
        }

        return null;
    } catch (e) {
        console.error('Error en consultarIdCargo:', e);
        return null;
    }
}

/**
 * FF-Ported: Retorna el ID de un cargo buscando coincidencia exacta en la vista query_cargos.
 */
export async function retornarIdCargo(cargo: string | null): Promise<number | null> {
    try {
        if (!cargo || cargo.trim() === '') return null;
        const cargoLimpio = cargo.trim();

        const supabase = createClient();

        // Consulta a la VISTA: public.query_cargos
        const { data: res, error } = await (supabase as any)
            .from('query_cargos')
            .select('id')
            .eq('cargo', cargoLimpio)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching from query_cargos:', error);
            return null;
        }

        if (!res) return null;

        const id = res.id;
        if (id === null || id === undefined) return null;

        return Number(id);
    } catch (e) {
        console.error('retornarIdCargo error:', e);
        return null;
    }
}
