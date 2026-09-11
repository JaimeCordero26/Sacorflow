// Etapas configurables, compartidas por todos los proyectos (no son parte
// del agregado de un proyecto individual).
export interface Stage {
  id: string;
  name: string;
  order: number;
}
