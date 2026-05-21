// Importante:
// - Em DEV, o proxy do Vite não consegue "repassar" Windows Auth (Negotiate).
// - Para endpoints internos (ErpConsultas/UsuarioInterno/etc.), precisamos chamar a API
//   diretamente do browser para o handshake Negotiate acontecer.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV && typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'https://localhost:7298/api'
    : '/api');

/** Rascunho no browser: `GET interno/{id}` não devolve campos da análise de compras; sem isto o modal zera tudo ao reabrir. */
export function comprasAnaliseDraftStorageKey(produtoId: number) {
  return `supplierproduct:compras-analise-draft:v1:${produtoId}`;
}

/** Rascunho da análise fiscal: o `GET interno/{id}` hoje não projeta CEST/tributação/etc. no retorno; sem isto «Revisar análise» volta vazio após salvar. */
export function fiscalAnaliseDraftStorageKey(produtoId: number) {
  return `supplierproduct:fiscal-analise-draft:v1:${produtoId}`;
}

export function clearFiscalAnaliseDraft(produtoId: number) {
  try {
    window.sessionStorage.removeItem(fiscalAnaliseDraftStorageKey(produtoId));
  } catch {
    /* ignore */
  }
}

export interface FornecedorData {
  nomeFornecedor: string;
  centroCusto: string | null;
  tipo: string | null;
  codigoFornecedor: string;
  cliFor: string;
  condicaoPgto: string;
  cgcCpf: string;
  inativo: boolean;
  moeda: string | null;
}

export interface LoginResponse {
  token: string;
  login: string;
  nomeFornecedor: string;
  cgcCpf: string;
  expiracao: string;
}

export interface UsuarioAutenticado {
  login: string;
  nomeFornecedor: string;
  cgcCpf: string;
  id: string;
}

export interface ColaboradorLoginResponse {
  token: string;
  login: string;
  nome?: string | null;
  expiracao?: string | null;
}

/** Resposta de `POST /listar-todos-cadastros` (listagem interna). */
export interface ProdutoCadastroListagem {
  id: number;
  codigoProdutoErp: string | null;
  nomeFornecedor: string;
  cgcCpfFornecedor: string;
  descProduto: string;
  descProdutoNf: string | null;
  referFabricante: string | null;
  ncm: string | null;
  cest: string | null;
  tipoProduto: string | null;
  grupoProduto: string | null;
  fabricante: string | null;
  statusFluxo: number;
  dataCadastro: string;
  dataAtualizacao: string | null;
}

/** @deprecated Preferir `ProdutoCadastroListagem`. Mantido para chamadas legadas. */
export type ProdutoPendenteCompras = ProdutoCadastroListagem;

export type ProdutoPendenteFiscal = ProdutoCadastroListagem;

export interface FornecedorPendenteFiscal {
  id: number;
  nomeCliFor: string;
  razaoSocial: string;
  cgcCpf: string;
  pjPf: number;
  cidade: string | null;
  uf: string | null;
  email: string | null;
  statusFluxo: number;
  dataCadastro: string;
}

export interface FornecedorPreCadastroDetalhe {
  id: number;
  nomeCliFor: string;
  razaoSocial: string;
  cgcCpf: string;
  pjPf: number;
  rgIe: string | null;
  cep: string | null;
  endereco: string | null;
  cidade: string | null;
  bairro: string | null;
  uf: string | null;
  pais: string | null;
  ddi: string | null;
  ddd1: string | null;
  ddd2: string | null;
  email: string | null;
  numero: string | null;
  complemento: string | null;
  obsFornecedor: string | null;

  // Campos a serem preenchidos pelo fiscal
  tipo: string | null;
  centroCusto: string | null;
  condicaoPgto: string | null;
  moeda: string | null;
  ctbContaContabil: string | null;
  lxMetodoPagamento: number | null;

  forneceMatConsumo: boolean;
  forneceMateriais: boolean;
  forneceProdAcab: boolean;
  beneficiador: boolean;
  forneceOutros: boolean;

  prop00014: string | null;
  prop00035: string | null;
  prop00123: string | null;

  obsFiscal: string | null;
  usuarioFiscalLogin: string | null;
  statusFluxo: number;
  dataCadastro: string;
  dataAtualizacao: string | null;
}

export interface FornecedorAnaliseFiscalPayload {
  tipo: string;
  centroCusto: string;
  condicaoPgto: string;
  moeda: string;
  ctbContaContabil: string;
  lxMetodoPagamento: number | null;

  forneceMatConsumo: boolean;
  forneceMateriais: boolean;
  forneceProdAcab: boolean;
  beneficiador: boolean;
  forneceOutros: boolean;

  prop00014: string;
  prop00035: string;
  prop00123: string;

  obsFiscal?: string | null;
}

