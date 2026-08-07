import { newItemId, type ItemId } from "@/lib/resume/ids";
import type {
  EducationItem,
  ExperienceItem,
  SkillItem,
} from "@/lib/update-intake/content";

/**
 * Estado da etapa 02.
 *
 * As operações são poucas e nomeadas, e a regra "remover apaga o item certo" é
 * exatamente onde um estado indexado por posição erra. Por isso: id em cada item e
 * ações nomeadas, em vez de vários `useState` mexendo em listas por índice.
 *
 * O id vem do gerador do modelo, não de um contador local: na geração esses itens
 * viram itens do currículo, e um id incremental colidiria com os que já existem.
 *
 * A forma dos itens mora em `lib/update-intake/content.ts`, não aqui: ela é a entrada
 * da fusão, que é função pura e não pode depender de um componente.
 */

export type { EducationItem, ExperienceItem, SkillItem };

export type ItemKind = "education" | "experience" | "skill";

export type Draft = Record<string, string | boolean>;

export type IntakeState = {
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: SkillItem[];
  /** Modal aberto, ou `null` quando fechado. */
  modal: ItemKind | null;
  draft: Draft;
};

export const emptyDrafts: Record<ItemKind, Draft> = {
  education: { course: "", school: "", start: "", finish: "" },
  experience: {
    company: "",
    role: "",
    start: "",
    end: "",
    ongoing: false,
    delivered: "",
  },
  skill: { name: "" },
};

export const initialState: IntakeState = {
  education: [],
  experience: [],
  skills: [],
  modal: null,
  draft: {},
};

export type IntakeAction =
  | { type: "openModal"; kind: ItemKind }
  | { type: "closeModal" }
  | { type: "updateDraft"; field: string; value: string | boolean }
  | { type: "confirmDraft" }
  | {
      type: "updateItem";
      kind: ItemKind;
      id: ItemId;
      field: string;
      value: string | boolean;
    }
  | { type: "removeItem"; kind: ItemKind; id: ItemId };

function itemFromDraft(kind: ItemKind, draft: Draft) {
  const texto = (campo: string) => String(draft[campo] ?? "");

  if (kind === "education") {
    return {
      id: newItemId(),
      course: texto("course"),
      school: texto("school"),
      start: texto("start"),
      finish: texto("finish"),
    } satisfies EducationItem;
  }

  if (kind === "experience") {
    return {
      id: newItemId(),
      company: texto("company"),
      role: texto("role"),
      start: texto("start"),
      end: texto("end"),
      ongoing: Boolean(draft.ongoing),
      delivered: texto("delivered"),
    } satisfies ExperienceItem;
  }

  return { id: newItemId(), name: texto("name") } satisfies SkillItem;
}

const listaDe = {
  education: "education",
  experience: "experience",
  skill: "skills",
} as const;

export function intakeReducer(state: IntakeState, action: IntakeAction): IntakeState {
  switch (action.type) {
    case "openModal":
      return { ...state, modal: action.kind, draft: { ...emptyDrafts[action.kind] } };

    case "closeModal":
      // O rascunho morre com o modal: reabrir apresenta campos vazios.
      return { ...state, modal: null, draft: {} };

    case "updateDraft":
      return { ...state, draft: { ...state.draft, [action.field]: action.value } };

    case "confirmDraft": {
      if (state.modal === null) return state;
      const chave = listaDe[state.modal];
      const item = itemFromDraft(state.modal, state.draft);
      return {
        ...state,
        [chave]: [...state[chave], item],
        modal: null,
        draft: {},
      } as IntakeState;
    }

    case "updateItem": {
      const chave = listaDe[action.kind];
      return {
        ...state,
        [chave]: state[chave].map((item) =>
          item.id === action.id ? { ...item, [action.field]: action.value } : item,
        ),
      } as IntakeState;
    }

    case "removeItem": {
      const chave = listaDe[action.kind];
      return {
        ...state,
        [chave]: state[chave].filter((item) => item.id !== action.id),
      } as IntakeState;
    }
  }
}
