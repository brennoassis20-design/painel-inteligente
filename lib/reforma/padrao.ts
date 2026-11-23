// Parâmetros e tabelas padrão (arquivos JSON editáveis). O motor não importa isto: recebe tudo por argumento.
import parametrosJson from "./parametros.json" with { type: "json" };
import tabelasJson from "./tabelas-simples.json" with { type: "json" };
import { calcularReforma } from "./motor.ts";
import type { EntradaCliente, Parametros, RetornoCalculo, TabelasSimples } from "./tipos.ts";

export const PARAMETROS_PADRAO = parametrosJson as unknown as Parametros;
export const TABELAS_SIMPLES_PADRAO = tabelasJson as unknown as TabelasSimples;

export function calcularComPadrao(entrada: EntradaCliente): RetornoCalculo {
  return calcularReforma(entrada, PARAMETROS_PADRAO, TABELAS_SIMPLES_PADRAO);
}