export interface ProdutoAnaliseComprasPayload {
  grupoProduto?: string | null;
  subgrupoProduto?: string | null;
  codCategoria?: string | null;
  codSubcategoria?: string | null;
  tipoProduto?: string | null;
  grade?: string | null;
  linha?: string | null;
  griffe?: string | null;
  colecao?: string | null;
  unidade?: string | null;
  tipoStatusProduto?: string | null;
  sexoTipo?: string | null;
  tipoItemSped?: string | null;
  contaContabil?: string | null;
  contaContabilCompra?: string | null;
  contaContabilVenda?: string | null;
  contaContabilDevCompra?: string | null;
  contaContabilDevVenda?: string | null;
  indicadorCfop?: string | null;
  periodoPcp?: string | null;
  redeLojas?: string | null;
  codProdutoSolucao?: string | null;
  codProdutoSegmento?: string | null;
  obsCompras?: string | null;
}

/** Contas padrão enviadas no PUT de análise de compras (alinhado ao cadastro contábil de referência). */
export const DEFAULT_PRODUTO_CONTAS_CONTABEIS_ANALISE_COMPRAS: Pick<
  ProdutoAnaliseComprasPayload,
  | 'contaContabil'
  | 'contaContabilCompra'
  | 'contaContabilVenda'
  | 'contaContabilDevCompra'
  | 'contaContabilDevVenda'
> = {
  contaContabil: '1.1.4.01.0001',
  contaContabilCompra: '1.1.4.01.0001',
  contaContabilVenda: '3.1.1.01.0001',
  contaContabilDevCompra: '1.1.4.01.0001',
  contaContabilDevVenda: '3.1.2.01.0002',
};

export interface ProdutoAnaliseFiscalPayload {
  tributIcms?: string | null;
  idExcecaoGrupo?: string | null;
  caracteristicaContabil?: string | null;
  enviaLojaVarejo?: boolean | null;
  enviaVarejoInternet?: boolean | null;
  variaPrecoPorCor?: boolean | null;
  obsFiscal?: string | null;
}

export interface ReprovarProdutoPayload {
  motivo: string;
}

export interface CadastroFornecedorPayload {
  nomeCliFor: string;
  razaoSocial: string;
  cgcCpf: string;
  pjPf: number;
  rgIe: string;
  cep: string;
  endereco: string;
  cidade: string;
  bairro: string;
  uf: string;
  pais: string;
  ddi: string;
  ddd1: string;
  ddd2: string;
  email: string;
  numero: string;
  complemento: string;
  tipo: string;
  centroCusto: string;
  condicaoPgto: string;
  moeda: string;
  ctbContaContabil: string;
  lxMetodoPagamento: number | null;
  forneceMatConsumo: boolean;
  forneceMateriais: boolean;
  forneceProdAcab: boolean;
  beneficiador: boolean;
  forneceOutros: boolean;
  prop00014: string;
  prop00035: string;
  prop00123: string;
}

export interface FornecedorPreCadastroPayload {
  nomeCliFor: string;
  razaoSocial: string;
  cgcCpf: string;
  pjPf: number;
  rgIe?: string | null;

  cep?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  uf?: string | null;
  pais?: string | null;
  ddi?: string | null;
  ddd1?: string | null;
  ddd2?: string | null;
  email?: string | null;
  numero?: string | null;
  complemento?: string | null;

  obsFornecedor?: string | null;
}

export interface ComboErp {
  codigo: string | number;
  descricao: string | number;
}

export interface FornecedorCadastroCompleto extends CadastroFornecedorPayload {
  id?: number | string | null;
  codigoFornecedor?: string | null;
  cliFor?: string | null;
  nomeFornecedor?: string | null;
  dataCadastro?: string | null;
  inativo?: boolean | null;
}

export interface ProdutoPreCadastroCorPayload {
  codCor: string;
  descCor: string;
  origemCor?: string | null;
  corFabricante?: string | null;
  ncm?: string | null;
}

export interface ProdutoPreCadastroPrecoPayload {
  codigoTabelaPreco: string;
  preco: number;
}

export interface ProdutoPreCadastroFotoPayload {
  corLinx?: string | null;
  nomeArquivo?: string | null;
  caminhoArquivo?: string | null;
  base64Foto?: string | null;
  ordemFoto?: number | null;
}

export interface ProdutoPreCadastroBarraPayload {
  codigoBarra: string;
  corProduto: string;
  tamanho: string;
  grade?: string | null;
}

export interface ProdutoPreCadastroPayload {
  descProduto: string;
  descProdutoNf?: string | null;
  referFabricante?: string | null;
  fabricante?: string | null;
  composicao?: string | null;
  cest?: string | null;
  tributOrigem?: string | null;
  classificacaoFiscalFinal?: string | null;
  obsFornecedor?: string | null;

