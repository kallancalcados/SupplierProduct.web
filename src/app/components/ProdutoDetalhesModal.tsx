import { useEffect, useLayoutEffect, useState } from 'react';
import { toast } from 'sonner';
import { X, Package, FileText, Palette, DollarSign, Camera, Barcode, CheckCircle, XCircle, ClipboardList } from 'lucide-react';
import {
  ApiError,
  DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS,
  iniciarAnaliseCompras,
  iniciarAnaliseFiscal,
  comprasAnaliseDraftStorageKey,
  fiscalAnaliseDraftStorageKey,
  ncmPrincipalDoProduto,
  type ProdutoAnaliseComprasPayload,
  type ProdutoAnaliseFiscalPayload,
} from '../lib/supplier-api';
import { AnaliseComprasFields } from './AnaliseComprasFields';
import {
  AnaliseComprasReadonly,
  AnaliseFiscalReadonly,
  PreCadastroFornecedorExtrasReadonly,
} from './ProdutoDetalheReadonlySecoes';
import { comprasFormFromProdutoDetalhe, type ProdutoDetalheCompleto } from '../lib/map-produto-detalhe';
import { normalizeIndicadorCfopForPersist } from '../lib/erp-produto-integracao';
import {
  getStatusProdutoColor,
  isFilaCompras,
  labelStatusProduto,
  motivoDevolucaoFiscal,
} from '../../constants/produto-status-fluxo';

interface Cor {
  codCor: string;
  descCor: string;
  origemCor: string;
  corFabricante: string;
  ncm: string;
}

interface Preco {
  codigoTabelaPreco: string;
  preco: number;
}

interface Foto {
  corLinx: string;
  nomeArquivo: string;
  caminhoArquivo: string;
  base64Foto: string;
  ordemFoto: number;
}

interface Barra {
  codigoBarra: string;
  corProduto: string;
  tamanho: string;
  grade: string;
}

type Product = ProdutoDetalheCompleto;

interface ProdutoDetalhesModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAprovar?: () => void | Promise<void>;
  onReprovar?: () => void | Promise<void>;
  /** Chamado após salvar análise (compras ou fiscal) com sucesso — ex.: recarregar lista. */
  onMutationSuccess?: () => void;
  showActions?: boolean;
  departamento?: 'fiscal' | 'compras';
}

/** Limites alinhados ao AppDbContext (PRODUTO_CADASTRO) — evita 500 por truncamento no SQL Server. */
function buildComprasPayload(form: Record<string, string>): ProdutoAnaliseComprasPayload {
  const t = (s: string, max: number) => {
    const x = s.trim();
    if (!x) return null;
    return x.length <= max ? x : x.slice(0, max);
  };
  return {
    grupoProduto: t(form.grupoProduto, 50),
    subgrupoProduto: t(form.subgrupoProduto, 50),
    codCategoria: t(form.codCategoria, 50),
    codSubcategoria: t(form.codSubcategoria, 50),
    tipoProduto: t(form.tipoProduto, 50),
    grade: t(form.grade, 50),
    linha: t(form.linha, 50),
    griffe: t(form.griffe, 50),
    colecao: t(form.colecao, 50),
    unidade: t(form.unidade, 20),
    tipoStatusProduto: t(form.tipoStatusProduto, 50),
    sexoTipo: t(form.sexoTipo, 20),
    tipoItemSped: t(form.tipoItemSped, 20),
    indicadorCfop: t(normalizeIndicadorCfopForPersist(form.indicadorCfop) ?? form.indicadorCfop, 20),
    periodoPcp: t(form.periodoPcp, 20),
    redeLojas: t(form.redeLojas, 20),
    codProdutoSolucao: t(form.codProdutoSolucao, 50),
    codProdutoSegmento: t(form.codProdutoSegmento, 50),
    obsCompras: t(form.obsCompras, 1000),
    contaContabil:
      t(form.contaContabil, 50) ?? DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabil,
    contaContabilCompra:
      t(form.contaContabilCompra, 50) ?? DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilCompra,
    contaContabilVenda:
      t(form.contaContabilVenda, 50) ?? DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilVenda,
    contaContabilDevCompra:
      t(form.contaContabilDevCompra, 50) ?? DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilDevCompra,
    contaContabilDevVenda:
      t(form.contaContabilDevVenda, 50) ?? DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilDevVenda,
  };
}

