/** Alinhado ao enum `StatusProdutoCadastro` (backend). */
export const STATUS_PRODUTO_AGUARDANDO_FISCAL = 4;
export const STATUS_PRODUTO_EM_ANALISE_FISCAL = 5;
export const STATUS_PRODUTO_APROVADO_INTEGRACAO = 6;
export const STATUS_PRODUTO_INTEGRADO_ERP = 7;

/** Status exibidos no dashboard fiscal (produtos). */
export const STATUS_PRODUTO_FISCAL_DASHBOARD = [
  STATUS_PRODUTO_AGUARDANDO_FISCAL,
  STATUS_PRODUTO_EM_ANALISE_FISCAL,
  STATUS_PRODUTO_APROVADO_INTEGRACAO,
  STATUS_PRODUTO_INTEGRADO_ERP,
] as const;

/** Alinhado ao enum StatusProdutoCadastro (backend). */
export const STATUS_PRODUTO_FLUXO: Record<number, string> = {
  1: 'Pré-Cadastro Fornecedor',
  2: 'Aguardando Compras',
  3: 'Em Análise Compras',
  4: 'Aguardando Fiscal',
  5: 'Em Análise Fiscal',
  6: 'Aprovado para Integração',
  7: 'Integrado ERP',
  8: 'Devolvido por Compras',
  9: 'Devolvido pelo Fiscal',
};

export const PREFIXO_DEVOLUCAO_FISCAL = '[Devolvido pelo Fiscal';
export const PREFIXO_DEVOLUCAO_COMPRAS = '[Devolvido por Compras';

/** Status em que compras pode analisar/aprovar/reprovar. */
export function isFilaCompras(status: number): boolean {
  return status === 2 || status === 3 || status === 9;
}

/** Status em que o fornecedor pode editar e reenviar ao fluxo. */
export function isEditavelFornecedor(status: number): boolean {
  return status === 1 || status === 8;
}

export function labelStatusProduto(status: number): string {
  return STATUS_PRODUTO_FLUXO[status] ?? 'Desconhecido';
}

export function getStatusProdutoColor(status: number): string {
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
    case 9:
      return 'bg-amber-500/20 text-amber-100 border-amber-400/40';
    default:
      return 'bg-gray-500/20 text-gray-100 border-gray-400/30';
  }
}

export function motivoDevolucaoFiscal(obsFiscal?: string | null): string | null {
  const t = (obsFiscal ?? '').trim();
  if (!t) return null;
  if (t.startsWith(PREFIXO_DEVOLUCAO_FISCAL)) {
    const idx = t.indexOf(']');
    return idx >= 0 ? t.slice(idx + 1).trim() : t;
  }
  return null;
}

export function motivoDevolucaoCompras(obsFornecedor?: string | null, obsCompras?: string | null): string | null {
  const fromObs = (obsFornecedor ?? '').trim();
  if (fromObs.startsWith(PREFIXO_DEVOLUCAO_COMPRAS)) {
    const idx = fromObs.indexOf(']');
    return idx >= 0 ? fromObs.slice(idx + 1).trim() : fromObs;
  }
  const compras = (obsCompras ?? '').trim();
  return compras || null;
}