  subColecao?: string | null;
  tamCentimetros?: string | null;
  tipoBico?: string | null;
  tipoSalto?: string | null;
  pisada?: string | null;
  alturaDrop?: string | null;
  alturaSalto?: string | null;
  classificacaoAltura?: string | null;
  material?: string | null;
  materialInterno?: string | null;
  ocasiaoUso?: string | null;
  tecnologia?: string | null;
  descricaoTecnica?: string | null;
  descricaoEmocional?: string | null;
  peso?: number | null;
  cores: ProdutoPreCadastroCorPayload[];
  precos: ProdutoPreCadastroPrecoPayload[];
  fotos: ProdutoPreCadastroFotoPayload[];
  barras: ProdutoPreCadastroBarraPayload[];
}

export interface ProdutoCadastroResumo {
  id: number;
  descProduto: string;
  descProdutoNf: string | null;
  referFabricante: string | null;
  ncm: string | null;
  statusFluxo: number;
  dataCadastro: string;
}

export interface ProdutoCadastroDetalhe {
  id: number;
  descProduto: string;
  descProdutoNf: string | null;
  referFabricante: string | null;
  ncm: string | null;
  tipoProduto: string | null;
  fabricante: string | null;
  composicao: string | null;
  grade: string | null;
  linha: string | null;
  griffe: string | null;
  colecao: string | null;
  obsFornecedor: string | null;
  statusFluxo: number;
  dataCadastro: string;

  /** Análise fiscal (quando a API incluir no JSON do interno). */
  cest?: string | null;
  tributOrigem?: string | null;
  tributIcms?: string | null;
  idExcecaoGrupo?: string | null;
  classificacaoFiscalFinal?: string | null;
  caracteristicaContabil?: string | null;
  enviaLojaVarejo?: boolean | null;
  enviaVarejoInternet?: boolean | null;
  variaPrecoPorCor?: boolean | null;
  obsFiscal?: string | null;
  obsCompras?: string | null;
  codigoProdutoErp?: string | null;
  grupoProduto?: string | null;
  subgrupoProduto?: string | null;
  codCategoria?: string | null;
  codSubcategoria?: string | null;
  unidade?: string | null;
  tipoStatusProduto?: string | null;
  sexoTipo?: string | null;
  tipoItemSped?: string | null;
  indicadorCfop?: string | null;
  periodoPcp?: string | null;
  redeLojas?: string | null;
  codProdutoSegmento?: string | null;
  codProdutoSolucao?: string | null;
  continuidade?: string | null;
  sujeitoSubstituicaoTributaria?: string | null;
  cartela?: string | null;
  consumo?: number | null;
  restricaoLavagem?: string | null;
  rotaOperacao?: string | null;
  tipoEncomenda?: string | null;
  empresa?: string | null;
  comissao?: number | null;
  produtoEmProcesso?: string | null;
  contaContabil?: string | null;
  contaContabilCompra?: string | null;
  contaContabilVenda?: string | null;
  contaContabilDevCompra?: string | null;
  contaContabilDevVenda?: string | null;
  usuarioComprasLogin?: string | null;
  usuarioFiscalLogin?: string | null;
  dataAtualizacao?: string | null;

  /** Campos opcionais do pré-cadastro fornecedor (slides). */
  subColecao?: string | null;
  tamCentimetros?: string | null;
  tipoBico?: string | null;
  tipoSalto?: string | null;
  pisada?: string | null;
  alturaDrop?: string | null;
  alturaSalto?: string | null;
  classificacaoAltura?: string | null;
  material?: string | null;
  materialInterno?: string | null;
  ocasiaoUso?: string | null;
  tecnologia?: string | null;
  descricaoTecnica?: string | null;
  descricaoEmocional?: string | null;
  peso?: number | null;

  cores: Array<{
    id: number;
    codCor: string | null;
    descCor: string | null;
    origemCor: string | null;
    corFabricante: string | null;
    ncm: string | null;
  }>;
  precos: Array<{
    id: number;
    codigoTabelaPreco: string | null;
    preco: number;
  }>;
  fotos: Array<{
    id: number;
    corLinx: string | null;
    nomeArquivo: string | null;
    caminhoArquivo: string | null;
    base64Foto: string | null;
    ordemFoto: number;
  }>;
  barras: Array<{
    id: number;
    codigoBarra: string | null;
    corProduto: string | null;
    tamanho: string | null;
    grade: string | null;
  }>;
}

interface ApiErrorPayload {
  // APIs podem devolver em camelCase ou PascalCase
  mensagem?: string;
  Mensagem?: string;
  detalhe?: string;
  Detalhe?: string;
  error?: string;
  title?: string;
}

interface CadastroFornecedorResponse {
  sucesso: boolean;
  mensagem: string;
  cliforGerado?: string | null;
  fornecedor?: string | null;
}

