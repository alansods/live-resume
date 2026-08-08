"use client";

import { Briefcase, Code, GraduationCap, Plus, Trash } from "@phosphor-icons/react";
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Button, Card, Chip, Field, Modal, TextArea } from "@/components/ui";
import { useT } from "@/lib/i18n/context";
import type { Translations } from "@/lib/i18n/dictionary";
import type { ItemId } from "@/lib/resume/ids";
import type { IntakeContent } from "@/lib/update-intake/content";
import shell from "@/components/shell/Shell.module.css";
import { validateIntake, validateMonthYear } from "./dates";
import { initialState, intakeReducer, type IntakeState, type ItemKind } from "./state";
import styles from "./UpdateIntake.module.css";

/**
 * Etapa 02 — Atualizar.
 *
 * Coleta o que mudou desde o currículo importado. Adicionar é sempre por modal,
 * nunca linha em branco inline: o item nasce de um gesto deliberado, e a lista nunca
 * fica com uma casca vazia esperando preenchimento.
 */

function contador(quantidade: number, t: Translations): string {
  return `${quantidade} ${quantidade === 1 ? t.count.one : t.count.many}`;
}

/** O botão de adicionar, igual nos dois lugares onde a seção pode oferecê-lo. */
function AddButton({
  label,
  onAdd,
  className,
}: {
  label: string;
  onAdd: () => void;
  className?: string;
}) {
  return (
    <Button variant="secondary" className={className} onClick={onAdd}>
      <Plus size={15} /> {label}
    </Button>
  );
}

function Section({
  icon,
  label,
  count,
  addLabel,
  onAdd,
  children,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <section>
      <header className={styles.sectionHeader}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.sectionLabel}>{label}</span>
        <span className={styles.sectionCount}>{contador(count, t)}</span>
        {/*
         * Só com itens. Vazia, quem convida é o bloco de estado vazio — dois botões para
         * a mesma ação, um acima do outro, é escolha onde não há escolha.
         */}
        {count > 0 ? (
          <AddButton label={addLabel} onAdd={onAdd} className={styles.addButton} />
        ) : null}
      </header>
      {children}
    </section>
  );
}

/**
 * O vazio da seção.
 *
 * Contorno tracejado e fundo rebaixado: é espaço a preencher, e precisa parecer isso —
 * um cartão cheio e um cartão vazio com a mesma casca competem pela mesma atenção.
 */
function EmptyState({
  icon,
  text,
  hint,
  addLabel,
  onAdd,
}: {
  icon: ReactNode;
  text: string;
  hint: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <span className={styles.emptyText}>{text}</span>
      <span className={styles.emptyHint}>{hint}</span>
      <AddButton label={addLabel} onAdd={onAdd} className={styles.emptyButton} />
    </div>
  );
}

function RemoveRow({ onRemove }: { onRemove: () => void }) {
  const t = useT();
  return (
    <div className={styles.itemActions}>
      <Button variant="ghost" onClick={onRemove} style={{ fontSize: 12 }}>
        <Trash size={13} /> {t.actions.remove}
      </Button>
    </div>
  );
}

