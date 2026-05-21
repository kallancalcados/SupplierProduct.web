import { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ApiError,
  baixarArquivoNoNavegador,
  baixarModeloImportacaoCompras,
  baixarModeloImportacaoFiscal,
  baixarModeloImportacaoFornecedor,
  importarProdutosCompras,
  importarProdutosFiscal,
  importarProdutosFornecedor,
  obterProdutoCadastroInterno,
  type ProdutoImportacaoResultado,
} from '../lib/supplier-api';
import {
  COMPRAS_MODELO_HEADERS,
  FISCAL_MODELO_HEADERS,
  comprasRowFromDetalhe,
  comprasRowToArray,
  fiscalRowFromDetalhe,
  fiscalRowToArray,
  injectRowsIntoModeloXlsx,
  syncCadastroCompletoAposImportacao,
  type ComprasPlanilhaExportRow,
  type FiscalPlanilhaExportRow,
} from '../lib/produto-importacao-sync';
import { mapProdutoCadastroDetalheCompleto } from '../lib/map-produto-detalhe';

export type ProdutoImportacaoArea = 'fornecedor' | 'compras' | 'fiscal';

const MODELO_FALLBACK: Record<ProdutoImportacaoArea, string> = {
  fornecedor: 'modelo-importacao-fornecedor.xlsx',
  compras: 'modelo-preenchimento-compras.xlsx',
  fiscal: 'modelo-preenchimento-fiscal.xlsx',
};

function resumoErrosImportacao(resultado: ProdutoImportacaoResultado): string {
  const linhas = resultado.erros.slice(0, 8).map((e) => {
    const campo = e.campo ? `${e.campo}: ` : '';
    return `Linha ${e.linha} — ${campo}${e.mensagem}`;
  });
  const extra = resultado.erros.length > 8 ? `\n… e mais ${resultado.erros.length - 8} erro(s).` : '';
  return linhas.join('\n') + extra;
}

function toastResultadoImportacao(resultado: ProdutoImportacaoResultado) {
  if (resultado.sucesso) {
    const criados = resultado.produtosCriadosIds.length;
    const atualizados = resultado.produtosAtualizadosIds.length;
    toast.success(resultado.mensagem || 'Importação concluída.', {
      description:
        criados + atualizados > 0
          ? `${criados} criado(s), ${atualizados} atualizado(s) de ${resultado.totalLinhas} linha(s). Cadastro sincronizado na tela.`
          : `${resultado.totalLinhas} linha(s) processada(s).`,
    });
    return;
  }

  toast.error(resultado.mensagem || 'A planilha possui erros.', {
    description: resultado.erros.length > 0 ? resumoErrosImportacao(resultado) : undefined,
    duration: 12000,
  });
}

const btnClass =
  'flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-5 py-3 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';

export type ProdutoResumoPlanilha = {
  id: number;
  referFabricante: string;
  descProduto: string;
  fornecedor: string;
};

interface Props {
  area: ProdutoImportacaoArea;
  /** Obrigatório para área fornecedor (JWT). */
  token?: string | null;
  onImportComplete?: () => void;
  disabled?: boolean;
  /** Produtos da lista atual — usado para pré-preencher modelo compras/fiscal com cadastro completo. */
  produtosParaModelo?: ProdutoResumoPlanilha[];
}

async function buildComprasExportRows(produtos: ProdutoResumoPlanilha[]): Promise<ComprasPlanilhaExportRow[]> {
  const rows: ComprasPlanilhaExportRow[] = [];
  for (const p of produtos) {
    try {
      const detalhe = await obterProdutoCadastroInterno(p.id);
      const completo = mapProdutoCadastroDetalheCompleto(detalhe, p.fornecedor);
      rows.push(
        comprasRowFromDetalhe(p.id, p.referFabricante, p.descProduto, completo),
      );
    } catch {
      rows.push({
        produtoId: p.id,
        referFabricante: p.referFabricante,
        descProduto: p.descProduto,
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
        contaContabil: '',
        contaContabilCompra: '',
        contaContabilVenda: '',
        contaContabilDevCompra: '',
        contaContabilDevVenda: '',
        indicadorCfop: '',
        periodoPcp: '',
        redeLojas: '',
        codProdutoSolucao: '',
        codProdutoSegmento: '',
        obsCompras: '',
      });
    }
  }
  return rows;
}