interface CriarAcessoResponse {
  sucesso: boolean;
  mensagem: string;
  login?: string | null;
  fornecedor?: string | null;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function normalizeText(value: string) {
  return value.trim();
}

function resolveApiUrl(path: string): string {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  if (path.startsWith('../')) {
    return new URL(path, base).href;
  }
  const relative = path.startsWith('/') ? path.slice(1) : path;
  return new URL(relative, base).href;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const hasBody = init?.body != null;
  const isFormData =
    typeof FormData !== 'undefined' && init?.body instanceof FormData;

  if (hasBody && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.';
    let detail: string | undefined;

    try {
      const payload = (await response.json()) as ApiErrorPayload | string;
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload?.mensagem || payload?.Mensagem) {
        message = payload.mensagem ?? payload.Mensagem ?? message;
        detail = payload.detalhe ?? payload.Detalhe ?? detail;
      } else if (payload?.title) {
        message = payload.title;
      } else if (payload?.error) {
        message = payload.error;
      }
    } catch {
      message = response.statusText || message;
    }

    const fullMessage = detail && detail.trim().length > 0 ? `${message} (${detail})` : message;
    throw new ApiError(fullMessage, response.status);
  }

  // Alguns endpoints podem retornar texto/objeto; priorizamos JSON quando houver conteúdo.
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0') {
    return undefined as T;
  }

  // Se a API retornar texto puro, esse parse pode falhar; nesse caso, devolvemos como string.
  try {
    return (await response.json()) as T;
  } catch {
    return (await response.text()) as unknown as T;
  }
}

function requestJwt<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function requestWindows<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    // Para Windows Authentication (Negotiate) funcionar via browser, precisamos mandar credenciais.
    credentials: 'include',
  });
}

export function sanitizeDocument(value: string) {
  return value.replace(/\D/g, '');
}

export async function getFornecedorByCgcCpf(cgcCpf: string) {
  const document = sanitizeDocument(cgcCpf);
  return request<FornecedorData>(`/fornecedores/por-cgc-cpf/${document}`);
}

export async function cadastrarFornecedor(payload: CadastroFornecedorPayload) {
  return request<CadastroFornecedorResponse>('/fornecedores/cadastro-completo', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      cgcCpf: sanitizeDocument(payload.cgcCpf),
      cep: payload.cep.replace(/\D/g, ''),
      nomeCliFor: normalizeText(payload.nomeCliFor),
      razaoSocial: normalizeText(payload.razaoSocial),
      rgIe: normalizeText(payload.rgIe),
      endereco: normalizeText(payload.endereco),
      cidade: normalizeText(payload.cidade),
      bairro: normalizeText(payload.bairro),
      uf: normalizeText(payload.uf).toUpperCase(),
      pais: normalizeText(payload.pais),
      email: normalizeText(payload.email),
      numero: normalizeText(payload.numero),
      complemento: normalizeText(payload.complemento),
      tipo: normalizeText(payload.tipo),
      centroCusto: normalizeText(payload.centroCusto),
      condicaoPgto: normalizeText(payload.condicaoPgto),
      moeda: normalizeText(payload.moeda),
      ctbContaContabil: normalizeText(payload.ctbContaContabil),
    }),
  });
}

export async function preCadastrarFornecedor(payload: FornecedorPreCadastroPayload) {
  return request<{ mensagem: string; id: number; statusFluxo: number }>('/fornecedores/pre-cadastro', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      cgcCpf: sanitizeDocument(payload.cgcCpf),
      cep: payload.cep ? payload.cep.replace(/\D/g, '') : payload.cep,
      nomeCliFor: normalizeText(payload.nomeCliFor),
      razaoSocial: normalizeText(payload.razaoSocial),
      rgIe: payload.rgIe ? normalizeText(payload.rgIe) : payload.rgIe,
      endereco: payload.endereco ? normalizeText(payload.endereco) : payload.endereco,
      cidade: payload.cidade ? normalizeText(payload.cidade) : payload.cidade,
      bairro: payload.bairro ? normalizeText(payload.bairro) : payload.bairro,
      uf: payload.uf ? normalizeText(payload.uf).toUpperCase() : payload.uf,
      pais: payload.pais ? normalizeText(payload.pais) : payload.pais,
      email: payload.email ? normalizeText(payload.email) : payload.email,
      numero: payload.numero ? normalizeText(payload.numero) : payload.numero,
      complemento: payload.complemento ? normalizeText(payload.complemento) : payload.complemento,
      obsFornecedor: payload.obsFornecedor ? normalizeText(payload.obsFornecedor) : payload.obsFornecedor,
    }),
  });
}

// Alias com nome usado no componente de pré-cadastro.
export async function criarPreCadastroFornecedor(payload: FornecedorPreCadastroPayload) {
  return preCadastrarFornecedor(payload);
}

