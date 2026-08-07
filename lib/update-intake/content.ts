import type { ItemId } from "@/lib/resume/ids";

/**
 * O que o usuário digitou na etapa 02.
 *
 * Mora em `lib/` e não no componente porque é a entrada da fusão, que é função pura: a
 * tela emite este conteúdo, o shell o guarda e `mergeIntake` o transforma em currículo.
 * O componente continua dono do seu estado de interface (modal aberto, rascunho); isto
 * aqui é só o que sobrevive à etapa.
 *
 * Os ids vêm do gerador do modelo e são estáveis enquanto o item existir: eles viram os
 * ids dos itens no currículo em trabalho, e é o que mantém uma sugestão ancorada ao
 * trecho certo depois de o usuário editar outro campo do mesmo item.
 */

export type EducationItem = {
  id: ItemId;
  course: string;
  school: string;
  start: string;
  finish: string;
};

export type ExperienceItem = {
  id: ItemId;
  company: string;
  role: string;
  start: string;
  end: string;
  ongoing: boolean;
  delivered: string;
};

export type SkillItem = {
  id: ItemId;
  name: string;
};

export type IntakeContent = {
  education: readonly EducationItem[];
  experience: readonly ExperienceItem[];
  skills: readonly SkillItem[];
};

export const emptyIntake: IntakeContent = {
  education: [],
  experience: [],
  skills: [],
};
