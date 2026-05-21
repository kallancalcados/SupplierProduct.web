import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Layout } from './Layout';
import { LogOut, CheckCircle, XCircle, Filter, Eye, ShieldCheck, RefreshCw } from 'lucide-react';
import { ImageWithFallback } from './ui/image-with-fallback';
import { kallanMarkSrc } from './kallan-mark';
import { toast } from 'sonner';
import { ProdutoDetalhesModal } from './ProdutoDetalhesModal';
import { FornecedorDetalhesModal } from './FornecedorDetalhesModal';
import { LoadingBlock, LoadingOverlay } from './ui/loading-state';
import { ProdutoImportacaoPlanilhaActions, type ProdutoResumoPlanilha } from './ProdutoImportacaoPlanilhaActions';
import {
  ApiError,
  clearFiscalAnaliseDraft,
  aprovarFiscal,
  enriquecerNcmListaDetalheInterno,
  integrarProdutoErp,
  validarIntegracaoProdutoErp,
  listarFornecedoresPendentesFiscal,
  listarProdutosDashboardFiscal,
  ncmPrincipalDoProduto,
  obterFornecedorPreCadastro,
  obterProdutoCadastroInterno,
  reprovarFiscal,
  type FornecedorPendenteFiscal,
  type FornecedorPreCadastroDetalhe,
  type ProdutoCadastroDetalhe,
  type ProdutoCadastroListagem,
  type ValidacaoIntegracaoProduto,
} from '../lib/supplier-api';
import { mapProdutoCadastroDetalheCompleto, type ProdutoDetalheCompleto } from '../lib/map-produto-detalhe';

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

interface Product {
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
  cores?: Cor[];
  precos?: Preco[];
  fotos?: Foto[];
  barras?: Barra[];
  /** Análise fiscal (GET interno ou rascunho local). */
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
}

interface Fornecedor {
  id: number;
  nomeFornecedor: string;
  cgcCpf: string;
  statusFluxo: number;
  dataCadastro: string;
}

/** Alinhado ao enum StatusProdutoCadastro (backend). */
const STATUS_FLUXO: { [key: number]: string } = {
  1: 'Pré-Cadastro Fornecedor',
  2: 'Aguardando Compras',
  3: 'Em Análise Compras',
  4: 'Aguardando Fiscal',
  5: 'Em Análise Fiscal',
  6: 'Aprovado para Integração',
  7: 'Integrado ERP',
  8: 'Reprovado Compras',
  9: 'Reprovado Fiscal',
};

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return 'bg-blue-500/20 text-blue-100 border-blue-400/30';
    case 2:
      return 'bg-yellow-500/20 text-yellow-100 border-yellow-400/30';
    case 3:
      return 'bg-orange-500/20 text-orange-100 border-orange-400/30';
    case 4:
      return 'bg-purple-500/20 text-purple-100 border-purple-400/30';
    case 5:
      return 'bg-indigo-500/20 text-indigo-100 border-indigo-400/30';
    case 6:
      return 'bg-green-500/20 text-green-100 border-green-400/30';
    case 7:
      return 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30';
    case 8:
      return 'bg-red-500/20 text-red-100 border-red-400/30';
    case 9:
      return 'bg-red-500/20 text-red-100 border-red-400/30';
    default:
      return 'bg-gray-500/20 text-gray-100 border-gray-400/30';
  }
};

function mapInternoToProduct(d: ProdutoCadastroDetalhe, nomeFornecedor: string): ProdutoDetalheCompleto {
  return mapProdutoCadastroDetalheCompleto(d, nomeFornecedor);
}

type FilterType = 'all' | 'aguardando' | 'analise' | 'aprovado' | 'integrado';
type ViewType = 'produtos' | 'fornecedores';

const FORNECEDOR_STATUS: Record<number, string> = {
  1: 'Pré-cadastro',
  2: 'Aguardando Fiscal',
  3: 'Reprovado Fiscal',
  4: 'Aprovado p/ Integração',
  5: 'Integrado ERP',
};

const getFornecedorStatusColor = (status: number) => {
  switch (status) {
    case 2:
      return 'bg-purple-500/20 text-purple-100 border-purple-400/30';
    case 4:
      return 'bg-green-500/20 text-green-100 border-green-400/30';
    case 5:
      return 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30';
    case 3:
      return 'bg-red-500/20 text-red-100 border-red-400/30';
    default:
      return 'bg-gray-500/20 text-gray-100 border-gray-400/30';
  }
};