export async function listarErpMunicipios(municipio: string | null) {
  const query = municipio ? `?municipio=${encodeURIComponent(municipio)}` : '';
  return requestWindows<ComboErp[]>(`/erpconsultas/municipios${query}`);
}

export async function listarErpPaises() {
  return requestWindows<ComboErp[]>('/erpconsultas/paises');
}

export async function listarErpTiposFornecedor() {
  return requestWindows<ComboErp[]>('/erpconsultas/tipos-fornecedor');
}

export async function listarErpCentrosCusto() {
  return requestWindows<ComboErp[]>('/erpconsultas/centros-custo');
}

export async function listarErpMoedas() {
  return requestWindows<ComboErp[]>('/erpconsultas/moedas');
}

export async function listarErpFabricantes() {
  return requestWindows<ComboErp[]>('/erpconsultas/fabricantes');
}

export async function listarErpIndicadoresCfop() {
  return requestWindows<ComboErp[]>('/erpconsultas/indicadores-cfop');
}

export async function listarErpSubgruposKalNosValidos(rede: string, linha: string, grupoProduto: string) {
  const q = new URLSearchParams({
    rede: rede.trim(),
    linha: linha.trim(),
    grupoProduto: grupoProduto.trim(),
  });
  return requestWindows<ComboErp[]>(`/erpconsultas/subgrupos-kal-nos-validos?${q.toString()}`);
}

export async function listarErpComposicoes(token?: string | null) {
  const bearer = token?.trim();
  if (bearer) {
    try {
      return await requestJwt<ComboErp[]>('/erpconsultas/composicoes', bearer);
    } catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 401 && e.status !== 403)) throw e;
    }
  }
  return requestWindows<ComboErp[]>('/erpconsultas/composicoes');
}

export async function listarErpTabPreco(token?: string | null) {
  const bearer = token?.trim();
  if (bearer) {
    try {
      return await requestJwt<ComboErp[]>('/erpconsultas/tab-preco', bearer);
    } catch (e) {
      if (!(e instanceof ApiError) || (e.status !== 401 && e.status !== 403)) throw e;
    }
  }
  return requestWindows<ComboErp[]>('/erpconsultas/tab-preco');
}

export async function listarErpGrades() {
  return requestWindows<ComboErp[]>('/erpconsultas/grades');
}

export async function listarErpColecoes() {
  return requestWindows<ComboErp[]>('/erpconsultas/colecoes');
}

export async function listarErpContasContabeis() {
  return requestWindows<ComboErp[]>('/erpconsultas/contas-contabeis');
}

export async function listarErpLinhas() {
  return requestWindows<ComboErp[]>('/erpconsultas/linhas');
}

export async function listarErpGriffes() {
  return requestWindows<ComboErp[]>('/erpconsultas/griffes');
}

export async function listarErpTiposProduto() {
  return requestWindows<ComboErp[]>('/erpconsultas/tipos-produto');
}

export async function listarErpGruposProduto() {
  return requestWindows<ComboErp[]>('/erpconsultas/grupos-produto');
}

export async function listarErpSubgruposProduto(grupoProduto: string | null) {
  const q = grupoProduto?.trim()
    ? `?grupoProduto=${encodeURIComponent(grupoProduto.trim())}`
    : '';
  return requestWindows<ComboErp[]>(`/erpconsultas/subgrupos-produto${q}`);
}

export async function listarErpCategorias() {
  return requestWindows<ComboErp[]>('/erpconsultas/categorias');
}

export async function listarErpSubcategorias(codCategoria: string | null) {
  const q = codCategoria?.trim()
    ? `?codCategoria=${encodeURIComponent(codCategoria.trim())}`
    : '';
  return requestWindows<ComboErp[]>(`/erpconsultas/subcategorias${q}`);
}

export async function listarErpPeriodosPcp() {
  return requestWindows<ComboErp[]>('/erpconsultas/periodos-pcp');
}

export async function listarErpRedesLojas() {
  return requestWindows<ComboErp[]>('/erpconsultas/redes-lojas');
}

export async function listarErpUnidades() {
  return requestWindows<ComboErp[]>('/erpconsultas/unidades');
}

export async function listarErpTipoItem() {
  return requestWindows<ComboErp[]>('/erpconsultas/tipo-item');
}

export async function criarAcessoFornecedor(payload: {
  cgcCpf: string;
  login: string;
  senha: string;
}) {
  return request<CriarAcessoResponse>('/fornecedores/acesso', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      cgcCpf: sanitizeDocument(payload.cgcCpf),
    }),
  });
}

