import { createElement, type ReactElement } from "react";
import type { Locale } from "@/lib/i18n/dictionary";
import type { Resume } from "@/lib/resume/schema";
import { documentLines } from "./docx";
import {
  BULLET,
  COR,
  ENTRELINHA,
  ESPACO,
  FAMILIA,
  MARGEM,
  NEGRITO,
  REGUA,
  TAMANHO,
} from "./typography";

/**
 * PDF do currículo final.
 *
 * Texto **selecionável**, nunca imagem: o parser precisa extrair o texto, e um PDF
 * rasterizado é indistinguível de uma folha em branco para ele.
 *
 * Reaproveita `documentLines` do DOCX — o conteúdo e a ordem do documento são os mesmos,
 * e duplicá-los aqui seria criar duas fontes de verdade para o mesmo papel. O que muda é
 * só como cada linha é desenhada.
 *
 * `@react-pdf/renderer` entra por import dinâmico, como o SDK do Gemini: motor de layout
 * é pesado e não tem por que encostar no bundle do cliente.
 */

export async function buildPdf(resume: Resume, locale: Locale): Promise<Uint8Array> {
  const { Document, Page, StyleSheet, Text, View, renderToBuffer } =
    await import("@react-pdf/renderer");

  // O negrito do módulo vira o peso que o renderizador entende; com Helvetica ele
  // resolve para Helvetica-Bold, que é a mesma família num peso diferente.
  const peso = (negrito: boolean) => (negrito ? { fontWeight: 700 as const } : {});

  const styles = StyleSheet.create({
    page: {
      // Coluna única e simples, com a margem do módulo — é ela que fixa a largura da
      // coluna, e portanto onde o texto quebra.
      padding: MARGEM,
      fontFamily: FAMILIA.pdf,
      fontSize: TAMANHO.corpo,
      lineHeight: ENTRELINHA,
      color: COR.texto,
    },
    nome: {
      fontSize: TAMANHO.nome,
      ...peso(NEGRITO.nome),
      marginBottom: ESPACO.nome,
    },
    contato: {
      fontSize: TAMANHO.contato,
      ...peso(NEGRITO.contato),
      color: COR.contato,
      marginBottom: ESPACO.linha,
    },
    secao: {
      fontSize: TAMANHO.secao,
      ...peso(NEGRITO.secao),
      marginTop: ESPACO.secao,
      marginBottom: ESPACO.linha,
      borderBottomWidth: REGUA,
      borderBottomColor: COR.regua,
      paddingBottom: 2,
    },
    cargo: {
      fontSize: TAMANHO.cargo,
      ...peso(NEGRITO.cargo),
      marginTop: ESPACO.item,
    },
    corpo: { marginBottom: ESPACO.linha },
    /*
     * O recuo pendurado do DOCX, montado à mão: a linha inteira começa em
     * `recuo - deslocamento`, a marca ocupa uma coluna de `deslocamento` de largura, e o
     * texto — que envolve sozinho — alinha em `recuo`. `marginLeft` no parágrafo todo
     * daria recuo igual para marca e texto, que é outro desenho.
     */
    itemDeLista: {
      flexDirection: "row",
      marginLeft: BULLET.recuo - BULLET.deslocamento,
      marginBottom: ESPACO.bullet,
    },
    marca: { width: BULLET.deslocamento },
    textoDoItem: { flex: 1 },
  });

  // O `Text` do renderizador tem duas assinaturas (documento e SVG); a de estilo é a
  // do documento, e o tipo do estilo vem do próprio `StyleSheet.create`.
  type EstiloDeTexto = (typeof styles)[keyof typeof styles];
  const texto = (style: EstiloDeTexto, conteudo: string, key: number): ReactElement =>
    createElement(Text, { style, key }, conteudo);

  const filhos = documentLines(resume, locale).map((linha, i) => {
    switch (linha.tipo) {
      case "nome":
        return texto(styles.nome, linha.texto, i);
      case "contato":
        return texto(styles.contato, linha.texto, i);
      case "secao":
        return texto(styles.secao, linha.texto, i);
      case "cargo":
        return texto(styles.cargo, linha.texto, i);
      case "bullet":
        return createElement(View, { style: styles.itemDeLista, key: i }, [
          createElement(Text, { style: styles.marca, key: "marca" }, BULLET.marca),
          createElement(Text, { style: styles.textoDoItem, key: "texto" }, linha.texto),
        ]);
      case "corpo":
        return texto(styles.corpo, linha.texto, i);
    }
  });

  const documento = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(View, null, filhos),
    ),
  );

  const buffer = await renderToBuffer(documento);
  return new Uint8Array(buffer);
}
