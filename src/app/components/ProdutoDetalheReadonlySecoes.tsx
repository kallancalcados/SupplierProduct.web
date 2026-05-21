import type { ReactNode } from 'react';
import { ClipboardList, FileText, Package } from 'lucide-react';
import type { ProdutoDetalheCompleto } from '../lib/map-produto-detalhe';

function displayValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') return String(value);
  const t = value.trim();
  return t || '—';
}

function ReadOnlyGrid({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {fields.map(({ label, value }) => (
        <div key={label} className={label.includes('Observ') ? 'md:col-span-2' : undefined}>
          <span className="block text-white/50 text-xs mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {label}
          </span>
          <p
            className="text-white text-sm whitespace-pre-wrap"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function SectionShell({
  title,
  icon: Icon,
  subtitle,
  children,
}: {
  title: string;
  icon: typeof Package;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-6 h-6 text-white" />
        <h3 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
          {title}
        </h3>
      </div>
      {subtitle ? (
        <p className="text-white/50 text-xs mb-5 ml-9" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
          {subtitle}
        </p>
      ) : (
        <div className="mb-5" />
      )}
      {children}
    </div>
  );
}

export function PreCadastroFornecedorExtrasReadonly({ product }: { product: ProdutoDetalheCompleto }) {
  const fields = [
    { label: 'Subcoleção', value: displayValue(product.subColecao) },
    { label: 'Tamanho (cm)', value: displayValue(product.tamCentimetros) },
    { label: 'Tipo de bico', value: displayValue(product.tipoBico) },
    { label: 'Tipo de salto', value: displayValue(product.tipoSalto) },
    { label: 'Pisada', value: displayValue(product.pisada) },
    { label: 'Altura drop', value: displayValue(product.alturaDrop) },
    { label: 'Altura salto', value: displayValue(product.alturaSalto) },
    { label: 'Classificação altura', value: displayValue(product.classificacaoAltura) },
    { label: 'Material', value: displayValue(product.material) },
    { label: 'Material interno', value: displayValue(product.materialInterno) },
    { label: 'Ocasião de uso', value: displayValue(product.ocasiaoUso) },
    { label: 'Tecnologia', value: displayValue(product.tecnologia) },
    { label: 'Peso', value: displayValue(product.peso) },
    { label: 'CEST (pré-cadastro)', value: displayValue(product.cest) },
    { label: 'Tribut. origem (pré-cadastro)', value: displayValue(product.tributOrigem) },
    { label: 'Classificação fiscal final (pré-cadastro)', value: displayValue(product.classificacaoFiscalFinal) },
    { label: 'Descrição técnica', value: displayValue(product.descricaoTecnica) },
    { label: 'Descrição emocional', value: displayValue(product.descricaoEmocional) },
  ];

  return (
    <SectionShell
      title="Pré-cadastro do fornecedor (complemento)"
      icon={FileText}
      subtitle="Campos adicionais do cadastro inicial enviado pelo fornecedor"
    >
      <ReadOnlyGrid fields={fields} />
    </SectionShell>
  );
}

export function AnaliseComprasReadonly({ product }: { product: ProdutoDetalheCompleto }) {
  const fields = [
    { label: 'Grupo produto', value: displayValue(product.grupoProduto) },
    { label: 'Subgrupo produto', value: displayValue(product.subgrupoProduto) },
    { label: 'Código categoria', value: displayValue(product.codCategoria) },
    { label: 'Código subcategoria', value: displayValue(product.codSubcategoria) },
    { label: 'Tipo de produto', value: displayValue(product.tipoProduto) },
    { label: 'Grade', value: displayValue(product.grade) },
    { label: 'Linha', value: displayValue(product.linha) },
    { label: 'Griffe', value: displayValue(product.griffe) },
    { label: 'Coleção', value: displayValue(product.colecao) },
    { label: 'Unidade', value: displayValue(product.unidade) },
    { label: 'Tipo status produto', value: displayValue(product.tipoStatusProduto) },
    { label: 'Sexo / tipo', value: displayValue(product.sexoTipo) },
    { label: 'Tipo item SPED', value: displayValue(product.tipoItemSped) },
    { label: 'Indicador CFOP', value: displayValue(product.indicadorCfop) },
    { label: 'Período PCP', value: displayValue(product.periodoPcp) },
    { label: 'Rede de lojas', value: displayValue(product.redeLojas) },
    { label: 'Código produto segmento', value: displayValue(product.codProdutoSegmento) },
    { label: 'Código produto solução', value: displayValue(product.codProdutoSolucao) },
    { label: 'Continuidade', value: displayValue(product.continuidade) },
    { label: 'Sujeito substituição tributária', value: displayValue(product.sujeitoSubstituicaoTributaria) },
    { label: 'Cartela', value: displayValue(product.cartela) },
    { label: 'Consumo', value: displayValue(product.consumo) },
    { label: 'Restrição lavagem', value: displayValue(product.restricaoLavagem) },
    { label: 'Rota operação', value: displayValue(product.rotaOperacao) },
    { label: 'Tipo encomenda', value: displayValue(product.tipoEncomenda) },
    { label: 'Empresa', value: displayValue(product.empresa) },
    { label: 'Comissão', value: displayValue(product.comissao) },
    { label: 'Produto em processo', value: displayValue(product.produtoEmProcesso) },
    { label: 'Conta contábil', value: displayValue(product.contaContabil) },
    { label: 'Conta contábil compra', value: displayValue(product.contaContabilCompra) },
    { label: 'Conta contábil venda', value: displayValue(product.contaContabilVenda) },
    { label: 'Conta contábil dev. compra', value: displayValue(product.contaContabilDevCompra) },
    { label: 'Conta contábil dev. venda', value: displayValue(product.contaContabilDevVenda) },
    { label: 'Observações compras', value: displayValue(product.obsCompras) },
    { label: 'Usuário compras', value: displayValue(product.usuarioComprasLogin) },
  ];

  return (
    <SectionShell
      title="Análise Compras"
      icon={ClipboardList}
      subtitle="Preenchimento da equipe de compras (somente leitura)"
    >
      <ReadOnlyGrid fields={fields} />
    </SectionShell>
  );
}

export function AnaliseFiscalReadonly({ product }: { product: ProdutoDetalheCompleto }) {
  const fields = [
    { label: 'NCM', value: displayValue(product.ncm) },
    { label: 'CEST', value: displayValue(product.cest) },
    { label: 'Tribut. origem', value: displayValue(product.tributOrigem) },
    { label: 'Classificação fiscal final', value: displayValue(product.classificacaoFiscalFinal) },
    { label: 'Tribut. ICMS', value: displayValue(product.tributIcms) },
    { label: 'ID exceção grupo', value: displayValue(product.idExcecaoGrupo) },
    { label: 'Característica contábil', value: displayValue(product.caracteristicaContabil) },
    { label: 'Envia loja varejo', value: displayValue(product.enviaLojaVarejo) },
    { label: 'Envia varejo internet', value: displayValue(product.enviaVarejoInternet) },
    { label: 'Varia preço por cor', value: displayValue(product.variaPrecoPorCor) },
    { label: 'Observações fiscal', value: displayValue(product.obsFiscal) },
    { label: 'Usuário fiscal', value: displayValue(product.usuarioFiscalLogin) },
  ];

  return (
    <SectionShell
      title="Análise Fiscal"
      icon={ClipboardList}
      subtitle="Preenchimento da equipe fiscal (somente leitura)"
    >
      <ReadOnlyGrid fields={fields} />
    </SectionShell>
  );
}