export async function loginFornecedor(payload: { login: string; senha: string }) {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getUsuarioInternoMe() {
  return requestWindows<{ autenticado: boolean; nome: string | null; tipo: string | null }>('/usuariointerno/me');
}

export async function getUsuarioInternoPerfil() {
  return requestWindows<{ usuario: string; perfis: string[] }>('/usuariointerno/perfil');
}

export async function getUsuarioAutenticado(token: string) {
  return requestJwt<UsuarioAutenticado>('/usuario/me', token);
}

function statusFluxoFromCadastroListagem(p: ProdutoCadastroListagem): number {
  const r = p as unknown as Record<string, unknown>;
  const raw = r.statusFluxo ?? r.StatusFluxo;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** `POST /listar-todos-cadastros` — resposta bruta da API. */
async function fetchTodosCadastrosRaw(): Promise<ProdutoCadastroListagem[]> {
  return requestWindows<ProdutoCadastroListagem[]>('../listar-todos-cadastros', {
    method: 'POST',
  });
}

/** Apenas cadastros com status 6 (Aprovado para Integração). */
export async function listarTodosCadastros(): Promise<ProdutoCadastroListagem[]> {
  const rows = await fetchTodosCadastrosRaw();
  return (rows ?? []).filter((p) => statusFluxoFromCadastroListagem(p) === 6);
}

/** Lista completa retornada por `POST /listar-todos-cadastros` (todos os status). */
export async function listarTodosCadastrosCompletos(): Promise<ProdutoCadastroListagem[]> {
  return fetchTodosCadastrosRaw();
}

/** @deprecated Use `listarTodosCadastrosCompletos` ou `listarTodosCadastros`. */
export async function listarPendentesCompras() {
  return listarTodosCadastrosCompletos();
}

/** Detalhe completo para colaboradores (Windows Auth). */
export async function obterProdutoCadastroInterno(id: number) {
  return requestWindows<ProdutoCadastroDetalhe>(`/produtos/interno/${id}`);
}

export async function listarPendentesFiscal() {
  return requestWindows<ProdutoPendenteFiscal[]>('/produtos/pendentes-fiscal');
}

/** Produtos do dashboard fiscal: status 4, 5, 6 e 7 via `POST /listar-todos-cadastros`. */
export async function listarProdutosDashboardFiscal(): Promise<ProdutoCadastroListagem[]> {
  const rows = await fetchTodosCadastrosRaw();
  const allowed = new Set([4, 5, 6, 7]);
  return (rows ?? []).filter((p) => allowed.has(statusFluxoFromCadastroListagem(p)));
}

export async function listarFornecedoresPendentesFiscal() {
  return requestWindows<FornecedorPendenteFiscal[]>('/fornecedores/pendentes-fiscal');
}

export async function obterFornecedorPreCadastro(id: number) {
  return requestWindows<FornecedorPreCadastroDetalhe>(`/fornecedores/pre-cadastro/${id}`);
}

export async function analisarFiscalFornecedor(id: number, payload: FornecedorAnaliseFiscalPayload) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number }>(`/fornecedores/${id}/analise-fiscal`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function aprovarFiscalFornecedor(id: number) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number }>(`/fornecedores/${id}/aprovar-fiscal`, {
    method: 'POST',
  });
}

export async function integrarFornecedorErp(id: number) {
  return requestWindows<{ mensagem: string; id: number }>(`/fornecedores/${id}/integrar-erp`, {
    method: 'POST',
  });
}

export async function reabrirCadastroFornecedor(
  id: number,
  payload: {
    cep?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    bairro?: string | null;
    uf?: string | null;
    pais?: string | null;
    ddi?: string | null;
    ddd1?: string | null;
    ddd2?: string | null;
    email?: string | null;
    numero?: string | null;
    complemento?: string | null;
    obsFornecedor?: string | null;
  },
) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number }>(`/fornecedores/${id}/reabrir`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function corrigirEnderecoIbgeFornecedor(id: number, payload: { cidade: string; uf: string }) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number; cidade: string; uf: string }>(
    `/fornecedores/${id}/corrigir-endereco-ibge`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );
}