export function UpdateIntake({
  onChange,
}: {
  /**
   * A saída da etapa: o que o usuário digitou, sempre que muda. Sem ela a tela é uma
   * caixa fechada — foi o que aconteceu até esta change.
   */
  onChange?: (content: IntakeContent) => void;
}) {
  const t = useT();
  const [state, dispatch] = useReducer(intakeReducer, initialState);

  // O callback fica numa ref para que a emissão dependa só do conteúdo: um `onChange`
  // recriado a cada render do shell não pode disparar emissão, sob pena de laço.
  const emitir = useRef(onChange);
  useEffect(() => {
    emitir.current = onChange;
  });

  // Depende das três listas, não do estado inteiro: abrir o modal e digitar no rascunho
  // não emite nada.
  useEffect(() => {
    emitir.current?.({
      education: state.education,
      experience: state.experience,
      skills: state.skills,
    });
  }, [state.education, state.experience, state.skills]);

  return (
    <div className={shell.stepColumn}>
      <p className={styles.kicker}>{t.step2.kicker}</p>
      <h2 className={styles.title}>{t.step2.title}</h2>
      <p className={styles.subtitle}>{t.step2.subtitle}</p>

      <div className={styles.sections}>
        <Section
          icon={<GraduationCap size={17} />}
          label={t.sections.education}
          count={state.education.length}
          addLabel={t.add.education}
          onAdd={() => dispatch({ type: "openModal", kind: "education" })}
        >
          {state.education.length === 0 ? (
            <EmptyState
              icon={<GraduationCap size={24} />}
              text={t.empty.education}
              hint={t.empty.educationHint}
              addLabel={t.add.education}
              onAdd={() => dispatch({ type: "openModal", kind: "education" })}
            />
          ) : (
            <div className={styles.items}>
              {state.education.map((item) => (
                <Card key={item.id}>
                  <div className={styles.row}>
                    <Field
                      label={t.fields.course}
                      value={item.course}
                      style={{ flex: 2 }}
                      onChange={(event) =>
                        dispatch({
                          type: "updateItem",
                          kind: "education",
                          id: item.id,
                          field: "course",
                          value: event.target.value,
                        })
                      }
                    />
                    <Field
                      label={t.fields.school}
                      value={item.school}
                      style={{ flex: 1 }}
                      onChange={(event) =>
                        dispatch({
                          type: "updateItem",
                          kind: "education",
                          id: item.id,
                          field: "school",
                          value: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className={styles.row}>
                    <DateField
                      label={t.fields.start}
                      value={item.start}
                      onChange={(value) =>
                        dispatch({
                          type: "updateItem",
                          kind: "education",
                          id: item.id,
                          field: "start",
                          value,
                        })
                      }
                    />
                    <DateField
                      label={t.fields.finish}
                      value={item.finish}
                      onChange={(value) =>
                        dispatch({
                          type: "updateItem",
                          kind: "education",
                          id: item.id,
                          field: "finish",
                          value,
                        })
                      }
                    />
                  </div>
                  <RemoveRow
                    onRemove={() =>
                      dispatch({ type: "removeItem", kind: "education", id: item.id })
                    }
                  />
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={<Briefcase size={17} />}
          label={t.sections.experience}
          count={state.experience.length}
          addLabel={t.add.experience}
          onAdd={() => dispatch({ type: "openModal", kind: "experience" })}
        >
          {state.experience.length === 0 ? (
            <EmptyState
              icon={<Briefcase size={24} />}
              text={t.empty.experience}
              hint={t.empty.experienceHint}
              addLabel={t.add.experience}
              onAdd={() => dispatch({ type: "openModal", kind: "experience" })}
            />
          ) : (
            <div className={styles.items}>
              {state.experience.map((item) => (
                <Card key={item.id}>
                  <div className={styles.row}>
                    <Field
                      label={t.fields.company}
                      value={item.company}
                      style={{ flex: 1 }}
                      onChange={(event) =>
                        dispatch({
                          type: "updateItem",
                          kind: "experience",
                          id: item.id,
                          field: "company",
                          value: event.target.value,
                        })
                      }
                    />
                    <Field
                      label={t.fields.role}
                      value={item.role}
                      style={{ flex: 1 }}
                      onChange={(event) =>
                        dispatch({
                          type: "updateItem",
                          kind: "experience",
                          id: item.id,
                          field: "role",
                          value: event.target.value,
                        })
                      }
                    />
                    <DateField
                      label={t.fields.start}
                      value={item.start}
                      width={110}
                      onChange={(value) =>
                        dispatch({
                          type: "updateItem",
                          kind: "experience",
                          id: item.id,
                          field: "start",
                          value,
                        })
                      }
                    />
                    <DateField
                      label={t.fields.end}
                      value={item.end}
                      width={110}
                      disabled={item.ongoing}
                      onChange={(value) =>
                        dispatch({
                          type: "updateItem",
                          kind: "experience",
                          id: item.id,
                          field: "end",
                          value,
                        })
                      }
                    />
                  </div>
                  <TextArea
                    label={t.fields.delivered}
                    value={item.delivered}
                    onChange={(event) =>
                      dispatch({
                        type: "updateItem",
                        kind: "experience",
                        id: item.id,
                        field: "delivered",
                        value: event.target.value,
                      })
                    }
                  />
                  <RemoveRow
                    onRemove={() =>
                      dispatch({ type: "removeItem", kind: "experience", id: item.id })
                    }
                  />
                </Card>
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={<Code size={17} />}
          label={t.sections.skills}
          count={state.skills.length}
          addLabel={t.add.skill}
          onAdd={() => dispatch({ type: "openModal", kind: "skill" })}
        >
          {state.skills.length === 0 ? (
            <EmptyState
              icon={<Code size={24} />}
              text={t.empty.skills}
              hint={t.empty.skillsHint}
              addLabel={t.add.skill}
              onAdd={() => dispatch({ type: "openModal", kind: "skill" })}
            />
          ) : (
            <div className={styles.chips}>
              {state.skills.map((item) => (
                <Chip
                  key={item.id}
                  value={item.name}
                  label={t.fields.skill}
                  removeLabel={t.actions.remove}
                  onChange={(value) =>
                    dispatch({
                      type: "updateItem",
                      kind: "skill",
                      id: item.id,
                      field: "name",
                      value,
                    })
                  }
                  onRemove={() =>
                    dispatch({ type: "removeItem", kind: "skill", id: item.id })
                  }
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      <AddModal state={state} dispatch={dispatch} />
    </div>
  );
}

/**
 * Campo de data com validação na saída, sem máscara que reescreve o que se digita.
 *
 * Aceita um `error` vindo de fora (a validação do modal, recalculada a cada tecla):
 * quando presente, ele manda — é o erro ao vivo, sem depender de sair do campo. O
 * erro local de saída fica como garantia para os campos fora do modal, que não têm
 * validação externa.
 */
function DateField({
  label,
  value,
  onChange,
  width,
  disabled,
  error: errorExterno,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  width?: number;
  disabled?: boolean;
  error?: string;
}) {
  const t = useT();
  const [erro, setErro] = useState<string | undefined>(undefined);

  return (
    <Field
      label={label}
      value={value}
      placeholder={t.dates.format}
      disabled={disabled}
      error={errorExterno ?? erro}
      style={width ? { width } : { flex: 1 }}
      onChange={(event) => {
        onChange(event.target.value);
        if (erro) setErro(undefined);
      }}
      onBlur={(event) => {
        const resultado = validateMonthYear(event.target.value, t);
        setErro(resultado.valid ? undefined : resultado.message);
      }}
    />
  );
}

const camposDoModal: Record<
  ItemKind,
  { field: string; label: keyof Translations["fields"] }[]
> = {
  education: [
    { field: "course", label: "course" },
    { field: "school", label: "school" },
    { field: "start", label: "start" },
    { field: "finish", label: "finish" },
  ],
  experience: [
    { field: "company", label: "company" },
    { field: "role", label: "role" },
    { field: "start", label: "start" },
    { field: "end", label: "end" },
  ],
  skill: [{ field: "name", label: "skill" }],
};

const datasDoModal = new Set(["start", "finish", "end"]);

function AddModal({
  state,
  dispatch,
}: {
  state: IntakeState;
  dispatch: (action: Parameters<typeof intakeReducer>[1]) => void;
}) {
  const t = useT();
  const kind = state.modal;
  if (kind === null) return null;

  const titulo =
    kind === "education"
      ? t.modal.newEducation
      : kind === "experience"
        ? t.modal.newExperience
        : t.modal.newSkill;

  const fechar = () => dispatch({ type: "closeModal" });
  const ongoing = Boolean(state.draft.ongoing);
  const validacao = validateIntake(
    kind,
    (campo) => String(state.draft[campo] ?? ""),
    ongoing,
    t,
  );

  // As duas datas ficam lado a lado; o resto empilha. Um par de campos curtos ocupando
  // uma linha inteira cada deixa o modal mais alto do que o conteúdo pede.
  const campos = camposDoModal[kind];
  const camposDeTexto = campos.filter(({ field }) => !datasDoModal.has(field));
  const camposDeData = campos.filter(({ field }) => datasDoModal.has(field));

  const campoDeData = ({ field, label }: (typeof campos)[number]) => (
    <DateField
      key={field}
      label={t.fields[label]}
      value={String(state.draft[field] ?? "")}
      disabled={field === "end" && ongoing}
      error={
        validacao.dateError && validacao.dateError.field === field
          ? validacao.dateError.message
          : undefined
      }
      onChange={(value) => dispatch({ type: "updateDraft", field, value })}
    />
  );

  return (
    <Modal
      open
      title={titulo}
      onClose={fechar}
      footer={
        <>
          <Button variant="secondary" onClick={fechar}>
            {t.modal.cancel}
          </Button>
          <Button
            onClick={() => dispatch({ type: "confirmDraft" })}
            disabled={!validacao.valid}
          >
            {t.modal.confirm}
          </Button>
        </>
      }
    >
      {camposDeTexto.map(({ field, label }) => (
        <Field
          key={field}
          label={t.fields[label]}
          value={String(state.draft[field] ?? "")}
          onChange={(event) =>
            dispatch({ type: "updateDraft", field, value: event.target.value })
          }
        />
      ))}

      {camposDeData.length > 0 ? (
        <div className={styles.row}>{camposDeData.map(campoDeData)}</div>
      ) : null}

      {kind === "experience" ? (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={ongoing}
              onChange={(event) =>
                dispatch({
                  type: "updateDraft",
                  field: "ongoing",
                  value: event.target.checked,
                })
              }
            />
            {t.fields.ongoing}
          </label>
          <TextArea
            label={t.fields.delivered}
            value={String(state.draft.delivered ?? "")}
            onChange={(event) =>
              dispatch({
                type: "updateDraft",
                field: "delivered",
                value: event.target.value,
              })
            }
          />
        </>
      ) : null}
    </Modal>
  );
}

export type { ItemId };