const FORNECEDORES_FISCAL_CACHE_KEY = 'supplierproduct:fiscal:fornecedores-cache:v1';

export function ColaboradorDashboardFiscal() {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = location.state?.userName || 'Usuário';

  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>('produtos');
  const [activeFilter, setActiveFilter] = useState<FilterType>('aguardando');
  const [selectedProduct, setSelectedProduct] = useState<ProdutoDetalheCompleto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [fornecedorDetalhe, setFornecedorDetalhe] = useState<FornecedorPreCadastroDetalhe | null>(null);
  const [isFornecedorModalOpen, setIsFornecedorModalOpen] = useState(false);
  const [isLoadingFornecedorDetalhe, setIsLoadingFornecedorDetalhe] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorLookupId, setFornecedorLookupId] = useState<string>('');
  const [isLookingUpFornecedor, setIsLookingUpFornecedor] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [integrandoErpId, setIntegrandoErpId] = useState<number | null>(null);
  const [produtoValidacaoId, setProdutoValidacaoId] = useState('');
  const [validandoIntegracaoId, setValidandoIntegracaoId] = useState<number | null>(null);
  const [validacaoIntegracao, setValidacaoIntegracao] = useState<{
    produtoId: number;
    resultado: ValidacaoIntegracaoProduto;
  } | null>(null);
  const [isLoadingPendencias, setIsLoadingPendencias] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFiscalPendencias = useCallback(async (options?: { showOverlay?: boolean }) => {
    const showOverlay = options?.showOverlay === true;
    if (showOverlay) {
      setIsLoadingPendencias(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      setLoadError(null);
      const [produtosApi, fornecedoresApi] = await Promise.all([
        listarProdutosDashboardFiscal(),
        listarFornecedoresPendentesFiscal(),
      ]);

      const mapped = (produtosApi ?? []).map((p: ProdutoCadastroListagem) => {
        const r = p as unknown as Record<string, unknown>;
        const statusRaw = r.statusFluxo ?? r.StatusFluxo;
        const statusFluxo =
          typeof statusRaw === 'number' && Number.isFinite(statusRaw)
            ? statusRaw
            : Number.isFinite(Number(statusRaw))
              ? Number(statusRaw)
              : 0;
        const nomeFornecedor =
          typeof r.nomeFornecedor === 'string'
            ? r.nomeFornecedor
            : typeof r.NomeFornecedor === 'string'
              ? r.NomeFornecedor
              : p.nomeFornecedor;
        return {
          id: p.id,
          descProduto: p.descProduto,
          descProdutoNf: p.descProdutoNf ?? '',
          referFabricante: p.referFabricante ?? '',
          ncm: p.ncm ?? '',
          statusFluxo,
          dataCadastro: p.dataCadastro,
          fornecedor: nomeFornecedor,
        };
      });
      const enriched = await enriquecerNcmListaDetalheInterno(mapped);
      setProducts(enriched);

        const fromApi: Fornecedor[] = (fornecedoresApi ?? []).map((f: FornecedorPendenteFiscal) => ({
          id: f.id,
          nomeFornecedor: f.nomeCliFor,
          cgcCpf: f.cgcCpf,
          statusFluxo: f.statusFluxo,
          dataCadastro: f.dataCadastro,
        }));

        const cachedRaw = typeof window !== 'undefined' ? window.localStorage.getItem(FORNECEDORES_FISCAL_CACHE_KEY) : null;
        const cached: Fornecedor[] = cachedRaw ? (JSON.parse(cachedRaw) as Fornecedor[]) : [];

        // Mantém no dashboard também itens carregados por ID, além dos pendentes do fiscal.
        // (2=AguardandoFiscal, 4=AprovadoParaIntegracao, 5=IntegradoErp)
        const cachedKeep = (cached ?? []).filter((x) => x && [2, 4, 5].includes(x.statusFluxo));
        const merged = [...cachedKeep, ...fromApi].reduce<Fornecedor[]>((acc, item) => {
          const idx = acc.findIndex((x) => x.id === item.id);
          if (idx >= 0) acc[idx] = { ...acc[idx], ...item };
          else acc.push(item);
          return acc;
        }, []);

      setFornecedores(merged);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Tente novamente em instantes.';

      // Quando a API devolve 500 nos endpoints internos, o dashboard não consegue listar
      // fornecedores/produtos pendentes. Mostramos um aviso explícito para não parecer que
      // os cadastros "sumiram".
      if (error instanceof ApiError && error.status === 500) {
        setLoadError(
          'A API retornou erro interno ao listar pendências do fiscal (500). ' +
            'Sem corrigir a API, não é possível carregar a lista de pendências — por isso os últimos cadastros não aparecem aqui.',
        );
      } else if (error instanceof ApiError && error.status === 401) {
        setLoadError(
          'Não autorizado (401) ao listar pendências. Verifique se você está autenticado e se o backend aceita Windows Auth para esses endpoints.',
        );
      } else {
        setLoadError(`Não foi possível carregar pendências: ${message}`);
      }

      toast.error('Não foi possível carregar pendências do fiscal.', {
        description: message,
      });
    } finally {
      if (showOverlay) {
        setIsLoadingPendencias(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadFiscalPendencias({ showOverlay: true });
  }, [loadFiscalPendencias]);

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

  const handleAprovar = async (productId?: number) => {
    const id = productId || selectedProduct?.id;
    if (!id) return;

    try {
      const res = await aprovarFiscal(id);
      if (res.integradoNoErp === false) {
        toast.warning('Aprovado para integração (status 6)', {
          description:
            res.erroIntegracao != null && res.erroIntegracao !== ''
              ? `A integração automática ao ERP falhou: ${res.erroIntegracao}. Use «Integrar ERP» na lista.`
              : 'A integração automática ao ERP falhou. Use «Integrar ERP» na lista.',
        });
      } else {
        toast.success(res.mensagem ?? 'Produto aprovado pelo fiscal!', {
          description:
            res.statusFluxo === 7
              ? 'Status 7 — produto integrado ao ERP.'
              : `Status atual: ${res.statusFluxo}.`,
        });
      }
      setIsModalOpen(false);
      setSelectedProduct(null);
      clearFiscalAnaliseDraft(id);
      await loadFiscalPendencias();
    } catch (error) {
      toast.error('Não foi possível aprovar o produto.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const handleReprovar = async (productId?: number) => {
    const id = productId || selectedProduct?.id;
    if (!id) return;

    const motivo = window.prompt('Informe o motivo da reprovação fiscal:');
    if (motivo === null) {
      throw new Error('cancelado');
    }
    if (!motivo.trim()) {
      toast.error('Motivo obrigatório para reprovar.');
      throw new Error('validação');
    }

    try {
      const res = await reprovarFiscal(id, { motivo: motivo.trim() });
      toast.warning('Produto devolvido para compras.', {
        description:
          res.statusFluxo === 2
            ? 'O motivo foi registrado em OBS_FISCAL. A equipe de compras pode revisar o cadastro.'
            : `Status atual: ${res.statusFluxo}.`,
      });
      setIsModalOpen(false);
      setSelectedProduct(null);
      clearFiscalAnaliseDraft(id);
      await loadFiscalPendencias();
    } catch (error) {
      if (error instanceof Error && error.message === 'cancelado') return;
      if (error instanceof Error && error.message === 'validação') throw error;
      toast.error('Não foi possível reprovar o produto.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  };

  const handleValidarIntegracaoProduto = async (productId: number) => {
    setValidandoIntegracaoId(productId);
    setValidacaoIntegracao(null);
    try {
      const resultado = await validarIntegracaoProdutoErp(productId);
      setValidacaoIntegracao({ produtoId: productId, resultado });
      setProdutoValidacaoId(String(productId));

      if (resultado.valido) {
        toast.success(`Produto #${productId}: pronto para integração no ERP.`, {
          description:
            resultado.avisos.length > 0 ? resultado.avisos.join(' · ') : 'Nenhum aviso retornado pela validação.',
        });
      } else {
        toast.error(`Produto #${productId}: validação reprovada.`, {
          description: resultado.erros[0] ?? 'Verifique os erros no card de validação.',
        });
      }
    } catch (error) {
      toast.error('Não foi possível validar a integração com o ERP.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : undefined,
      });
    } finally {
      setValidandoIntegracaoId(null);
    }
  };

  const handleIntegrarErpProduto = async (productId: number) => {
    setIntegrandoErpId(productId);
    try {
      await integrarProdutoErp(productId);
      clearFiscalAnaliseDraft(productId);
      toast.success('Produto integrado ao ERP.');
      await loadFiscalPendencias();
    } catch (error) {
      toast.error('Não foi possível integrar o produto ao ERP.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIntegrandoErpId(null);
    }
  };

  const handleIniciarAnalise = async (productId: number) => {
    const row = products.find((p) => p.id === productId);
    if (!row) return;

    setDetailLoadingId(productId);
    try {
      const detalhe = await obterProdutoCadastroInterno(productId);
      const mapped = mapInternoToProduct(detalhe, row.fornecedor);
      setSelectedProduct(mapped);
      setIsModalOpen(true);
    } catch (error) {
      toast.error('Não foi possível carregar o cadastro completo do produto.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDetailLoadingId(null);
    }
  };

  const persistFornecedoresCache = (items: Fornecedor[]) => {
    try {
      window.localStorage.setItem(FORNECEDORES_FISCAL_CACHE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const upsertFornecedor = (item: Fornecedor) => {
    setFornecedores((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x) => x.id === item.id);
      if (idx >= 0) next[idx] = { ...next[idx], ...item };
      else next.unshift(item);
      persistFornecedoresCache(next);
      return next;
    });
  };

  const updateFornecedorStatus = (id: number, statusFluxo: number) => {
    setFornecedores((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, statusFluxo } : f));
      persistFornecedoresCache(next);
      return next;
    });
  };

  const handleVerDetalhesFornecedor = async (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setIsFornecedorModalOpen(true);
    setIsLoadingFornecedorDetalhe(true);
    setFornecedorDetalhe(null);

    try {
      const detalhe = await obterFornecedorPreCadastro(fornecedor.id);
      setFornecedorDetalhe(detalhe);
    } catch (error) {
      toast.error('Não foi possível carregar o cadastro completo do fornecedor.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    } finally {
      setIsLoadingFornecedorDetalhe(false);
    }
  };

  const produtosParaModeloFiscal = useMemo((): ProdutoResumoPlanilha[] => {
    return products
      .filter((p) => p.statusFluxo === 4 || p.statusFluxo === 5)
      .map((p) => ({
        id: p.id,
        referFabricante: p.referFabricante,
        descProduto: p.descProduto,
        fornecedor: p.fornecedor,
      }));
  }, [products]);

  const filteredProducts = products.filter((product) => {
    switch (activeFilter) {
      case 'aguardando':
        return product.statusFluxo === 4;
      case 'analise':
        return product.statusFluxo === 5;
      case 'aprovado':
        return product.statusFluxo === 6;
      case 'integrado':
        return product.statusFluxo === 7;
      case 'all':
      default:
        return [4, 5, 6, 7].includes(product.statusFluxo);
    }
  });

  const counts = {
    aguardando: products.filter((p) => p.statusFluxo === 4).length,
    analise: products.filter((p) => p.statusFluxo === 5).length,
    aprovado: products.filter((p) => p.statusFluxo === 6).length,
    integrado: products.filter((p) => p.statusFluxo === 7).length,
  };

  return (
    <Layout showLogo={false}>
      <div className="w-full max-w-7xl">
        <div className="animate-[fadeIn_0.6s_ease-out]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <ImageWithFallback src={kallanMarkSrc} alt="Kallan" className="w-20 h-20 drop-shadow-2xl" />
              <div>
                <h1 className="text-5xl font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Dashboard Fiscal
                </h1>
                <p className="text-2xl text-white/80" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  Bem-vindo, <span className="font-medium">{userName}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <ProdutoImportacaoPlanilhaActions
                area="fiscal"
                disabled={isLoadingPendencias || isRefreshing}
                produtosParaModelo={produtosParaModeloFiscal}
                onImportComplete={() => void loadFiscalPendencias({ showOverlay: true })}
              />
              <button
                type="button"
                onClick={() => void loadFiscalPendencias({ showOverlay: true })}
                disabled={isLoadingPendencias || isRefreshing}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 py-3 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-6 py-3 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all duration-300"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setViewType('produtos')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                viewType === 'produtos' ? 'bg-white text-[#ca0404] shadow-lg' : 'bg-white/10 text-white hover:bg-white/20 border-2 border-white/20'
              }`}
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Produtos
            </button>
            <button
              onClick={() => setViewType('fornecedores')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 ${
                viewType === 'fornecedores' ? 'bg-white text-[#ca0404] shadow-lg' : 'bg-white/10 text-white hover:bg-white/20 border-2 border-white/20'
              }`}
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Fornecedores
            </button>
          </div>

          {loadError && (
            <div className="mb-8 bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 border-amber-300/30 shadow-xl">
              <p className="text-amber-100 text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Não foi possível carregar as pendências do fiscal
              </p>
              <p className="text-amber-100/80 text-sm mt-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                {loadError}
              </p>
            </div>
          )}

          {viewType === 'produtos' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-10">
                <button
                  onClick={() => setActiveFilter('aguardando')}
                  className={`bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                    activeFilter === 'aguardando' ? 'border-purple-400/60 bg-white/20' : 'border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Aguardando Fiscal
                    </p>
                    <div className="bg-purple-500/30 rounded-full p-2">
                      <Filter className="w-5 h-5 text-purple-200" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {counts.aguardando}
                  </p>
                </button>

                <button
                  onClick={() => setActiveFilter('analise')}
                  className={`bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                    activeFilter === 'analise' ? 'border-indigo-400/60 bg-white/20' : 'border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Em Análise Fiscal
                    </p>
                    <div className="bg-indigo-500/30 rounded-full p-2">
                      <Filter className="w-5 h-5 text-indigo-200" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {counts.analise}
                  </p>
                </button>

                <button
                  onClick={() => setActiveFilter('aprovado')}
                  className={`bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                    activeFilter === 'aprovado' ? 'border-green-400/60 bg-white/20' : 'border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Aprovado Integração
                    </p>
                    <div className="bg-green-500/30 rounded-full p-2">
                      <CheckCircle className="w-5 h-5 text-green-200" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {counts.aprovado}
                  </p>
                </button>

                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 border-teal-400/30">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Validar integração ERP
                    </p>
                    <div className="bg-teal-500/30 rounded-full p-2">
                      <ShieldCheck className="w-5 h-5 text-teal-200" />
                    </div>
                  </div>
                  <label className="sr-only" htmlFor="produto-validacao-id">
                    ID do produto
                  </label>
                  <input
                    id="produto-validacao-id"
                    value={produtoValidacaoId}
                    onChange={(e) => setProdutoValidacaoId(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="ID do produto"
                    className="w-full mb-3 px-3 py-2 bg-white/15 border border-white/25 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-teal-300/60"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                  <button
                    type="button"
                    disabled={validandoIntegracaoId !== null || produtoValidacaoId.trim().length === 0}
                    onClick={() => {
                      const id = Number(produtoValidacaoId);
                      if (id) void handleValidarIntegracaoProduto(id);
                    }}
                    className="w-full text-white bg-teal-500/35 hover:bg-teal-500/55 disabled:opacity-50 transition-all duration-200 px-3 py-2 rounded-lg border border-teal-400/35 text-sm font-medium"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    {validandoIntegracaoId !== null ? 'Validando…' : 'Validar integração'}
                  </button>
                  {validacaoIntegracao && (
                    <div
                      className={`mt-4 rounded-xl border p-3 text-xs space-y-2 ${
                        validacaoIntegracao.resultado.valido
                          ? 'border-green-400/40 bg-green-500/10 text-green-100'
                          : 'border-red-400/40 bg-red-500/10 text-red-100'
                      }`}
                      style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
                    >
                      <p className="font-semibold">
                        Produto #{validacaoIntegracao.produtoId}:{' '}
                        {validacaoIntegracao.resultado.valido ? 'Válido para integração' : 'Inválido para integração'}
                      </p>
                      {validacaoIntegracao.resultado.erros.length > 0 && (
                        <ul className="list-disc list-inside space-y-1">
                          {validacaoIntegracao.resultado.erros.map((erro) => (
                            <li key={erro}>{erro}</li>
                          ))}
                        </ul>
                      )}
                      {validacaoIntegracao.resultado.avisos.length > 0 && (
                        <ul className="list-disc list-inside space-y-1 text-amber-100/90">
                          {validacaoIntegracao.resultado.avisos.map((aviso) => (
                            <li key={aviso}>{aviso}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveFilter('integrado')}
                  className={`bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                    activeFilter === 'integrado' ? 'border-emerald-400/60 bg-white/20' : 'border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Integrado ERP
                    </p>
                    <div className="bg-emerald-500/30 rounded-full p-2">
                      <CheckCircle className="w-5 h-5 text-emerald-200" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {counts.integrado}
                  </p>
                </button>
              </div>

              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-10 border-2 border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {activeFilter === 'aguardando' && 'Produtos Aguardando Fiscal'}
                      {activeFilter === 'analise' && 'Produtos Em Análise Fiscal'}
                      {activeFilter === 'aprovado' && 'Produtos Aprovados para Integração'}
                      {activeFilter === 'integrado' && 'Produtos Integrados no ERP'}
                      {activeFilter === 'all' && 'Todos os Produtos'}
                    </h2>
                    <p className="text-white/60 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      {isLoadingPendencias ? 'Carregando…' : `${filteredProducts.length} produto(s) encontrado(s)`}
                    </p>
                    <p className="text-white/50 text-xs mt-2 max-w-3xl" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                      Fluxo obrigatório na API: 4 (aguardando) → salvar análise → 5 (em análise) → aprovar → 6 e integração automática ao ERP → 7. A lista inclui até 500 itens nos status 4 a 7 (ordenados pela última atualização). Se a integração automática falhar, use «Integrar ERP» na linha em status 6.
                    </p>
                  </div>
                </div>

                <LoadingOverlay loading={isLoadingPendencias} message="Carregando pendências...">
                <div className="overflow-x-auto rounded-xl border-2 border-white/20">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/20 backdrop-blur-sm">
                        <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          ID
                        </th>
                        <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Produto
                        </th>
                        <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Fornecedor
                        </th>
                        <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Ref. Fabricante
                        </th>
                        <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          NCM
                        </th>
                        <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Status
                        </th>
                        <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Data Cadastro
                        </th>
                        <th className="text-center px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingPendencias ? (
                        <tr aria-hidden>
                          <td colSpan={8} className="h-40" />
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center">
                            <p className="text-white/60 text-lg" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                              Nenhum produto encontrado nesta categoria.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((product, index) => (
                          <tr
                            key={product.id}
                            className="border-t-2 border-white/10 hover:bg-white/10 transition-colors duration-200"
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            <td className="px-4 py-5 text-white/80 text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              #{product.id}
                            </td>
                            <td className="px-4 py-5 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              {product.descProduto}
                            </td>
                            <td className="px-4 py-5 text-white/80 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                              {product.fornecedor}
                            </td>
                            <td className="px-4 py-5 text-white/80" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              {product.referFabricante}
                            </td>
                            <td className="px-4 py-5 text-white/80 text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              {product.ncm}
                            </td>
                            <td className="px-4 py-5">
                              <span
                                className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(product.statusFluxo)}`}
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              >
                                {STATUS_FLUXO[product.statusFluxo] || 'Desconhecido'}
                              </span>
                            </td>
                            <td className="px-4 py-5 text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                              {formatDate(product.dataCadastro)}
                            </td>
                            <td className="px-4 py-5">
                              <div className="flex items-center justify-center gap-2">
                                {product.statusFluxo === 4 && (
                                  <button
                                    type="button"
                                    disabled={detailLoadingId === product.id}
                                    onClick={() => void handleIniciarAnalise(product.id)}
                                    className="text-white bg-indigo-500/30 hover:bg-indigo-500/50 disabled:opacity-50 transition-all duration-200 px-3 py-2 rounded-lg border border-indigo-400/30 text-xs"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    {detailLoadingId === product.id ? 'Carregando…' : 'Analisar fiscal'}
                                  </button>
                                )}
                                {product.statusFluxo === 5 && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={detailLoadingId === product.id}
                                      onClick={() => void handleIniciarAnalise(product.id)}
                                      className="text-white bg-indigo-500/20 hover:bg-indigo-500/40 disabled:opacity-50 transition-all duration-200 px-3 py-2 rounded-lg border border-indigo-400/25 text-xs"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      {detailLoadingId === product.id ? 'Carregando…' : 'Revisar análise'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleAprovar(product.id)}
                                      className="text-white bg-green-500/30 hover:bg-green-500/50 transition-all duration-200 px-3 py-2 rounded-lg border border-green-400/30 text-xs flex items-center gap-1"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      Aprovar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleReprovar(product.id)}
                                      className="text-white bg-red-500/30 hover:bg-red-500/50 transition-all duration-200 px-3 py-2 rounded-lg border border-red-400/30 text-xs flex items-center gap-1"
                                      style={{ fontFamily: 'Outfit, sans-serif' }}
                                    >
                                      <XCircle className="w-3 h-3" />
                                      Reprovar
                                    </button>
                                  </>
                                )}
                                {(product.statusFluxo === 6 || product.statusFluxo === 7) && (
                                  <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                                    {product.statusFluxo === 6 && (
                                      <button
                                        type="button"
                                        disabled={validandoIntegracaoId === product.id}
                                        onClick={() => void handleValidarIntegracaoProduto(product.id)}
                                        className="text-white bg-teal-500/30 hover:bg-teal-500/50 disabled:opacity-50 transition-all duration-200 px-3 py-2 rounded-lg border border-teal-400/30 text-xs flex items-center gap-1"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        <ShieldCheck className="w-3 h-3" />
                                        {validandoIntegracaoId === product.id ? 'Validando…' : 'Validar integração'}
                                      </button>
                                    )}
                                    {product.statusFluxo === 6 && (
                                      <button
                                        type="button"
                                        disabled={integrandoErpId === product.id}
                                        onClick={() => void handleIntegrarErpProduto(product.id)}
                                        className="text-white bg-emerald-500/35 hover:bg-emerald-500/55 disabled:opacity-50 transition-all duration-200 px-3 py-2 rounded-lg border border-emerald-400/35 text-xs"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        {integrandoErpId === product.id ? 'Integrando…' : 'Integrar ERP'}
                                      </button>
                                    )}
                                    {product.statusFluxo === 7 && (
                                      <button
                                        type="button"
                                        disabled={detailLoadingId === product.id}
                                        onClick={() => void handleIniciarAnalise(product.id)}
                                        className="text-white bg-white/15 hover:bg-white/25 disabled:opacity-50 transition-all duration-200 px-3 py-2 rounded-lg border border-white/30 text-xs flex items-center gap-1"
                                        style={{ fontFamily: 'Outfit, sans-serif' }}
                                      >
                                        <Eye className="w-3 h-3" />
                                        {detailLoadingId === product.id ? 'Carregando…' : 'Ver detalhe completo'}
                                      </button>
                                    )}
                                    <span className="text-white/40 text-xs text-center" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                                      {product.statusFluxo === 6 ? 'Aguardando integração ou reprocessamento' : 'Integrado ao ERP'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                </LoadingOverlay>
              </div>
            </>
          )}

          {viewType === 'fornecedores' && (
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-10 border-2 border-white/20 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Fornecedores Cadastrados
                  </h2>
                  <p className="text-white/60 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    {fornecedores.filter((f) => f.statusFluxo === 2).length} fornecedor(es) aguardando fiscal
                  </p>
                </div>
              </div>

              <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-end">
                <div className="flex-1">
                  <label className="block text-white/70 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    Buscar por ID do pré-cadastro (para visualizar aprovados/integração)
                  </label>
                  <input
                    value={fornecedorLookupId}
                    onChange={(e) => setFornecedorLookupId(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Ex.: 19"
                    className="w-full px-4 py-3 bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/60 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
                <button
                  disabled={isLookingUpFornecedor || fornecedorLookupId.trim().length === 0}
                  onClick={async () => {
                    const id = Number(fornecedorLookupId);
                    if (!id) return;
                    setIsLookingUpFornecedor(true);
                    try {
                      const detalhe = await obterFornecedorPreCadastro(id);
                      upsertFornecedor({
                        id: detalhe.id,
                        nomeFornecedor: detalhe.nomeCliFor || detalhe.razaoSocial || `Fornecedor #${detalhe.id}`,
                        cgcCpf: detalhe.cgcCpf,
                        statusFluxo: detalhe.statusFluxo,
                        dataCadastro: detalhe.dataCadastro,
                      });
                      toast.success('Fornecedor carregado no dashboard.');
                      setFornecedorLookupId('');
                    } catch (e) {
                      toast.error('Não foi possível carregar o fornecedor.', {
                        description: e instanceof Error ? e.message : 'Tente novamente.',
                      });
                    } finally {
                      setIsLookingUpFornecedor(false);
                    }
                  }}
                  className="px-6 py-3 bg-white text-[#ca0404] rounded-xl font-semibold hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {isLookingUpFornecedor ? 'Buscando...' : 'Carregar'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border-2 border-white/20">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/20 backdrop-blur-sm">
                      <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        ID
                      </th>
                      <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Nome Fornecedor
                      </th>
                      <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        CNPJ/CPF
                      </th>
                      <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Status
                      </th>
                      <th className="text-left px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Data Cadastro
                      </th>
                      <th className="text-center px-4 py-4 text-white font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fornecedores.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <p className="text-white/60 text-lg" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                            Nenhum fornecedor cadastrado.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      fornecedores.map((fornecedor, index) => (
                        <tr
                          key={fornecedor.id}
                          className="border-t-2 border-white/10 hover:bg-white/10 transition-colors duration-200"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <td className="px-4 py-5 text-white/80 text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            #{fornecedor.id}
                          </td>
                          <td className="px-4 py-5 text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {fornecedor.nomeFornecedor}
                          </td>
                          <td className="px-4 py-5 text-white/80 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                            {fornecedor.cgcCpf}
                          </td>
                          <td className="px-4 py-5">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getFornecedorStatusColor(
                                fornecedor.statusFluxo,
                              )}`}
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                              {FORNECEDOR_STATUS[fornecedor.statusFluxo] ?? 'Desconhecido'}
                            </span>
                          </td>
                          <td className="px-4 py-5 text-white/70 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                            {formatDate(fornecedor.dataCadastro)}
                          </td>
                          <td className="px-4 py-5">
                            <div className="flex items-center justify-center gap-2">
                              {(fornecedor.statusFluxo === 2 || fornecedor.statusFluxo === 4) && (
                                <>
                                  <button
                                    onClick={() => handleVerDetalhesFornecedor(fornecedor)}
                                    className="text-white bg-white/15 hover:bg-white/25 transition-all duration-200 px-3 py-2 rounded-lg border border-white/30 text-xs flex items-center gap-1"
                                    style={{ fontFamily: 'Outfit, sans-serif' }}
                                  >
                                    <Eye className="w-3 h-3" />
                                    {fornecedor.statusFluxo === 4 ? 'Editar' : 'Ver detalhes'}
                                  </button>
                                </>
                              )}
                              {fornecedor.statusFluxo !== 2 && fornecedor.statusFluxo !== 4 && (
                                <span className="text-white/40 text-xs" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                                  {FORNECEDOR_STATUS[fornecedor.statusFluxo] ?? 'Finalizado'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <ProdutoDetalhesModal
          key={selectedProduct.id}
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProduct(null);
          }}
          onAprovar={() => handleAprovar()}
          onReprovar={() => handleReprovar()}
          onMutationSuccess={() => {
            const id = selectedProduct?.id;
            void (async () => {
              await loadFiscalPendencias();
              if (id) {
                try {
                  const d = await obterProdutoCadastroInterno(id);
                  setSelectedProduct((prev) =>
                    prev && prev.id === id ? mapInternoToProduct(d, prev.fornecedor) : prev,
                  );
                } catch {
                  /* ignore */
                }
              }
            })();
          }}
          showActions
          departamento="fiscal"
        />
      )}

      {isFornecedorModalOpen && selectedFornecedor && (
        <>
          {isLoadingFornecedorDetalhe || !fornecedorDetalhe ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.3s_ease-out]">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFornecedorModalOpen(false)}></div>
              <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/30 shadow-2xl max-w-xl w-full p-10">
                <LoadingBlock message={`Carregando cadastro de ${selectedFornecedor.nomeFornecedor}...`} />
                <button
                  onClick={() => setIsFornecedorModalOpen(false)}
                  className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/30 transition-all duration-300"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : (
            <FornecedorDetalhesModal
              fornecedor={fornecedorDetalhe}
              isOpen={isFornecedorModalOpen}
              onClose={() => {
                setIsFornecedorModalOpen(false);
                setSelectedFornecedor(null);
                setFornecedorDetalhe(null);
              }}
              onStatusChange={updateFornecedorStatus}
            />
          )}
        </>
      )}
    </Layout>
  );
}

