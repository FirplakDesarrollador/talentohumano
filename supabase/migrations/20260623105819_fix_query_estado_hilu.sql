CREATE OR REPLACE VIEW query_estado_hilu AS
SELECT em.id,
    em."nombreCompleto",
    em.cargo,
    em.planta,
    em.jefe,
    em.empresa,
    em.activo,
    em.area,
    em."nivelCargo",
    em.modified_at,
    em.modified_by,
    em.foto,
    em.cargo_id,
    COALESCE(fh.completado, false) OR COALESCE(ha.fh_completado, false) AS fh_completado,
    COALESCE(fi.completado, false) OR COALESCE(ha.fi_completado, false) AS fi_completado,
    COALESCE(fl.completado, false) OR COALESCE(ha.fl_completado, false) AS fl_completado,
    fu.completado AS fu_completado,
    au_max.cumple AS ultima_auditoria
   FROM empleados em
     LEFT JOIN LATERAL ( SELECT fh_inner.completado
           FROM "fase_H" fh_inner
          WHERE fh_inner.empleado_id = em.id AND (
              normalize_cargo(fh_inner.cargo) = normalize_cargo(em.cargo) OR 
              (LENGTH(normalize_cargo(fh_inner.cargo)) > 3 AND LENGTH(normalize_cargo(em.cargo)) > 3 AND (
                  normalize_cargo(fh_inner.cargo) LIKE '%' || normalize_cargo(em.cargo) || '%' OR 
                  normalize_cargo(em.cargo) LIKE '%' || normalize_cargo(fh_inner.cargo) || '%'
              ))
          )
          ORDER BY fh_inner.completado DESC NULLS LAST, fh_inner.created_at DESC
         LIMIT 1) fh ON true
     LEFT JOIN LATERAL ( SELECT fi_inner.completado
           FROM "fase_I" fi_inner
          WHERE fi_inner.empleado_id = em.id AND (
              normalize_cargo(fi_inner.cargo) = normalize_cargo(em.cargo) OR 
              (LENGTH(normalize_cargo(fi_inner.cargo)) > 3 AND LENGTH(normalize_cargo(em.cargo)) > 3 AND (
                  normalize_cargo(fi_inner.cargo) LIKE '%' || normalize_cargo(em.cargo) || '%' OR 
                  normalize_cargo(em.cargo) LIKE '%' || normalize_cargo(fi_inner.cargo) || '%'
              ))
          )
          ORDER BY fi_inner.completado DESC NULLS LAST, fi_inner.created_at DESC
         LIMIT 1) fi ON true
     LEFT JOIN LATERAL ( SELECT fl_inner.completado
           FROM "fase_L" fl_inner
          WHERE fl_inner.empleado_id = em.id AND (
              normalize_cargo(fl_inner.cargo) = normalize_cargo(em.cargo) OR 
              (LENGTH(normalize_cargo(fl_inner.cargo)) > 3 AND LENGTH(normalize_cargo(em.cargo)) > 3 AND (
                  normalize_cargo(fl_inner.cargo) LIKE '%' || normalize_cargo(em.cargo) || '%' OR 
                  normalize_cargo(em.cargo) LIKE '%' || normalize_cargo(fl_inner.cargo) || '%'
              ))
          )
          ORDER BY fl_inner.completado DESC NULLS LAST, fl_inner.created_at DESC
         LIMIT 1) fl ON true
     LEFT JOIN LATERAL ( SELECT fu_inner.completado
           FROM "fase_U" fu_inner
          WHERE fu_inner.empleado_id = em.id AND (
              normalize_cargo(fu_inner.cargo) = normalize_cargo(em.cargo) OR 
              (LENGTH(normalize_cargo(fu_inner.cargo)) > 3 AND LENGTH(normalize_cargo(em.cargo)) > 3 AND (
                  normalize_cargo(fu_inner.cargo) LIKE '%' || normalize_cargo(em.cargo) || '%' OR 
                  normalize_cargo(em.cargo) LIKE '%' || normalize_cargo(fu_inner.cargo) || '%'
              ))
          )
          ORDER BY fu_inner.completado DESC NULLS LAST, fu_inner.created_at DESC
         LIMIT 1) fu ON true
     LEFT JOIN LATERAL ( SELECT ha_inner.fh_completado,
            ha_inner.fi_completado,
            ha_inner.fl_completado
           FROM hilu_administrativa ha_inner
          WHERE ha_inner.empleado_id = em.id AND (
              normalize_cargo(ha_inner.cargo::text) = normalize_cargo(em.cargo) OR 
              (LENGTH(normalize_cargo(ha_inner.cargo::text)) > 3 AND LENGTH(normalize_cargo(em.cargo)) > 3 AND (
                  normalize_cargo(ha_inner.cargo::text) LIKE '%' || normalize_cargo(em.cargo) || '%' OR 
                  normalize_cargo(em.cargo) LIKE '%' || normalize_cargo(ha_inner.cargo::text) || '%'
              ))
          )
          ORDER BY ha_inner.created_at DESC
         LIMIT 1) ha ON true
     LEFT JOIN LATERAL ( SELECT au_inner.cumple
           FROM auditorias au_inner
          WHERE au_inner.empleado_id = em.id AND (
              normalize_cargo(au_inner.cargo) = normalize_cargo(em.cargo) OR 
              (LENGTH(normalize_cargo(au_inner.cargo)) > 3 AND LENGTH(normalize_cargo(em.cargo)) > 3 AND (
                  normalize_cargo(au_inner.cargo) LIKE '%' || normalize_cargo(em.cargo) || '%' OR 
                  normalize_cargo(em.cargo) LIKE '%' || normalize_cargo(au_inner.cargo) || '%'
              ))
          )
          ORDER BY au_inner.created_at DESC
         LIMIT 1) au_max ON true
  ORDER BY em."nombreCompleto";