async function buildFiscalExportRows(produtos: ProdutoResumoPlanilha[]): Promise<FiscalPlanilhaExportRow[]> {
  const rows: FiscalPlanilhaExportRow[] = [];
  for (const p of produtos) {
    try {
      const detalhe = await obterProdutoCadastroInterno(p.id);
      rows.push(fiscalRowFromDetalhe(p.id, p.referFabricante, p.descProduto, detalhe));
    } catch {
      rows.push({
        produtoId: p.id,
        referFabricante: p.referFabricante,
        descProduto: p.descProduto,
        tributIcms: '',
        idExcecaoGrupo: '',
        caracteristicaContabil: '',
        enviaLojaVarejo: '',
        enviaVarejoInternet: '',
        variaPrecoPorCor: '',
        obsFiscal: '',
      });
    }
  }
  return rows;
}

export function ProdutoImportacaoPlanilhaActions({
  area,
  token,
  onImportComplete,
  disabled,
  produtosParaModelo = [],
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [baixandoModelo, setBaixandoModelo] = useState(false);
  const [importando, setImportando] = useState(false);

  const busy = baixandoModelo || importando || disabled;

  const handleBaixarModelo = async () => {
    if (area === 'fornecedor' && !token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    setBaixandoModelo(true);
    try {
      let { blob, filename } =
        area === 'fornecedor'
          ? await baixarModeloImportacaoFornecedor(token!)
          : area === 'compras'
            ? await baixarModeloImportacaoCompras()
            : await baixarModeloImportacaoFiscal();

      if (area === 'compras' && produtosParaModelo.length > 0) {
        const exportRows = await buildComprasExportRows(produtosParaModelo);
        blob = await injectRowsIntoModeloXlsx(
          blob,
          'Produtos',
          COMPRAS_MODELO_HEADERS,
          exportRows.map((r) => comprasRowToArray(r)),
        );
        filename = 'modelo-preenchimento-compras-preenchido.xlsx';
      }

      if (area === 'fiscal' && produtosParaModelo.length > 0) {
        const exportRows = await buildFiscalExportRows(produtosParaModelo);
        blob = await injectRowsIntoModeloXlsx(
          blob,
          'Produtos',
          FISCAL_MODELO_HEADERS,
          exportRows.map((r) => fiscalRowToArray(r)),
        );
        filename = 'modelo-preenchimento-fiscal-preenchido.xlsx';
      }

      baixarArquivoNoNavegador(blob, filename || MODELO_FALLBACK[area]);
      toast.success('Modelo baixado.', {
        description:
          area !== 'fornecedor' && produtosParaModelo.length > 0
            ? 'Planilha com produtos e campos já preenchidos quando existirem no cadastro.'
            : 'Preencha a planilha e use «Importar planilha» para enviar.',
      });
    } catch (error) {
      toast.error('Não foi possível baixar o modelo.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setBaixandoModelo(false);
    }
  };

  const handleArquivoSelecionado = async (file: File | undefined) => {
    if (!file) return;
    if (area === 'fornecedor' && !token) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Formato inválido.', { description: 'Envie um arquivo Excel (.xlsx).' });
      return;
    }

    setImportando(true);
    try {
      const resultado =
        area === 'fornecedor'
          ? await importarProdutosFornecedor(token!, file)
          : area === 'compras'
            ? await importarProdutosCompras(file)
            : await importarProdutosFiscal(file);

      toastResultadoImportacao(resultado);
      if (resultado.sucesso) {
        try {
          await syncCadastroCompletoAposImportacao(area, file, resultado, token);
        } catch (syncErr) {
          toast.warning('Importação concluída, mas a sincronização local falhou.', {
            description:
              syncErr instanceof Error
                ? `${syncErr.message} Reabra o produto ou importe novamente.`
                : 'Reabra o cadastro do produto para conferir os campos.',
          });
        }
        onImportComplete?.();
      }
    } catch (error) {
      toast.error('Não foi possível importar a planilha.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : 'Tente novamente.',
        duration: 10000,
      });
    } finally {
      setImportando(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => void handleArquivoSelecionado(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleBaixarModelo()}
        className={btnClass}
        style={{ fontFamily: 'Outfit, sans-serif' }}
        title="Baixar modelo Excel para preenchimento em lote"
      >
        {baixandoModelo ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        Baixar modelo
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={btnClass}
        style={{ fontFamily: 'Outfit, sans-serif' }}
        title="Enviar planilha Excel preenchida"
      >
        {importando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        Importar planilha
      </button>
    </>
  );
}
