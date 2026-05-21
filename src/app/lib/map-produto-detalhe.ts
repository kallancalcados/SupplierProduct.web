import {
  DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS,
  ncmPrincipalDoProduto,
  type ProdutoCadastroDetalhe,
} from './supplier-api';
import type { AnaliseComprasFormState } from '../components/AnaliseComprasFields';

const t = (v: string | null | undefined) => (v ?? '').trim();

/** Produto com todos os campos do GET interno, para exibição completa no modal. */
export interface ProdutoDetalheCompleto {
  id: number;
  descProduto: string;
  descProdutoNf: string;
  referFabricante: string;
  ncm: string;
  statusFluxo: number;
  dataCadastro: string;
  fornecedor: string;
  tipoProduto?: string;
  fabricante?: string;
  composicao?: string;
  grade?: string;
  linha?: string;
  griffe?: string;
  colecao?: string;
  obsFornecedor?: string;
  codigoProdutoErp?: string;
  dataAtualizacao?: string;
  usuarioComprasLogin?: string;
  usuarioFiscalLogin?: string;
  subColecao?: string;
  tamCentimetros?: string;
  tipoBico?: string;
  tipoSalto?: string;
  pisada?: string;
  alturaDrop?: string;
  alturaSalto?: string;
  classificacaoAltura?: string;
  material?: string;
  materialInterno?: string;
  ocasiaoUso?: string;
  tecnologia?: string;
  descricaoTecnica?: string;
  descricaoEmocional?: string;
  peso?: number;
  grupoProduto?: string;
  subgrupoProduto?: string;
  codCategoria?: string;
  codSubcategoria?: string;
  unidade?: string;
  tipoStatusProduto?: string;
  sexoTipo?: string;
  tipoItemSped?: string;
  indicadorCfop?: string;
  periodoPcp?: string;
  redeLojas?: string;
  codProdutoSegmento?: string;
  codProdutoSolucao?: string;
  continuidade?: string;
  sujeitoSubstituicaoTributaria?: string;
  cartela?: string;
  consumo?: number;
  restricaoLavagem?: string;
  rotaOperacao?: string;
  tipoEncomenda?: string;
  empresa?: string;
  comissao?: number;
  produtoEmProcesso?: string;
  obsCompras?: string;
  cest?: string;
  tributOrigem?: string;
  tributIcms?: string;
  idExcecaoGrupo?: string;
  classificacaoFiscalFinal?: string;
  caracteristicaContabil?: string;
  enviaLojaVarejo?: boolean;
  enviaVarejoInternet?: boolean;
  variaPrecoPorCor?: boolean;
  obsFiscal?: string;
  contaContabil?: string;
  contaContabilCompra?: string;
  contaContabilVenda?: string;
  contaContabilDevCompra?: string;
  contaContabilDevVenda?: string;
  cores?: Array<{
    codCor: string;
    descCor: string;
    origemCor: string;
    corFabricante: string;
    ncm: string;
  }>;
  precos?: Array<{ codigoTabelaPreco: string; preco: number }>;
  fotos?: Array<{
    corLinx: string;
    nomeArquivo: string;
    caminhoArquivo: string;
    base64Foto: string;
    ordemFoto: number;
  }>;
  barras?: Array<{
    codigoBarra: string;
    corProduto: string;
    tamanho: string;
    grade: string;
  }>;
}

function pickDetalheString(d: ProdutoCadastroDetalhe, camel: string, pascal: string): string {
  const r = d as unknown as Record<string, unknown>;
  const raw = r[camel] ?? r[pascal];
  return typeof raw === 'string' ? raw.trim() : raw != null ? String(raw).trim() : '';
}