/** Mesma regra de `ProdutosController.AprovarCompras` (sem alterar a API). */
function mensagemCamposComprasObrigatorios(form: Record<string, string>): string | null {
  const r = (s: string) => s.trim();
  const faltando: string[] = [];
  if (!r(form.grupoProduto)) faltando.push('Grupo');
  if (!r(form.subgrupoProduto)) faltando.push('Subgrupo');
  if (!r(form.codCategoria)) faltando.push('Categoria');
  if (!r(form.codSubcategoria)) faltando.push('Subcategoria');
  if (!r(form.unidade)) faltando.push('Unidade');
  if (!r(form.tipoProduto)) faltando.push('Tipo de produto');
  if (!r(form.grade)) faltando.push('Grade');
  if (!r(form.linha)) faltando.push('Linha');
  if (!r(form.griffe)) faltando.push('Griffe');
  if (!r(form.colecao)) faltando.push('Coleção');
  if (!r(form.tipoItemSped)) faltando.push('Tipo item SPED');
  if (faltando.length === 0) return null;
  return `Preencha antes de aprovar: ${faltando.join(', ')}.`;
}

type ComprasFormStateShape = {
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
  indicadorCfop: string;
  periodoPcp: string;
  redeLojas: string;
  codProdutoSolucao: string;
  codProdutoSegmento: string;
  obsCompras: string;
  contaContabil: string;
  contaContabilCompra: string;
  contaContabilVenda: string;
  contaContabilDevCompra: string;
  contaContabilDevVenda: string;
};

const COMPRAS_FORM_KEYS: (keyof ComprasFormStateShape)[] = [
  'grupoProduto',
  'subgrupoProduto',
  'codCategoria',
  'codSubcategoria',
  'tipoProduto',
  'grade',
  'linha',
  'griffe',
  'colecao',
  'unidade',
  'tipoStatusProduto',
  'sexoTipo',
  'tipoItemSped',
  'indicadorCfop',
  'periodoPcp',
  'redeLojas',
  'codProdutoSolucao',
  'codProdutoSegmento',
  'obsCompras',
  'contaContabil',
  'contaContabilCompra',
  'contaContabilVenda',
  'contaContabilDevCompra',
  'contaContabilDevVenda',
];

function readComprasDraftFromStorage(productId: number): Partial<ComprasFormStateShape> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(comprasAnaliseDraftStorageKey(productId));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<ComprasFormStateShape> = {};
    for (const k of COMPRAS_FORM_KEYS) {
      const v = o[k];
      if (typeof v === 'string') out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

function mergeComprasFormWithDraft(
  base: ComprasFormStateShape,
  draft: Partial<ComprasFormStateShape> | null,
): ComprasFormStateShape {
  if (!draft) return base;
  return { ...base, ...draft };
}

function buildFiscalPayload(form: FiscalFormStateShape): ProdutoAnaliseFiscalPayload {
  const t = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    tributIcms: t(form.tributIcms),
    idExcecaoGrupo: t(form.idExcecaoGrupo),
    caracteristicaContabil: t(form.caracteristicaContabil),
    enviaLojaVarejo: form.enviaLojaVarejo,
    enviaVarejoInternet: form.enviaVarejoInternet,
    variaPrecoPorCor: form.variaPrecoPorCor,
    obsFiscal: t(form.obsFiscal),
  };
}

type FiscalFormStateShape = {
  ncm: string;
  tributIcms: string;
  idExcecaoGrupo: string;
  caracteristicaContabil: string;
  enviaLojaVarejo: boolean;
  enviaVarejoInternet: boolean;
  variaPrecoPorCor: boolean;
  obsFiscal: string;
};

const FISCAL_DRAFT_VERSION = 1 as const;

type FiscalAnaliseDraftStored = {
  v: typeof FISCAL_DRAFT_VERSION;
  statusFluxo: number;
  form: FiscalFormStateShape;
};