export async function reprovarFiscalFornecedor(id: number, motivo: string) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number }>(`/fornecedores/${id}/reprovar-fiscal`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

export async function iniciarAnaliseCompras(id: number, payload: ProdutoAnaliseComprasPayload) {
  // Na API o "iniciar análise" é o PUT de análise de compras.
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number }>(`/produtos/${id}/analise-compras`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function iniciarAnaliseFiscal(id: number, payload: ProdutoAnaliseFiscalPayload) {
  // Na API o "iniciar análise" é o PUT de análise fiscal.
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number }>(`/produtos/${id}/analise-fiscal`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function aprovarCompras(id: number) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number }>(`/produtos/${id}/aprovar-compras`, {
    method: 'POST',
  });
}

export async function reprovarCompras(id: number, payload: ReprovarProdutoPayload) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number; motivo?: string }>(`/produtos/${id}/reprovar-compras`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function aprovarFiscal(id: number) {
  return requestWindows<{
    mensagem: string;
    id: number;
    statusFluxo: number;
    integradoNoErp?: boolean;
    erroIntegracao?: string;
  }>(`/produtos/${id}/aprovar-fiscal`, {
    method: 'POST',
  });
}

export async function reprovarFiscal(id: number, payload: ReprovarProdutoPayload) {
  return requestWindows<{ mensagem: string; id: number; statusFluxo: number; motivo?: string }>(`/produtos/${id}/reprovar-fiscal`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function integrarProdutoErp(id: number) {
  return requestWindows<{ mensagem: string; id: number }>(`/produtos/${id}/integrar-erp`, {
    method: 'POST',
  });
}

export interface ValidacaoIntegracaoProduto {
  valido: boolean;
  erros: string[];
  avisos: string[];
}

export async function validarIntegracaoProdutoErp(id: number) {
  return requestWindows<ValidacaoIntegracaoProduto>(`/produtos/${id}/validar-integracao`);
}

export async function criarPreCadastroProduto(token: string, payload: ProdutoPreCadastroPayload) {
  return requestJwt<{ mensagem: string; id: number; statusFluxo: number }>('/produtos/pre-cadastro', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function atualizarPreCadastroProduto(token: string, id: number, payload: ProdutoPreCadastroPayload) {
  return requestJwt<{ mensagem: string; id: number; statusFluxo: number }>(`/produtos/pre-cadastro/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function listarMeusCadastrosProdutos(token: string) {
  return requestJwt<ProdutoCadastroResumo[]>('/produtos/meus-cadastros', token);
}

export async function obterDetalheProduto(token: string, id: number) {
  return requestJwt<ProdutoCadastroDetalhe>(`/produtos/${id}`, token);
}

/**
 * NCM principal do cadastro: usa o da raiz (pós-fiscal) se existir; senão o primeiro NCM informado por cor
 * (fluxo de pré-cadastro do fornecedor — a API grava NCM nas cores, não em `ProdutoCadastro.Ncm`).
 */
export function ncmPrincipalDoProduto(
  ncmRaiz: string | null | undefined,
  cores?: readonly { ncm?: string | null }[] | null,
): string | null {
  const root = (ncmRaiz ?? '').trim();
  if (root) return root;
  if (!cores?.length) return null;
  for (const c of cores) {
    const v = (c?.ncm ?? '').trim();
    if (v) return v;
  }
  return null;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

/** Preenche `ncm` nos resumos quando a API só devolve NCM por cor (detalhe fornecedor). */
export async function enriquecerNcmResumosFornecedor(
  token: string,
  produtos: ProdutoCadastroResumo[],
  concurrency = 6,
): Promise<ProdutoCadastroResumo[]> {
  const semNcm = produtos.filter((p) => !(p.ncm ?? '').trim());
  if (semNcm.length === 0) return produtos;

  const resolved = await mapWithConcurrency(semNcm, concurrency, async (p) => {
    try {
      const d = await obterDetalheProduto(token, p.id);
      return { id: p.id, ncm: ncmPrincipalDoProduto(d.ncm, d.cores) };
    } catch {
      return { id: p.id, ncm: null as string | null };
    }
  });

  const patch = new Map(resolved.map((r) => [r.id, r.ncm]));
  return produtos.map((p) => {
    if (!patch.has(p.id)) return p;
    const n = patch.get(p.id);
    return n && n.trim() ? { ...p, ncm: n } : p;
  });
}

/** Igual ao resumo fornecedor, para listagens internas que só trazem `Ncm` da raiz. */
export async function enriquecerNcmListaDetalheInterno<T extends { id: number; ncm: string }>(
  produtos: T[],
  concurrency = 6,
): Promise<T[]> {
  const semNcm = produtos.filter((p) => !p.ncm.trim());
  if (semNcm.length === 0) return produtos;

  const resolved = await mapWithConcurrency(semNcm, concurrency, async (p) => {
    try {
      const d = await obterProdutoCadastroInterno(p.id);
      return { id: p.id, ncm: ncmPrincipalDoProduto(d.ncm, d.cores) };
    } catch {
      return { id: p.id, ncm: null as string | null };
    }
  });

  const patch = new Map(resolved.map((r) => [r.id, r.ncm]));
  return produtos.map((p) => {
    if (!patch.has(p.id)) return p;
    const n = patch.get(p.id);
    return n && n.trim() ? { ...p, ncm: n } : p;
  });
}

export async function enviarProdutoParaCompras(token: string, id: number) {
  return requestJwt<{ mensagem: string; id: number; statusFluxo: number }>(`/produtos/${id}/enviar-para-compras`, token, {
    method: 'POST',
  });
}

export interface ProdutoImportacaoErro {
  linha: number;
  campo: string;
  mensagem: string;
}

export interface ProdutoImportacaoResultado {
  sucesso: boolean;
  mensagem: string;
  totalLinhas: number;
  totalProdutosValidos: number;
  totalProdutosComErro: number;
  produtosCriadosIds: number[];
  produtosAtualizadosIds: number[];
  erros: ProdutoImportacaoErro[];
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      return star[1];
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

async function parseApiErrorMessage(response: Response): Promise<string> {
  let message = response.statusText || 'Não foi possível concluir a operação.';
  try {
    const payload = (await response.json()) as ApiErrorPayload | { errors?: Record<string, string[]> };
    if (typeof payload === 'string') {
      message = payload;
    } else if (payload && typeof payload === 'object') {
      const p = payload as ApiErrorPayload & { errors?: Record<string, string[]> };
      if (p.mensagem || p.Mensagem) {
        message = p.mensagem ?? p.Mensagem ?? message;
      } else if (p.title) {
        message = p.title;
        if (p.errors) {
          const parts = Object.entries(p.errors).flatMap(([k, v]) => v.map((m) => `${k}: ${m}`));
          if (parts.length) message = `${message} — ${parts.join('; ')}`;
        }
      } else if (p.error) {
        message = p.error;
      }
    }
  } catch {
    /* ignore */
  }
  return message;
}

async function requestBlob(path: string, init?: RequestInit, fallbackFilename = 'modelo.xlsx'): Promise<{ blob: Blob; filename: string }> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  if (!response.ok) {
    const message = await parseApiErrorMessage(response);
    throw new ApiError(message, response.status);
  }
  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get('content-disposition')) ?? fallbackFilename;
  return { blob, filename };
}

export function baixarArquivoNoNavegador(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function normalizeImportacaoResultado(raw: unknown): ProdutoImportacaoResultado {
  const r = (raw ?? {}) as Record<string, unknown>;
  const errosRaw = (r.erros ?? r.Erros ?? []) as Array<Record<string, unknown>>;
  const ids = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => Number(x)).filter((n) => Number.isFinite(n)) : [];

  return {
    sucesso: Boolean(r.sucesso ?? r.Sucesso),
    mensagem: String(r.mensagem ?? r.Mensagem ?? ''),
    totalLinhas: Number(r.totalLinhas ?? r.TotalLinhas ?? 0),
    totalProdutosValidos: Number(r.totalProdutosValidos ?? r.TotalProdutosValidos ?? 0),
    totalProdutosComErro: Number(r.totalProdutosComErro ?? r.TotalProdutosComErro ?? 0),
    produtosCriadosIds: ids(r.produtosCriadosIds ?? r.ProdutosCriadosIds),
    produtosAtualizadosIds: ids(r.produtosAtualizadosIds ?? r.ProdutosAtualizadosIds),
    erros: errosRaw.map((e) => ({
      linha: Number(e.linha ?? e.Linha ?? 0),
      campo: String(e.campo ?? e.Campo ?? ''),
      mensagem: String(e.mensagem ?? e.Mensagem ?? ''),
    })),
  };
}

function formDataComArquivo(arquivo: File): FormData {
  const form = new FormData();
  form.append('Arquivo', arquivo);
  return form;
}

export async function baixarModeloImportacaoFornecedor(token: string) {
  return requestBlob('/produtos/importacao/modelo-fornecedor', {
    headers: { Authorization: `Bearer ${token}` },
  }, 'modelo-importacao-fornecedor.xlsx');
}

export async function baixarModeloImportacaoCompras() {
  return requestBlob(
    '/produtos/importacao/modelo-compras',
    { credentials: 'include' },
    'modelo-preenchimento-compras.xlsx',
  );
}

export async function baixarModeloImportacaoFiscal() {
  return requestBlob(
    '/produtos/importacao/modelo-fiscal',
    { credentials: 'include' },
    'modelo-preenchimento-fiscal.xlsx',
  );
}

export async function importarProdutosFornecedor(token: string, arquivo: File) {
  const raw = await requestJwt<unknown>('/produtos/importacao', token, {
    method: 'POST',
    body: formDataComArquivo(arquivo),
  });
  return normalizeImportacaoResultado(raw);
}

export async function importarProdutosCompras(arquivo: File) {
  const raw = await requestWindows<unknown>('/produtos/importacao/compras', {
    method: 'POST',
    body: formDataComArquivo(arquivo),
  });
  return normalizeImportacaoResultado(raw);
}

export async function importarProdutosFiscal(arquivo: File) {
  const raw = await requestWindows<unknown>('/produtos/importacao/fiscal', {
    method: 'POST',
    body: formDataComArquivo(arquivo),
  });
  return normalizeImportacaoResultado(raw);
}