function pickDetalheNumber(d: ProdutoCadastroDetalhe, camel: string, pascal: string): number | undefined {
  const r = d as unknown as Record<string, unknown>;
  const raw = r[camel] ?? r[pascal];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function pickDetalheBool(d: ProdutoCadastroDetalhe, camel: string, pascal: string): boolean | undefined {
  const r = d as unknown as Record<string, unknown>;
  const raw = r[camel] ?? r[pascal];
  if (typeof raw === 'boolean') return raw;
  return undefined;
}

function pickDetalheStatus(d: ProdutoCadastroDetalhe): number {
  const r = d as unknown as Record<string, unknown>;
  const raw = r.statusFluxo ?? r.StatusFluxo;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : d.statusFluxo;
}

export function mapProdutoCadastroDetalheCompleto(
  d: ProdutoCadastroDetalhe,
  nomeFornecedor: string,
): ProdutoDetalheCompleto {
  const def = DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS;
  return {
    id: d.id,
    descProduto: d.descProduto,
    descProdutoNf: d.descProdutoNf ?? '',
    referFabricante: d.referFabricante ?? '',
    ncm: ncmPrincipalDoProduto(d.ncm, d.cores) ?? '',
    statusFluxo: pickDetalheStatus(d),
    dataCadastro: d.dataCadastro,
    fornecedor: nomeFornecedor,
    tipoProduto: t(d.tipoProduto) || undefined,
    fabricante: t(d.fabricante) || undefined,
    composicao: t(d.composicao) || undefined,
    grade: t(d.grade) || undefined,
    linha: t(d.linha) || undefined,
    griffe: t(d.griffe) || undefined,
    colecao: t(d.colecao) || undefined,
    obsFornecedor: t(d.obsFornecedor) || undefined,
    codigoProdutoErp: pickDetalheString(d, 'codigoProdutoErp', 'CodigoProdutoErp') || undefined,
    dataAtualizacao: pickDetalheString(d, 'dataAtualizacao', 'DataAtualizacao') || undefined,
    usuarioComprasLogin: pickDetalheString(d, 'usuarioComprasLogin', 'UsuarioComprasLogin') || undefined,
    usuarioFiscalLogin: pickDetalheString(d, 'usuarioFiscalLogin', 'UsuarioFiscalLogin') || undefined,
    subColecao: t(d.subColecao) || undefined,
    tamCentimetros: t(d.tamCentimetros) || undefined,
    tipoBico: t(d.tipoBico) || undefined,
    tipoSalto: t(d.tipoSalto) || undefined,
    pisada: t(d.pisada) || undefined,
    alturaDrop: t(d.alturaDrop) || undefined,
    alturaSalto: t(d.alturaSalto) || undefined,
    classificacaoAltura: t(d.classificacaoAltura) || undefined,
    material: t(d.material) || undefined,
    materialInterno: t(d.materialInterno) || undefined,
    ocasiaoUso: t(d.ocasiaoUso) || undefined,
    tecnologia: t(d.tecnologia) || undefined,
    descricaoTecnica: t(d.descricaoTecnica) || undefined,
    descricaoEmocional: t(d.descricaoEmocional) || undefined,
    peso: pickDetalheNumber(d, 'peso', 'Peso'),
    grupoProduto: pickDetalheString(d, 'grupoProduto', 'GrupoProduto') || undefined,
    subgrupoProduto: pickDetalheString(d, 'subgrupoProduto', 'SubgrupoProduto') || undefined,
    codCategoria: pickDetalheString(d, 'codCategoria', 'CodCategoria') || undefined,
    codSubcategoria: pickDetalheString(d, 'codSubcategoria', 'CodSubcategoria') || undefined,
    unidade: pickDetalheString(d, 'unidade', 'Unidade') || undefined,
    tipoStatusProduto: pickDetalheString(d, 'tipoStatusProduto', 'TipoStatusProduto') || undefined,
    sexoTipo: pickDetalheString(d, 'sexoTipo', 'SexoTipo') || undefined,
    tipoItemSped: pickDetalheString(d, 'tipoItemSped', 'TipoItemSped') || undefined,
    indicadorCfop: pickDetalheString(d, 'indicadorCfop', 'IndicadorCfop') || undefined,
    periodoPcp: pickDetalheString(d, 'periodoPcp', 'PeriodoPcp') || undefined,
    redeLojas: pickDetalheString(d, 'redeLojas', 'RedeLojas') || undefined,
    codProdutoSegmento: pickDetalheString(d, 'codProdutoSegmento', 'CodProdutoSegmento') || undefined,
    codProdutoSolucao: pickDetalheString(d, 'codProdutoSolucao', 'CodProdutoSolucao') || undefined,
    continuidade: pickDetalheString(d, 'continuidade', 'Continuidade') || undefined,
    sujeitoSubstituicaoTributaria:
      pickDetalheString(d, 'sujeitoSubstituicaoTributaria', 'SujeitoSubstituicaoTributaria') || undefined,
    cartela: pickDetalheString(d, 'cartela', 'Cartela') || undefined,
    consumo: pickDetalheNumber(d, 'consumo', 'Consumo'),
    restricaoLavagem: pickDetalheString(d, 'restricaoLavagem', 'RestricaoLavagem') || undefined,
    rotaOperacao: pickDetalheString(d, 'rotaOperacao', 'RotaOperacao') || undefined,
    tipoEncomenda: pickDetalheString(d, 'tipoEncomenda', 'TipoEncomenda') || undefined,
    empresa: pickDetalheString(d, 'empresa', 'Empresa') || undefined,
    comissao: pickDetalheNumber(d, 'comissao', 'Comissao'),
    produtoEmProcesso: pickDetalheString(d, 'produtoEmProcesso', 'ProdutoEmProcesso') || undefined,
    obsCompras: pickDetalheString(d, 'obsCompras', 'ObsCompras') || undefined,
    cest: t(d.cest) || undefined,
    tributOrigem: t(d.tributOrigem) || undefined,
    tributIcms: t(d.tributIcms) || undefined,
    idExcecaoGrupo: t(d.idExcecaoGrupo) || undefined,
    classificacaoFiscalFinal: t(d.classificacaoFiscalFinal) || undefined,
    caracteristicaContabil: t(d.caracteristicaContabil) || undefined,
    enviaLojaVarejo: pickDetalheBool(d, 'enviaLojaVarejo', 'EnviaLojaVarejo'),
    enviaVarejoInternet: pickDetalheBool(d, 'enviaVarejoInternet', 'EnviaVarejoInternet'),
    variaPrecoPorCor: pickDetalheBool(d, 'variaPrecoPorCor', 'VariaPrecoPorCor'),
    obsFiscal: t(d.obsFiscal) || undefined,
    contaContabil: pickDetalheString(d, 'contaContabil', 'ContaContabil') || def.contaContabil,
    contaContabilCompra: pickDetalheString(d, 'contaContabilCompra', 'ContaContabilCompra') || def.contaContabilCompra,
    contaContabilVenda: pickDetalheString(d, 'contaContabilVenda', 'ContaContabilVenda') || def.contaContabilVenda,
    contaContabilDevCompra:
      pickDetalheString(d, 'contaContabilDevCompra', 'ContaContabilDevCompra') || def.contaContabilDevCompra,
    contaContabilDevVenda:
      pickDetalheString(d, 'contaContabilDevVenda', 'ContaContabilDevVenda') || def.contaContabilDevVenda,
    cores: (d.cores ?? []).map((c) => ({
      codCor: c.codCor ?? '',
      descCor: c.descCor ?? '',
      origemCor: c.origemCor ?? '',
      corFabricante: c.corFabricante ?? '',
      ncm: c.ncm ?? '',
    })),
    precos: (d.precos ?? []).map((pr) => ({
      codigoTabelaPreco: pr.codigoTabelaPreco ?? '',
      preco: Number(pr.preco ?? 0),
    })),
    fotos: (d.fotos ?? []).map((f) => ({
      corLinx: f.corLinx ?? '',
      nomeArquivo: f.nomeArquivo ?? '',
      caminhoArquivo: f.caminhoArquivo ?? '',
      base64Foto: f.base64Foto ?? '',
      ordemFoto: f.ordemFoto,
    })),
    barras: (d.barras ?? []).map((b) => ({
      codigoBarra: b.codigoBarra ?? '',
      corProduto: b.corProduto ?? '',
      tamanho: b.tamanho ?? '',
      grade: b.grade ?? '',
    })),
  };
}

export function comprasFormFromProdutoDetalhe(p: ProdutoDetalheCompleto): AnaliseComprasFormState {
  const def = DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS;
  return {
    grupoProduto: p.grupoProduto ?? '',
    subgrupoProduto: p.subgrupoProduto ?? '',
    codCategoria: p.codCategoria ?? '',
    codSubcategoria: p.codSubcategoria ?? '',
    tipoProduto: p.tipoProduto ?? '',
    grade: p.grade ?? '',
    linha: p.linha ?? '',
    griffe: p.griffe ?? '',
    colecao: p.colecao ?? '',
    unidade: p.unidade ?? '',
    tipoStatusProduto: p.tipoStatusProduto ?? '',
    sexoTipo: p.sexoTipo ?? '',
    tipoItemSped: p.tipoItemSped ?? '',
    indicadorCfop: p.indicadorCfop ?? '',
    periodoPcp: p.periodoPcp ?? '',
    redeLojas: p.redeLojas ?? '',
    codProdutoSolucao: p.codProdutoSolucao ?? '',
    codProdutoSegmento: p.codProdutoSegmento ?? '',
    obsCompras: p.obsCompras ?? '',
    contaContabil: p.contaContabil ?? def.contaContabil ?? '',
    contaContabilCompra: p.contaContabilCompra ?? def.contaContabilCompra ?? '',
    contaContabilVenda: p.contaContabilVenda ?? def.contaContabilVenda ?? '',
    contaContabilDevCompra: p.contaContabilDevCompra ?? def.contaContabilDevCompra ?? '',
    contaContabilDevVenda: p.contaContabilDevVenda ?? def.contaContabilDevVenda ?? '',
  };
}