function fiscalFormSeedFromProduct(product: Product): FiscalFormStateShape {
  return {
    ncm: ncmPrincipalDoProduto(product.ncm, product.cores) ?? '',
    tributIcms: (product.tributIcms ?? '').trim(),
    idExcecaoGrupo: (product.idExcecaoGrupo ?? '').trim(),
    caracteristicaContabil: (product.caracteristicaContabil ?? '').trim(),
    enviaLojaVarejo: Boolean(product.enviaLojaVarejo),
    enviaVarejoInternet: Boolean(product.enviaVarejoInternet),
    variaPrecoPorCor: Boolean(product.variaPrecoPorCor),
    obsFiscal: (product.obsFiscal ?? '').trim(),
  };
}

function readFiscalAnaliseDraft(produtoId: number): FiscalAnaliseDraftStored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(fiscalAnaliseDraftStorageKey(produtoId));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (o.v !== FISCAL_DRAFT_VERSION || typeof o.statusFluxo !== 'number' || !o.form || typeof o.form !== 'object') return null;
    const f = o.form as Record<string, unknown>;
    const form: FiscalFormStateShape = {
      ncm: typeof f.ncm === 'string' ? f.ncm : '',
      tributIcms: typeof f.tributIcms === 'string' ? f.tributIcms : '',
      idExcecaoGrupo: typeof f.idExcecaoGrupo === 'string' ? f.idExcecaoGrupo : '',
      caracteristicaContabil: typeof f.caracteristicaContabil === 'string' ? f.caracteristicaContabil : '',
      enviaLojaVarejo: Boolean(f.enviaLojaVarejo),
      enviaVarejoInternet: Boolean(f.enviaVarejoInternet),
      variaPrecoPorCor: Boolean(f.variaPrecoPorCor),
      obsFiscal: typeof f.obsFiscal === 'string' ? f.obsFiscal : '',
    };
    return { v: FISCAL_DRAFT_VERSION, statusFluxo: o.statusFluxo, form };
  } catch {
    return null;
  }
}

function writeFiscalAnaliseDraft(produtoId: number, statusFluxo: number, form: FiscalFormStateShape): void {
  try {
    const payload: FiscalAnaliseDraftStored = { v: FISCAL_DRAFT_VERSION, statusFluxo, form: { ...form } };
    window.sessionStorage.setItem(fiscalAnaliseDraftStorageKey(produtoId), JSON.stringify(payload));
  } catch {
    /* quota / modo privado */
  }
}

