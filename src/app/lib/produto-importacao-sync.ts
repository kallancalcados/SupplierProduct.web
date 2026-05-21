import type { AnaliseComprasFormState } from '../components/AnaliseComprasFields';
import { loadXlsx, type XlsxWorkBook, type XlsxWorkSheet } from './load-xlsx';
import { comprasFormFromProdutoDetalhe, type ProdutoDetalheCompleto } from './map-produto-detalhe';
import { saveProdutoPreCadastroSnapshot } from './produto-precadastro-snapshot';
import {
  comprasAnaliseDraftStorageKey,
  fiscalAnaliseDraftStorageKey,
  obterDetalheProduto,
  obterProdutoCadastroInterno,
  type ProdutoCadastroDetalhe,
  type ProdutoImportacaoResultado,
  type ProdutoPreCadastroPayload,
} from './supplier-api';

function normDecimal(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim().replace('.', ',');
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function sheetByName(wb: XlsxWorkBook, name: string): XlsxWorkSheet | null {
  const key = wb.SheetNames.find((n) => n.toLowerCase() === name.toLowerCase());
  return key ? wb.Sheets[key] : null;
}

async function readWorkbook(file: File) {
  const XLSX = await loadXlsx();
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

/** Matriz linha×coluna (header: 1), mesma leitura por índice que a API ClosedXML. */
async function sheetMatrix(ws: XlsxWorkSheet | null): Promise<unknown[][]> {
  if (!ws) return [];
  const XLSX = await loadXlsx();
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' });
  return rows.filter((r): r is unknown[] => Array.isArray(r));
}

function cellText(row: unknown[], colIndex: number): string {
  if (colIndex < 0 || colIndex >= row.length) return '';
  const v = row[colIndex];
  if (v == null || v === '') return '';
  return String(v).trim();
}

function cellNullable(row: unknown[], colIndex: number): string | null {
  const t = cellText(row, colIndex);
  return t || null;
}

function isMatrixRowEmpty(row: unknown[], colCount: number): boolean {
  for (let c = 0; c < colCount; c++) {
    if (cellText(row, c)) return false;
  }
  return true;
}

/** Índices 0-based da aba Produtos (colunas 1–25 no Excel / modelo da API). */
const COL_PROD = {
  referFabricante: 0,
  descProduto: 1,
  descProdutoNf: 2,
  fabricante: 3,
  composicao: 4,
  ncm: 5,
  cest: 6,
  tributOrigem: 7,
  classificacaoFiscalFinal: 8,
  obsFornecedor: 9,
  subColecao: 10,
  tamCentimetros: 11,
  tipoBico: 12,
  tipoSalto: 13,
  pisada: 14,
  alturaDrop: 15,
  alturaSalto: 16,
  classificacaoAltura: 17,
  material: 18,
  materialInterno: 19,
  ocasiaoUso: 20,
  tecnologia: 21,
  descricaoTecnica: 22,
  descricaoEmocional: 23,
  peso: 24,
} as const;

const COL_COR = { refer: 0, codCor: 1, descCor: 2, origemCor: 3, corFabricante: 4, ncm: 5 } as const;
const COL_PRECO = { refer: 0, codigoTabelaPreco: 1, preco: 2 } as const;
const COL_BARRA = { refer: 0, codigoBarra: 1, corProduto: 2, tamanho: 3, grade: 4 } as const;

/** Persiste rascunho de compras com todos os campos gravados (GET interno). */
export async function syncComprasCadastroAposImportacao(
  resultado: ProdutoImportacaoResultado,
): Promise<void> {
  const ids = resultado.produtosAtualizadosIds;
  if (!ids.length) return;

  for (const id of ids) {
    try {
      const detalhe = await obterProdutoCadastroInterno(id);
      const nome = detalhe.nomeFornecedor ?? pickDetalheString(detalhe, 'nomeFornecedor', 'NomeFornecedor');
      const { mapProdutoCadastroDetalheCompleto } = await import('./map-produto-detalhe');
      const completo = mapProdutoCadastroDetalheCompleto(detalhe, nome);
      const form = comprasFormFromProdutoDetalhe(completo);
      persistComprasDraft(id, form);
    } catch {
      /* produto pode ter saído da lista; rascunho opcional */
    }
  }
}

/** Persiste rascunho fiscal com todos os campos gravados (GET interno). */
export async function syncFiscalCadastroAposImportacao(
  resultado: ProdutoImportacaoResultado,
): Promise<void> {
  const ids = resultado.produtosAtualizadosIds;
  if (!ids.length) return;

  for (const id of ids) {
    try {
      const detalhe = await obterProdutoCadastroInterno(id);
      const form = fiscalFormFromDetalhe(detalhe);
      persistFiscalDraft(id, detalhe.statusFluxo, form);
    } catch {
      /* ignore */
    }
  }
}

function pickDetalheString(d: ProdutoCadastroDetalhe, camel: string, pascal: string): string {
  const r = d as unknown as Record<string, unknown>;
  const raw = r[camel] ?? r[pascal];
  return typeof raw === 'string' ? raw.trim() : raw != null ? String(raw).trim() : '';
}

function fiscalFormFromDetalhe(d: ProdutoCadastroDetalhe) {
  const r = d as unknown as Record<string, unknown>;
  const ncm =
    pickDetalheString(d, 'ncm', 'Ncm') ||
    (d.cores ?? []).map((c) => (c.ncm ?? '').trim()).find((x) => x) ||
    '';
  return {
    ncm,
    tributIcms: pickDetalheString(d, 'tributIcms', 'TributIcms'),
    idExcecaoGrupo: pickDetalheString(d, 'idExcecaoGrupo', 'IdExcecaoGrupo'),
    caracteristicaContabil: pickDetalheString(d, 'caracteristicaContabil', 'CaracteristicaContabil'),
    enviaLojaVarejo: Boolean(r.enviaLojaVarejo ?? r.EnviaLojaVarejo),
    enviaVarejoInternet: Boolean(r.enviaVarejoInternet ?? r.EnviaVarejoInternet),
    variaPrecoPorCor: Boolean(r.variaPrecoPorCor ?? r.VariaPrecoPorCor),
    obsFiscal: pickDetalheString(d, 'obsFiscal', 'ObsFiscal'),
  };
}

function persistComprasDraft(produtoId: number, form: AnaliseComprasFormState) {
  try {
    window.sessionStorage.setItem(comprasAnaliseDraftStorageKey(produtoId), JSON.stringify(form));
  } catch {
    /* ignore */
  }
}

function persistFiscalDraft(
  produtoId: number,
  statusFluxo: number,
  form: ReturnType<typeof fiscalFormFromDetalhe>,
) {
  try {
    window.sessionStorage.setItem(
      fiscalAnaliseDraftStorageKey(produtoId),
      JSON.stringify({ v: 1, statusFluxo, form }),
    );
  } catch {
    /* ignore */
  }
}

interface FornecedorPlanilhaProduto {
  referFabricante: string | null;
  ncmRaiz: string | null;
  payload: ProdutoPreCadastroPayload;
}

function referenciaKey(refer: string | null, descProduto: string): string {
  const r = (refer ?? '').trim();
  return r ? r.toLowerCase() : `__sem_ref_${descProduto}`.toLowerCase();
}

/** Lê abas Produtos/Cores/Precos/Barras por índice de coluna (igual ProdutoImportacaoService). */
async function parseFornecedorPlanilha(file: File): Promise<FornecedorPlanilhaProduto[]> {
  const wb = await readWorkbook(file);
  const produtosWs = sheetByName(wb, 'Produtos');
  if (!produtosWs) return [];

  const produtoRows = await sheetMatrix(produtosWs);
  const coresRows = await sheetMatrix(sheetByName(wb, 'Cores'));
  const precosRows = await sheetMatrix(sheetByName(wb, 'Precos'));
  const barrasRows = await sheetMatrix(sheetByName(wb, 'Barras'));

  const mapa = new Map<string, FornecedorPlanilhaProduto>();
  const ordemInsercao: FornecedorPlanilhaProduto[] = [];

  for (let r = 1; r < produtoRows.length; r++) {
    const row = produtoRows[r];
    if (isMatrixRowEmpty(row, 25)) continue;

    const refer = cellNullable(row, COL_PROD.referFabricante);
    const descProduto = cellText(row, COL_PROD.descProduto);
    if (!descProduto) continue;

    const key = referenciaKey(refer, descProduto);
    if (mapa.has(key)) continue;

    const peso = normDecimal(row[COL_PROD.peso]);
    const ncmRaiz = cellNullable(row, COL_PROD.ncm);

    const item: FornecedorPlanilhaProduto = {
      referFabricante: refer,
      ncmRaiz,
      payload: {
        descProduto,
        descProdutoNf: cellNullable(row, COL_PROD.descProdutoNf),
        referFabricante: refer,
        fabricante: cellNullable(row, COL_PROD.fabricante),
        composicao: cellNullable(row, COL_PROD.composicao),
        cest: cellNullable(row, COL_PROD.cest),
        tributOrigem: cellNullable(row, COL_PROD.tributOrigem),
        classificacaoFiscalFinal: cellNullable(row, COL_PROD.classificacaoFiscalFinal),
        obsFornecedor: cellNullable(row, COL_PROD.obsFornecedor),
        subColecao: cellNullable(row, COL_PROD.subColecao),
        tamCentimetros: cellNullable(row, COL_PROD.tamCentimetros),
        tipoBico: cellNullable(row, COL_PROD.tipoBico),
        tipoSalto: cellNullable(row, COL_PROD.tipoSalto),
        pisada: cellNullable(row, COL_PROD.pisada),
        alturaDrop: cellNullable(row, COL_PROD.alturaDrop),
        alturaSalto: cellNullable(row, COL_PROD.alturaSalto),
        classificacaoAltura: cellNullable(row, COL_PROD.classificacaoAltura),
        material: cellNullable(row, COL_PROD.material),
        materialInterno: cellNullable(row, COL_PROD.materialInterno),
        ocasiaoUso: cellNullable(row, COL_PROD.ocasiaoUso),
        tecnologia: cellNullable(row, COL_PROD.tecnologia),
        descricaoTecnica: cellNullable(row, COL_PROD.descricaoTecnica),
        descricaoEmocional: cellNullable(row, COL_PROD.descricaoEmocional),
        peso,
        cores: [],
        precos: [],
        fotos: [],
        barras: [],
      },
    };
    mapa.set(key, item);
    ordemInsercao.push(item);
  }

  for (let r = 1; r < coresRows.length; r++) {
    const row = coresRows[r];
    if (isMatrixRowEmpty(row, 6)) continue;
    const refer = cellText(row, COL_COR.refer);
    if (!refer) continue;
    const item = mapa.get(refer.toLowerCase());
    if (!item) continue;
    const codCor = cellText(row, COL_COR.codCor);
    if (!codCor) continue;
    item.payload.cores.push({
      codCor,
      descCor: cellText(row, COL_COR.descCor) || codCor,
      origemCor: cellNullable(row, COL_COR.origemCor),
      corFabricante: cellNullable(row, COL_COR.corFabricante),
      ncm: cellNullable(row, COL_COR.ncm),
    });
  }

  for (let r = 1; r < precosRows.length; r++) {
    const row = precosRows[r];
    if (isMatrixRowEmpty(row, 3)) continue;
    const refer = cellText(row, COL_PRECO.refer);
    if (!refer) continue;
    const item = mapa.get(refer.toLowerCase());
    if (!item) continue;
    const codigo = cellText(row, COL_PRECO.codigoTabelaPreco);
    if (!codigo) continue;
    item.payload.precos.push({
      codigoTabelaPreco: codigo,
      preco: normDecimal(row[COL_PRECO.preco]) ?? 0,
    });
  }

  for (let r = 1; r < barrasRows.length; r++) {
    const row = barrasRows[r];
    if (isMatrixRowEmpty(row, 5)) continue;
    const refer = cellText(row, COL_BARRA.refer);
    if (!refer) continue;
    const item = mapa.get(refer.toLowerCase());
    if (!item) continue;
    item.payload.barras.push({
      codigoBarra: cellText(row, COL_BARRA.codigoBarra),
      corProduto: cellText(row, COL_BARRA.corProduto),
      tamanho: cellText(row, COL_BARRA.tamanho),
      grade: cellNullable(row, COL_BARRA.grade),
    });
  }

  for (const item of ordemInsercao) {
    if (item.payload.cores.length === 0 && item.ncmRaiz) {
      item.payload.cores.push({
        codCor: '001',
        descCor: 'IMPORTADO',
        origemCor: null,
        corFabricante: null,
        ncm: item.ncmRaiz,
      });
    }
  }

  return ordemInsercao;
}

function mergePlanilhaComDetalheFornecedor(
  planilha: ProdutoPreCadastroPayload,
  detalhe: ProdutoCadastroDetalhe,
): ProdutoPreCadastroPayload {
  const api = detalheFornecedorToPayload(detalhe);
  return {
    ...planilha,
    descProduto: api.descProduto || planilha.descProduto,
    descProdutoNf: api.descProdutoNf ?? planilha.descProdutoNf,
    referFabricante: api.referFabricante ?? planilha.referFabricante,
    fabricante: api.fabricante ?? planilha.fabricante,
    composicao: api.composicao ?? planilha.composicao,
    obsFornecedor: api.obsFornecedor ?? planilha.obsFornecedor,
    cores: api.cores.length > 0 ? api.cores : planilha.cores,
    precos: api.precos.length > 0 ? api.precos : planilha.precos,
    barras: api.barras.length > 0 ? api.barras : planilha.barras,
    fotos: api.fotos.length > 0 ? api.fotos : planilha.fotos,
  };
}

/** Salva snapshot local com todos os campos da planilha (GET fornecedor não devolve slides). */
export async function syncFornecedorCadastroAposImportacao(
  file: File,
  resultado: ProdutoImportacaoResultado,
  token: string,
): Promise<void> {
  const ids = [...resultado.produtosCriadosIds, ...resultado.produtosAtualizadosIds];
  if (!ids.length) return;

  let planilha: FornecedorPlanilhaProduto[] = [];
  let parseOk = true;
  try {
    planilha = await parseFornecedorPlanilha(file);
  } catch {
    parseOk = false;
  }

  const byRefer = new Map<string, ProdutoPreCadastroPayload>();
  const byDesc = new Map<string, ProdutoPreCadastroPayload>();
  const emOrdem = planilha.map((p) => p.payload);

  for (const item of planilha) {
    const ref = (item.referFabricante ?? '').trim().toLowerCase();
    if (ref) byRefer.set(ref, item.payload);
    const desc = item.payload.descProduto.trim().toLowerCase();
    if (desc) byDesc.set(desc, item.payload);
  }

  let ordemFallback = 0;
  for (const id of ids) {
    let payload: ProdutoPreCadastroPayload | null = null;
    try {
      const d = await obterDetalheProduto(token, id);
      const ref = (d.referFabricante ?? '').trim().toLowerCase();
      const desc = (d.descProduto ?? '').trim().toLowerCase();
      if (ref && byRefer.has(ref)) payload = byRefer.get(ref)!;
      else if (desc && byDesc.has(desc)) payload = byDesc.get(desc)!;
      else if (parseOk && ordemFallback < emOrdem.length) {
        payload = emOrdem[ordemFallback]!;
        ordemFallback += 1;
      }
      if (!payload) {
        saveProdutoPreCadastroSnapshot(id, detalheFornecedorToPayload(d));
      } else {
        saveProdutoPreCadastroSnapshot(id, mergePlanilhaComDetalheFornecedor(payload, d));
      }
    } catch {
      if (parseOk && ordemFallback < emOrdem.length) {
        saveProdutoPreCadastroSnapshot(id, emOrdem[ordemFallback]!);
        ordemFallback += 1;
      }
    }
  }
}

function detalheFornecedorToPayload(d: ProdutoCadastroDetalhe): ProdutoPreCadastroPayload {
  return {
    descProduto: d.descProduto,
    descProdutoNf: d.descProdutoNf,
    referFabricante: d.referFabricante,
    fabricante: d.fabricante,
    composicao: d.composicao,
    cest: d.cest ?? null,
    tributOrigem: d.tributOrigem ?? null,
    classificacaoFiscalFinal: d.classificacaoFiscalFinal ?? null,
    obsFornecedor: d.obsFornecedor,
    subColecao: d.subColecao ?? null,
    tamCentimetros: d.tamCentimetros ?? null,
    tipoBico: d.tipoBico ?? null,
    tipoSalto: d.tipoSalto ?? null,
    pisada: d.pisada ?? null,
    alturaDrop: d.alturaDrop ?? null,
    alturaSalto: d.alturaSalto ?? null,
    classificacaoAltura: d.classificacaoAltura ?? null,
    material: d.material ?? null,
    materialInterno: d.materialInterno ?? null,
    ocasiaoUso: d.ocasiaoUso ?? null,
    tecnologia: d.tecnologia ?? null,
    descricaoTecnica: d.descricaoTecnica ?? null,
    descricaoEmocional: d.descricaoEmocional ?? null,
    peso: d.peso ?? null,
    cores: (d.cores ?? []).map((c) => ({
      codCor: c.codCor ?? '',
      descCor: c.descCor ?? '',
      origemCor: c.origemCor,
      corFabricante: c.corFabricante,
      ncm: c.ncm,
    })),
    precos: (d.precos ?? []).map((p) => ({
      codigoTabelaPreco: p.codigoTabelaPreco ?? '',
      preco: Number(p.preco ?? 0),
    })),
    fotos: (d.fotos ?? []).map((f) => ({
      corLinx: f.corLinx,
      nomeArquivo: f.nomeArquivo,
      caminhoArquivo: f.caminhoArquivo,
      base64Foto: f.base64Foto,
      ordemFoto: f.ordemFoto,
    })),
    barras: (d.barras ?? []).map((b) => ({
      codigoBarra: b.codigoBarra ?? '',
      corProduto: b.corProduto ?? '',
      tamanho: b.tamanho ?? '',
      grade: b.grade,
    })),
  };
}

/** Após importação bem-sucedida, alinha UI com o conteúdo gravado / planilha. */
export async function syncCadastroCompletoAposImportacao(
  area: 'fornecedor' | 'compras' | 'fiscal',
  file: File,
  resultado: ProdutoImportacaoResultado,
  token?: string | null,
): Promise<void> {
  if (!resultado.sucesso) return;
  if (area === 'compras') {
    await syncComprasCadastroAposImportacao(resultado);
    return;
  }
  if (area === 'fiscal') {
    await syncFiscalCadastroAposImportacao(resultado);
    return;
  }
  if (area === 'fornecedor' && token) {
    await syncFornecedorCadastroAposImportacao(file, resultado, token);
  }
}

export type ComprasPlanilhaExportRow = {
  produtoId: number;
  referFabricante: string;
  descProduto: string;
  grupoProduto: string;
  subgrupoProduto: string;
  codCategoria: string;
  codSubcategoria: string;
  tipoProduto: string;
  grade: string;
  linha: string;
  griffe: string;
  colecao: string;
  unidade: string;
  tipoStatusProduto: string;
  sexoTipo: string;
  tipoItemSped: string;
  contaContabil: string;
  contaContabilCompra: string;
  contaContabilVenda: string;
  contaContabilDevCompra: string;
  contaContabilDevVenda: string;
  indicadorCfop: string;
  periodoPcp: string;
  redeLojas: string;
  codProdutoSolucao: string;
  codProdutoSegmento: string;
  obsCompras: string;
};

export function comprasRowFromDetalhe(id: number, refer: string, desc: string, p: ProdutoDetalheCompleto): ComprasPlanilhaExportRow {
  const form = comprasFormFromProdutoDetalhe(p);
  return {
    produtoId: id,
    referFabricante: refer,
    descProduto: desc,
    grupoProduto: form.grupoProduto,
    subgrupoProduto: form.subgrupoProduto,
    codCategoria: form.codCategoria,
    codSubcategoria: form.codSubcategoria,
    tipoProduto: p.tipoProduto ?? form.tipoProduto,
    grade: p.grade ?? form.grade,
    linha: p.linha ?? form.linha,
    griffe: p.griffe ?? form.griffe,
    colecao: p.colecao ?? form.colecao,
    unidade: form.unidade,
    tipoStatusProduto: form.tipoStatusProduto,
    sexoTipo: form.sexoTipo,
    tipoItemSped: form.tipoItemSped,
    contaContabil: form.contaContabil,
    contaContabilCompra: form.contaContabilCompra,
    contaContabilVenda: form.contaContabilVenda,
    contaContabilDevCompra: form.contaContabilDevCompra,
    contaContabilDevVenda: form.contaContabilDevVenda,
    indicadorCfop: form.indicadorCfop,
    periodoPcp: form.periodoPcp,
    redeLojas: form.redeLojas,
    codProdutoSolucao: p.codProdutoSolucao ?? form.codProdutoSolucao ?? '',
    codProdutoSegmento: form.codProdutoSegmento,
    obsCompras: form.obsCompras,
  };
}

export type FiscalPlanilhaExportRow = {
  produtoId: number;
  referFabricante: string;
  descProduto: string;
  tributIcms: string;
  idExcecaoGrupo: string;
  caracteristicaContabil: string;
  enviaLojaVarejo: string;
  enviaVarejoInternet: string;
  variaPrecoPorCor: string;
  obsFiscal: string;
};

function boolToSn(v: boolean | null | undefined): string {
  if (v == null) return '';
  return v ? 'S' : 'N';
}

export async function injectRowsIntoModeloXlsx(
  modeloBlob: Blob,
  sheetName: string,
  headers: string[],
  dataRows: unknown[][],
): Promise<Blob> {
  const XLSX = await loadXlsx();
  const buf = await modeloBlob.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const aoa = [headers, ...dataRows];
  wb.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(aoa);
  if (!wb.SheetNames.includes(sheetName)) {
    wb.SheetNames.push(sheetName);
  }
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export const COMPRAS_MODELO_HEADERS = [
  'ProdutoId',
  'ReferFabricante',
  'DescProduto',
  'GrupoProduto',
  'SubgrupoProduto',
  'CodCategoria',
  'CodSubcategoria',
  'TipoProduto',
  'Grade',
  'Linha',
  'Griffe',
  'Colecao',
  'Unidade',
  'TipoStatusProduto',
  'SexoTipo',
  'TipoItemSped',
  'ContaContabil',
  'ContaContabilCompra',
  'ContaContabilVenda',
  'ContaContabilDevCompra',
  'ContaContabilDevVenda',
  'IndicadorCfop',
  'PeriodoPcp',
  'RedeLojas',
  'CodProdutoSolucao',
  'CodProdutoSegmento',
  'ObsCompras',
];

export const FISCAL_MODELO_HEADERS = [
  'ProdutoId',
  'ReferFabricante',
  'DescProduto',
  'TributIcms',
  'IdExcecaoGrupo',
  'CaracteristicaContabil',
  'EnviaLojaVarejo',
  'EnviaVarejoInternet',
  'VariaPrecoPorCor',
  'ObsFiscal',
];

export function comprasRowToArray(r: ComprasPlanilhaExportRow): unknown[] {
  return [
    r.produtoId,
    r.referFabricante,
    r.descProduto,
    r.grupoProduto,
    r.subgrupoProduto,
    r.codCategoria,
    r.codSubcategoria,
    r.tipoProduto,
    r.grade,
    r.linha,
    r.griffe,
    r.colecao,
    r.unidade,
    r.tipoStatusProduto,
    r.sexoTipo,
    r.tipoItemSped,
    r.contaContabil,
    r.contaContabilCompra,
    r.contaContabilVenda,
    r.contaContabilDevCompra,
    r.contaContabilDevVenda,
    r.indicadorCfop,
    r.periodoPcp,
    r.redeLojas,
    r.codProdutoSolucao,
    r.codProdutoSegmento,
    r.obsCompras,
  ];
}

export function fiscalRowToArray(r: FiscalPlanilhaExportRow): unknown[] {
  return [
    r.produtoId,
    r.referFabricante,
    r.descProduto,
    r.tributIcms,
    r.idExcecaoGrupo,
    r.caracteristicaContabil,
    r.enviaLojaVarejo,
    r.enviaVarejoInternet,
    r.variaPrecoPorCor,
    r.obsFiscal,
  ];
}

export function fiscalRowFromDetalhe(
  id: number,
  refer: string,
  desc: string,
  d: ProdutoCadastroDetalhe,
): FiscalPlanilhaExportRow {
  const f = fiscalFormFromDetalhe(d);
  return {
    produtoId: id,
    referFabricante: refer,
    descProduto: desc,
    tributIcms: f.tributIcms,
    idExcecaoGrupo: f.idExcecaoGrupo,
    caracteristicaContabil: f.caracteristicaContabil,
    enviaLojaVarejo: boolToSn(f.enviaLojaVarejo),
    enviaVarejoInternet: boolToSn(f.enviaVarejoInternet),
    variaPrecoPorCor: boolToSn(f.variaPrecoPorCor),
    obsFiscal: f.obsFiscal,
  };
}