export function ProdutoDetalhesModal({
  product,
  isOpen,
  onClose,
  onAprovar,
  onReprovar,
  onMutationSuccess,
  showActions = true,
  departamento,
}: ProdutoDetalhesModalProps) {
  const [salvandoCompras, setSalvandoCompras] = useState(false);
  const [salvandoFiscal, setSalvandoFiscal] = useState(false);

  const ncmInicialFiscal = ncmPrincipalDoProduto(product.ncm, product.cores) ?? '';

  const [formFiscal, setFormFiscal] = useState({
    ncm: ncmInicialFiscal,
    tributIcms: '',
    idExcecaoGrupo: '',
    caracteristicaContabil: '',
    enviaLojaVarejo: false,
    enviaVarejoInternet: false,
    variaPrecoPorCor: false,
    obsFiscal: '',
  });

  const [formCompras, setFormCompras] = useState({
    grupoProduto: '',
    subgrupoProduto: '',
    codCategoria: '',
    codSubcategoria: '',
    tipoProduto: '',
    grade: '',
    linha: '',
    griffe: '',
    colecao: '',
    unidade: '',
    tipoStatusProduto: '',
    sexoTipo: '',
    tipoItemSped: '',
    indicadorCfop: '',
    periodoPcp: '',
    redeLojas: '',
    codProdutoSolucao: '',
    codProdutoSegmento: '',
    obsCompras: '',
    contaContabil: DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabil ?? '',
    contaContabilCompra: DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilCompra ?? '',
    contaContabilVenda: DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilVenda ?? '',
    contaContabilDevCompra: DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilDevCompra ?? '',
    contaContabilDevVenda: DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS.contaContabilDevVenda ?? '',
  });

  // Só reinicia análise fiscal ao abrir / trocar produto, departamento ou status (ex.: 4→5 após salvar).
  // GET interno não devolve os campos fiscais no JSON; usamos rascunho em sessionStorage quando o status bate.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const seed = fiscalFormSeedFromProduct(product);
    if (departamento === 'fiscal') {
      if (product.statusFluxo === 7) {
        setFormFiscal(seed);
        return;
      }
      const draft = readFiscalAnaliseDraft(product.id);
      if (draft) {
        const draftCompativel =
          draft.statusFluxo === product.statusFluxo ||
          (draft.statusFluxo === 5 && product.statusFluxo === 4);
        if (draftCompativel) {
          setFormFiscal({
            ...seed,
            ...draft.form,
            ncm: draft.form.ncm.trim() ? draft.form.ncm : seed.ncm,
          });
          return;
        }
      }
    }
    setFormFiscal(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hidratação na abertura deste cadastro / mudança de status
  }, [isOpen, product.id, departamento, product.statusFluxo]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const baseCompras = comprasFormFromProdutoDetalhe(product);

    const contextoFiscalComHistorico =
      departamento === 'fiscal' && product.statusFluxo >= 4 && product.statusFluxo <= 7;
    if (contextoFiscalComHistorico) {
      setFormCompras(baseCompras);
    } else if (departamento === 'compras') {
      const draft = readComprasDraftFromStorage(product.id);
      setFormCompras(mergeComprasFormWithDraft(baseCompras, draft));
    } else {
      setFormCompras(baseCompras);
    }
    // Intencional: reset compras ao abrir ou trocar produto; compras mescla rascunho (GET interno não traz estes campos).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product.id, departamento, product.tipoProduto, product.grade, product.linha, product.griffe, product.colecao, product.ncm, product.cores]);

  useEffect(() => {
    if (!isOpen || departamento !== 'compras') return;
    const id = product.id;
    const handle = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(comprasAnaliseDraftStorageKey(id), JSON.stringify(formCompras));
      } catch {
        /* quota / modo privado */
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [formCompras, isOpen, departamento, product.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Compras: API ainda grava status 2 ao salvar análise; o dashboard pode exibir 3 (overlay) até aprovar.
  // Fiscal: salvar análise (PUT) leva 4→5; aprovar (POST) só no status 5, com integração ERP automática na API.
  const canAprovar =
    (departamento === 'fiscal' && product.statusFluxo === 5) ||
    (departamento === 'compras' && isFilaCompras(product.statusFluxo));
  const canIniciar =
    (departamento === 'fiscal' && (product.statusFluxo === 4 || product.statusFluxo === 5)) ||
    (departamento === 'compras' && isFilaCompras(product.statusFluxo));
  const visaoCompletaIntegrado = departamento === 'fiscal' && product.statusFluxo === 7;
  /** Fiscal: exibe pré-cadastro fornecedor e análise compras antes da análise fiscal (status 4–7). */
  const exibirContextoPreComprasFiscal =
    departamento === 'fiscal' && product.statusFluxo >= 4 && product.statusFluxo <= 7;

  const motivoFiscal = motivoDevolucaoFiscal(product.obsFiscal);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/30 shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-[slideUp_0.4s_ease-out]">
        <div className="sticky top-0 z-10 bg-white/15 backdrop-blur-xl border-b-2 border-white/20 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              {visaoCompletaIntegrado ? 'Cadastro completo do produto' : 'Detalhes do Produto'}
            </h2>
            <p className="text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
              ID #{product.id} • {product.fornecedor}
              {product.codigoProdutoErp ? ` • ERP ${product.codigoProdutoErp}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-8 py-6">
          <div className="space-y-6">
            {departamento === 'compras' && motivoFiscal && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-4">
                <p className="text-amber-100 font-semibold text-sm mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Devolvido pelo fiscal
                </p>
                <p className="text-white/90 text-sm whitespace-pre-wrap" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  {motivoFiscal}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span
                className={`inline-flex px-4 py-2 rounded-full text-sm font-medium border ${getStatusProdutoColor(product.statusFluxo)}`}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {labelStatusProduto(product.statusFluxo)}
              </span>
              <p className="text-white/60 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                Cadastrado em: {formatDate(product.dataCadastro)}
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Package className="w-6 h-6 text-white" />
                <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Informações Básicas
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    Descrição do Produto
                  </label>
                  <p className="text-white text-lg font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {product.descProduto}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    Descrição Nota Fiscal
                  </label>
                  <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {product.descProdutoNf || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    Referência Fabricante
                  </label>
                  <p className="text-white text-lg font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {product.referFabricante}
                  </p>
                </div>

                <div>
                  <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    NCM
                  </label>
                  <p className="text-white text-lg font-mono" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {ncmPrincipalDoProduto(product.ncm, product.cores) ?? '-'}
                  </p>
                </div>

                {product.tipoProduto && (
                  <div>
                    <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Tipo de Produto
                    </label>
                    <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {product.tipoProduto}
                    </p>
                  </div>
                )}

                {product.fabricante && (
                  <div>
                    <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Fabricante
                    </label>
                    <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      {product.fabricante}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {(product.composicao || product.grade || product.linha || product.griffe || product.colecao || product.obsFornecedor) && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-white" />
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Características
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {product.composicao && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                        Composição
                      </label>
                      <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.composicao}
                      </p>
                    </div>
                  )}

                  {product.grade && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                        Grade
                      </label>
                      <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.grade}
                      </p>
                    </div>
                  )}

                  {product.linha && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                        Linha
                      </label>
                      <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.linha}
                      </p>
                    </div>
                  )}

                  {product.griffe && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                        Griffe
                      </label>
                      <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.griffe}
                      </p>
                    </div>
                  )}

                  {product.colecao && (
                    <div>
                      <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                        Coleção
                      </label>
                      <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.colecao}
                      </p>
                    </div>
                  )}

                  {product.obsFornecedor && (
                    <div className="md:col-span-2">
                      <label className="block text-white/60 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                        Observações do Fornecedor
                      </label>
                      <p className="text-white text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.obsFornecedor}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {product.cores && product.cores.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Palette className="w-6 h-6 text-white" />
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Cores ({product.cores.length})
                  </h3>
                </div>
                <div className="space-y-4">
                  {product.cores.map((cor, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Código:{' '}
                          </span>
                          <span className="text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {cor.codCor}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Descrição:{' '}
                          </span>
                          <span className="text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {cor.descCor}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Origem:{' '}
                          </span>
                          <span className="text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {cor.origemCor}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Cor Fab.:{' '}
                          </span>
                          <span className="text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {cor.corFabricante}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            NCM:{' '}
                          </span>
                          <span className="text-white font-mono" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {cor.ncm}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.precos && product.precos.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <DollarSign className="w-6 h-6 text-white" />
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Tabela de Preços ({product.precos.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {product.precos.map((preco, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10 flex justify-between items-center">
                      <div>
                        <span className="text-white/60 text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Tabela:{' '}
                        </span>
                        <span className="text-white font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          {preco.codigoTabelaPreco}
                        </span>
                      </div>
                      <div className="text-white text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        R$ {preco.preco.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.fotos && product.fotos.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Camera className="w-6 h-6 text-white" />
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Fotos do Produto ({product.fotos.length})
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {product.fotos.map((foto, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      {foto.base64Foto && (
                        <img
                          src={`data:image/jpeg;base64,${foto.base64Foto}`}
                          alt={foto.nomeArquivo}
                          className="w-full h-48 object-cover rounded-lg mb-2"
                        />
                      )}
                      <p className="text-white/80 text-xs truncate" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {foto.nomeArquivo}
                      </p>
                      {foto.corLinx && (
                        <p className="text-white/60 text-xs" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Cor: {foto.corLinx}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.barras && product.barras.length > 0 && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Barcode className="w-6 h-6 text-white" />
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Códigos de Barras ({product.barras.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {product.barras.map((barra, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Código:{' '}
                          </span>
                          <span className="text-white font-mono" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {barra.codigoBarra}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Cor:{' '}
                          </span>
                          <span className="text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {barra.corProduto}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Tamanho:{' '}
                          </span>
                          <span className="text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {barra.tamanho}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Grade:{' '}
                          </span>
                          <span className="text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {barra.grade}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {exibirContextoPreComprasFiscal && (
              <>
                <PreCadastroFornecedorExtrasReadonly product={product} />
                <AnaliseComprasReadonly product={product} />
              </>
            )}

            {visaoCompletaIntegrado && <AnaliseFiscalReadonly product={product} />}

            {departamento === 'fiscal' && canIniciar && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <ClipboardList className="w-6 h-6 text-white" />
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Análise Fiscal
                  </h3>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-5">
                  <p className="text-white/60 text-xs mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    Preenchido pelo fornecedor no pré-cadastro
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="block text-white/50 text-xs mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        CEST
                      </span>
                      <p className="text-white text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.cest?.trim() || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="block text-white/50 text-xs mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Tribut. Origem
                      </span>
                      <p className="text-white text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.tributOrigem?.trim() || '—'}
                      </p>
                    </div>
                    <div>
                      <span className="block text-white/50 text-xs mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Classificação Fiscal Final
                      </span>
                      <p className="text-white text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        {product.classificacaoFiscalFinal?.trim() || '—'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                      NCM
                    </label>
                    <input
                      type="text"
                      value={formFiscal.ncm}
                      onChange={(e) => setFormFiscal({ ...formFiscal, ncm: e.target.value })}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                      Tribut. ICMS
                    </label>
                    <input
                      type="text"
                      value={formFiscal.tributIcms}
                      onChange={(e) => setFormFiscal({ ...formFiscal, tributIcms: e.target.value })}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                      ID Exceção Grupo
                    </label>
                    <input
                      type="text"
                      value={formFiscal.idExcecaoGrupo}
                      onChange={(e) => setFormFiscal({ ...formFiscal, idExcecaoGrupo: e.target.value })}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>

                  <div>
                    <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                      Característica Contábil
                    </label>
                    <input
                      type="text"
                      value={formFiscal.caracteristicaContabil}
                      onChange={(e) => setFormFiscal({ ...formFiscal, caracteristicaContabil: e.target.value })}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                      Flags
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { key: 'enviaLojaVarejo', label: 'Envia loja varejo' },
                        { key: 'enviaVarejoInternet', label: 'Envia varejo internet' },
                        { key: 'variaPrecoPorCor', label: 'Varia preço por cor' },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={Boolean((formFiscal as any)[item.key])}
                            onChange={(e) => setFormFiscal({ ...formFiscal, [item.key]: e.target.checked } as any)}
                            className="w-5 h-5 rounded border-2 border-white/30 bg-white/20 checked:bg-white checked:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all duration-300 cursor-pointer"
                          />
                          <span className="text-white/90 group-hover:text-white transition-colors" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                      Observações Fiscal
                    </label>
                    <textarea
                      value={formFiscal.obsFiscal}
                      onChange={(e) => setFormFiscal({ ...formFiscal, obsFiscal: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300 resize-none"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {departamento === 'compras' && canIniciar && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <ClipboardList className="w-6 h-6 text-white" />
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Análise Compras
                  </h3>
                </div>
                <AnaliseComprasFields formCompras={formCompras} setFormCompras={setFormCompras} disabled={salvandoCompras} />
              </div>
            )}
          </div>
        </div>

        {showActions && (
          <div className="sticky bottom-0 bg-white/15 backdrop-blur-xl border-t-2 border-white/20 px-8 py-6">
            <div className="flex items-center justify-end gap-4">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/30 transition-all duration-300"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Fechar
              </button>

              {canIniciar && (departamento === 'compras' || departamento === 'fiscal') && (
                <button
                  type="button"
                  disabled={departamento === 'compras' ? salvandoCompras : salvandoFiscal}
                  onClick={async () => {
                    if (departamento === 'compras') {
                      setSalvandoCompras(true);
                      try {
                        const pend = mensagemCamposComprasObrigatorios(formCompras);
                        if (pend) {
                          toast.error(pend);
                          return;
                        }
                        await iniciarAnaliseCompras(product.id, buildComprasPayload({ ...formCompras }));
                        toast.success('Análise de compras salva.', {
                          description:
                            'Status exibido como “Em análise compras” na fila. Quando estiver pronto, clique em Aprovar para enviar ao fiscal (status 4 no sistema).',
                        });
                        onMutationSuccess?.();
                      } catch (error) {
                        toast.error('Não foi possível salvar a análise de compras.', {
                          description: error instanceof ApiError || error instanceof Error ? error.message : undefined,
                        });
                      } finally {
                        setSalvandoCompras(false);
                      }
                      return;
                    }
                    if (departamento === 'fiscal') {
                      setSalvandoFiscal(true);
                      try {
                        const res = await iniciarAnaliseFiscal(product.id, buildFiscalPayload(formFiscal));
                        writeFiscalAnaliseDraft(product.id, res.statusFluxo, formFiscal);
                        toast.success('Análise fiscal salva.', {
                          description:
                            'Produto passa a status 5 (em análise fiscal) na API. Revise os obrigatórios e use Aprovar: o sistema integra automaticamente ao ERP (status 7) quando a integração for bem-sucedida.',
                        });
                        onMutationSuccess?.();
                      } catch (error) {
                        toast.error('Não foi possível salvar a análise fiscal.', {
                          description: error instanceof ApiError || error instanceof Error ? error.message : undefined,
                        });
                      } finally {
                        setSalvandoFiscal(false);
                      }
                    }
                  }}
                  className="px-6 py-3 bg-blue-500/30 hover:bg-blue-500/50 text-white rounded-xl border border-blue-400/30 transition-all duration-300 font-medium disabled:opacity-50"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {departamento === 'compras'
                    ? salvandoCompras
                      ? 'Salvando...'
                      : 'Salvar análise de compras'
                    : salvandoFiscal
                      ? 'Salvando...'
                      : 'Salvar análise fiscal'}
                </button>
              )}

              {canAprovar && (
                <>
                  {onReprovar && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await onReprovar();
                        onClose();
                        } catch {
                          /* erro já exibido pelo handler */
                        }
                      }}
                      className="px-6 py-3 bg-red-500/30 hover:bg-red-500/50 text-white rounded-xl border border-red-400/30 transition-all duration-300 font-medium flex items-center gap-2"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <XCircle className="w-4 h-4" />
                      Reprovar
                    </button>
                  )}
                  {onAprovar && (
                    <button
                      type="button"
                      disabled={salvandoCompras || salvandoFiscal}
                      onClick={async () => {
                        try {
                          if (departamento === 'compras') {
                            const pend = mensagemCamposComprasObrigatorios(formCompras);
                            if (pend) {
                              toast.error(pend);
                              return;
                            }
                            setSalvandoCompras(true);
                            try {
                              try {
                                await iniciarAnaliseCompras(product.id, buildComprasPayload({ ...formCompras }));
                              } catch (error) {
                                toast.error('Não foi possível salvar a análise de compras antes de aprovar.', {
                                  description:
                                    error instanceof ApiError || error instanceof Error ? error.message : undefined,
                                });
                                return;
                              }
                              await onAprovar();
                        onClose();
                            } catch {
                              /* falha no POST aprovar: toast em ColaboradorDashboardCompras.handleAprovar */
                            } finally {
                              setSalvandoCompras(false);
                            }
                            return;
                          }
                          await onAprovar();
                          onClose();
                        } catch {
                          /* erro já exibido pelo handler */
                        }
                      }}
                      className="px-6 py-3 bg-green-500/30 hover:bg-green-500/50 text-white rounded-xl border border-green-400/30 transition-all duration-300 font-medium flex items-center gap-2 disabled:opacity-50"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {departamento === 'compras' && salvandoCompras ? 'Salvando e aprovando…' : 'Aprovar'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

