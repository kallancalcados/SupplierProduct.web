import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Layout } from './Layout';
import { LoadingBlock } from './ui/loading-state';
import { ArrowLeft, Package, FileText, Palette, DollarSign, Camera, Barcode, Plus, Trash2, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { getAuthSession } from '../lib/auth-storage';
import {
  ApiError,
  atualizarPreCadastroProduto,
  criarPreCadastroProduto,
  listarErpColecoes,
  listarErpComposicoes,
  listarErpFabricantes,
  listarErpGrades,
  listarErpTabPreco,
  type ComboErp,
  type ProdutoCadastroDetalhe,
  type ProdutoPreCadastroPayload,
} from '../lib/supplier-api';
import { loadProdutoPreCadastroSnapshot, saveProdutoPreCadastroSnapshot } from '../lib/produto-precadastro-snapshot';
import { resolveCodigoDescricaoComboSalvo, resolveFabricanteCodigoErpSalvo } from '../lib/erp-produto-integracao';
import { Combobox, type ComboboxOption } from './ui/combobox';
import { motivoDevolucaoCompras } from '../../constants/produto-status-fluxo';

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
  ordemFoto: number | null;
}

interface Barra {
  codigoBarra: string;
  corProduto: string;
  tamanho: string;
  grade: string;
}

const comboErpToOptions = (items: ComboErp[]): ComboboxOption[] =>
  (items ?? [])
    .filter((x) => (x?.codigo ?? '').toString().trim().length > 0)
    .map((x) => ({
      value: String(x.codigo).trim(),
      label: (x.descricao?.toString() ?? String(x.codigo)).trim() || String(x.codigo).trim(),
    }));

/** Combo ERP com código gravado e rótulo «código — descrição». */
const comboErpCodigoDescricaoToOptions = (items: ComboErp[]): ComboboxOption[] =>
  (items ?? [])
    .filter((x) => (x?.codigo ?? '').toString().trim().length > 0)
    .map((x) => {
      const codigo = String(x.codigo).trim();
      const descricao = (x.descricao?.toString() ?? '').trim();
      const label = descricao ? `${codigo} — ${descricao}` : codigo;
      return { value: codigo, label };
    });

function mergeCustomErpOption(options: ComboboxOption[], current: string): ComboboxOption[] {
  const t = current.trim();
  if (!t) return options;
  if (options.some((o) => o.value === t || o.label === t)) return options;
  return [{ value: t, label: t }, ...options];
}

function comboboxValueFromStored(raw: string, options: ComboboxOption[]): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (options.some((o) => o.value === t)) return t;
  const byLabel = options.find((o) => o.label === t);
  if (byLabel) return byLabel.value;
  const byCodigoOuDescricao = options.find((o) => {
    const sep = ' — ';
    const idx = o.label.indexOf(sep);
    if (idx < 0) return false;
    const codigo = o.label.slice(0, idx);
    const descricao = o.label.slice(idx + sep.length);
    return codigo === t || descricao === t;
  });
  if (byCodigoOuDescricao) return byCodigoOuDescricao.value;
  return t;
}

const erpComboButtonClass =
  'min-h-[48px] px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white hover:bg-white/25 focus-visible:ring-white/30 disabled:opacity-60';
const erpComboButtonClassSm =
  'min-h-[38px] px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm hover:bg-white/25 focus-visible:ring-white/30 disabled:opacity-60';

interface ProdutoFormData {
  descProduto: string;
  descProdutoNf: string;
  referFabricante: string;
  fabricante: string;
  composicao: string;
  cest: string;
  tributOrigem: string;
  classificacaoFiscalFinal: string;
  obsFornecedor: string;
  subColecao: string;
  tamCentimetros: string;
  tipoBico: string;
  tipoSalto: string;
  pisada: string;
  alturaDrop: string;
  alturaSalto: string;
  classificacaoAltura: string;
  material: string;
  materialInterno: string;
  ocasiaoUso: string;
  tecnologia: string;
  descricaoTecnica: string;
  descricaoEmocional: string;
  peso: string;
  cores: Cor[];
  precos: Preco[];
  fotos: Foto[];
  barras: Barra[];
}

type ProdutoCadastroMode = 'create' | 'edit';

function toPayload(formData: ProdutoFormData, tabPrecoOpts: ComboboxOption[] = []): ProdutoPreCadastroPayload {
  const pesoNumber = Number(formData.peso.replace(',', '.'));
  return {
    descProduto: formData.descProduto,
    descProdutoNf: formData.descProdutoNf || null,
    referFabricante: formData.referFabricante || null,
    fabricante: formData.fabricante || null,
    composicao: formData.composicao || null,
    cest: formData.cest.trim().length ? formData.cest.trim() : null,
    tributOrigem: formData.tributOrigem.trim().length ? formData.tributOrigem.trim() : null,
    classificacaoFiscalFinal: formData.classificacaoFiscalFinal.trim().length
      ? formData.classificacaoFiscalFinal.trim()
      : null,
    obsFornecedor: formData.obsFornecedor || null,
    subColecao: formData.subColecao || null,
    tamCentimetros: formData.tamCentimetros || null,
    tipoBico: formData.tipoBico || null,
    tipoSalto: formData.tipoSalto || null,
    pisada: formData.pisada || null,
    alturaDrop: formData.alturaDrop || null,
    alturaSalto: formData.alturaSalto || null,
    classificacaoAltura: formData.classificacaoAltura || null,
    material: formData.material || null,
    materialInterno: formData.materialInterno || null,
    ocasiaoUso: formData.ocasiaoUso || null,
    tecnologia: formData.tecnologia || null,
    descricaoTecnica: formData.descricaoTecnica || null,
    descricaoEmocional: formData.descricaoEmocional || null,
    peso: Number.isFinite(pesoNumber) && formData.peso.trim().length ? pesoNumber : null,
    cores: formData.cores.map((c) => ({
      codCor: c.codCor,
      descCor: c.descCor,
      origemCor: c.origemCor.trim().length ? c.origemCor : null,
      corFabricante: c.corFabricante.trim().length ? c.corFabricante : null,
      ncm: c.ncm.trim().length ? c.ncm : null,
    })),
    precos: formData.precos.map((p) => ({
      codigoTabelaPreco: resolveCodigoDescricaoComboSalvo(p.codigoTabelaPreco, tabPrecoOpts),
      preco: p.preco,
    })),
    fotos: formData.fotos.map((f) => ({
      corLinx: f.corLinx.trim().length ? f.corLinx : null,
      nomeArquivo: f.nomeArquivo.trim().length ? f.nomeArquivo : null,
      caminhoArquivo: f.caminhoArquivo.trim().length ? f.caminhoArquivo : null,
      base64Foto: f.base64Foto.trim().length ? f.base64Foto : null,
      ordemFoto: f.ordemFoto,
    })),
    barras: formData.barras.map((b) => ({
      codigoBarra: b.codigoBarra,
      corProduto: b.corProduto,
      tamanho: b.tamanho,
      grade: b.grade.trim().length ? b.grade : null,
    })),
  };
}

function pickFirstNonEmpty(...vals: (string | null | undefined)[]): string {
  for (const v of vals) {
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function pesoNumberToFormField(peso: number | null | undefined): string {
  if (peso == null || !Number.isFinite(Number(peso))) return '';
  const n = Number(peso);
  return String(n).replace('.', ',');
}

function mapCoresToForm(
  produto: ProdutoCadastroDetalhe,
  snap: ProdutoPreCadastroPayload | null,
): ProdutoFormData['cores'] {
  const api = produto.cores ?? [];
  const source = api.length > 0 ? api : snap?.cores ?? [];
  return source.map((c) => ({
    codCor: c.codCor ?? '',
    descCor: c.descCor ?? '',
    origemCor: c.origemCor ?? '',
    corFabricante: c.corFabricante ?? '',
    ncm: c.ncm ?? '',
  }));
}

function mapPrecosToForm(
  produto: ProdutoCadastroDetalhe,
  snap: ProdutoPreCadastroPayload | null,
): ProdutoFormData['precos'] {
  const api = produto.precos ?? [];
  const source = api.length > 0 ? api : snap?.precos ?? [];
  return source.map((p) => ({
    codigoTabelaPreco: p.codigoTabelaPreco ?? '',
    preco: Number(p.preco ?? 0),
  }));
}

function mapFotosToForm(
  produto: ProdutoCadastroDetalhe,
  snap: ProdutoPreCadastroPayload | null,
): ProdutoFormData['fotos'] {
  const api = produto.fotos ?? [];
  const source = api.length > 0 ? api : snap?.fotos ?? [];
  return source.map((f) => ({
    corLinx: f.corLinx ?? '',
    nomeArquivo: f.nomeArquivo ?? '',
    caminhoArquivo: f.caminhoArquivo ?? '',
    base64Foto: f.base64Foto ?? '',
    ordemFoto: f.ordemFoto == null ? null : Number(f.ordemFoto),
  }));
}

function mapBarrasToForm(
  produto: ProdutoCadastroDetalhe,
  snap: ProdutoPreCadastroPayload | null,
): ProdutoFormData['barras'] {
  const api = produto.barras ?? [];
  const source = api.length > 0 ? api : snap?.barras ?? [];
  return source.map((b) => ({
    codigoBarra: b.codigoBarra ?? '',
    corProduto: b.corProduto ?? '',
    tamanho: b.tamanho ?? '',
    grade: b.grade ?? '',
  }));
}

/** GET /produtos/:id (fornecedor) não traz slides; snapshot da planilha preenche o formulário. */
function detalheToFormData(produto: ProdutoCadastroDetalhe, snapshot: ProdutoPreCadastroPayload | null): ProdutoFormData {
  const snap = snapshot;

  const pesoStr = pickFirstNonEmpty(
    pesoNumberToFormField(produto.peso),
    pesoNumberToFormField(snap?.peso ?? undefined),
  );

  return {
    descProduto: produto.descProduto ?? '',
    descProdutoNf: pickFirstNonEmpty(produto.descProdutoNf, snap?.descProdutoNf ?? undefined),
    referFabricante: pickFirstNonEmpty(produto.referFabricante, snap?.referFabricante ?? undefined),
    fabricante: pickFirstNonEmpty(produto.fabricante, snap?.fabricante ?? undefined),
    composicao: pickFirstNonEmpty(produto.composicao, snap?.composicao ?? undefined),
    cest: pickFirstNonEmpty(produto.cest, snap?.cest ?? undefined),
    tributOrigem: pickFirstNonEmpty(produto.tributOrigem, snap?.tributOrigem ?? undefined),
    classificacaoFiscalFinal: pickFirstNonEmpty(
      produto.classificacaoFiscalFinal,
      snap?.classificacaoFiscalFinal ?? undefined,
    ),
    obsFornecedor: pickFirstNonEmpty(produto.obsFornecedor, snap?.obsFornecedor ?? undefined),
    subColecao: pickFirstNonEmpty(produto.subColecao, snap?.subColecao ?? undefined),
    tamCentimetros: pickFirstNonEmpty(produto.tamCentimetros, snap?.tamCentimetros ?? undefined),
    tipoBico: pickFirstNonEmpty(produto.tipoBico, snap?.tipoBico ?? undefined),
    tipoSalto: pickFirstNonEmpty(produto.tipoSalto, snap?.tipoSalto ?? undefined),
    pisada: pickFirstNonEmpty(produto.pisada, snap?.pisada ?? undefined),
    alturaDrop: pickFirstNonEmpty(produto.alturaDrop, snap?.alturaDrop ?? undefined),
    alturaSalto: pickFirstNonEmpty(produto.alturaSalto, snap?.alturaSalto ?? undefined),
    classificacaoAltura: pickFirstNonEmpty(produto.classificacaoAltura, snap?.classificacaoAltura ?? undefined),
    material: pickFirstNonEmpty(produto.material, snap?.material ?? undefined),
    materialInterno: pickFirstNonEmpty(produto.materialInterno, snap?.materialInterno ?? undefined),
    ocasiaoUso: pickFirstNonEmpty(produto.ocasiaoUso, snap?.ocasiaoUso ?? undefined),
    tecnologia: pickFirstNonEmpty(produto.tecnologia, snap?.tecnologia ?? undefined),
    descricaoTecnica: pickFirstNonEmpty(produto.descricaoTecnica, snap?.descricaoTecnica ?? undefined),
    descricaoEmocional: pickFirstNonEmpty(produto.descricaoEmocional, snap?.descricaoEmocional ?? undefined),
    peso: pesoStr,
    cores: mapCoresToForm(produto, snap),
    precos: mapPrecosToForm(produto, snap),
    fotos: mapFotosToForm(produto, snap),
    barras: mapBarrasToForm(produto, snap),
  };
}

export function ProdutoCadastro({
  mode = 'create',
  fornecedorData: fornecedorDataProp,
  produtoId,
  produtoDetalhe,
  isLoading = false,
  readOnly = false,
}: {
  mode?: ProdutoCadastroMode;
  fornecedorData?: unknown;
  produtoId?: number;
  produtoDetalhe?: ProdutoCadastroDetalhe;
  isLoading?: boolean;
  readOnly?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const fornecedorData = useMemo(() => fornecedorDataProp ?? location.state?.fornecedorData, [fornecedorDataProp, location.state]);
  const isReadOnly = Boolean(readOnly);

  const [formData, setFormData] = useState<ProdutoFormData>({
    descProduto: '',
    descProdutoNf: '',
    referFabricante: '',
    fabricante: '',
    composicao: '',
    cest: '',
    tributOrigem: '',
    classificacaoFiscalFinal: '',
    obsFornecedor: '',
    subColecao: '',
    tamCentimetros: '',
    tipoBico: '',
    tipoSalto: '',
    pisada: '',
    alturaDrop: '',
    alturaSalto: '',
    classificacaoAltura: '',
    material: '',
    materialInterno: '',
    ocasiaoUso: '',
    tecnologia: '',
    descricaoTecnica: '',
    descricaoEmocional: '',
    peso: '',
    cores: [],
    precos: [],
    fotos: [],
    barras: [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const motivoDevolucao = motivoDevolucaoCompras(formData.obsFornecedor);

  const [loadingCombos, setLoadingCombos] = useState(false);
  const [combosDisponiveis, setCombosDisponiveis] = useState(false);
  const [fabricanteOptions, setFabricanteOptions] = useState<ComboboxOption[]>([]);
  const [composicaoOptions, setComposicaoOptions] = useState<ComboboxOption[]>([]);
  const [colecaoOptions, setColecaoOptions] = useState<ComboboxOption[]>([]);
  const [gradeOptions, setGradeOptions] = useState<ComboboxOption[]>([]);
  const [tabPrecoOptions, setTabPrecoOptions] = useState<ComboboxOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadCombos = async () => {
      setLoadingCombos(true);
      const token = getAuthSession()?.token ?? null;

      const [fabricantesResult, composicoesResult, colecoesResult, gradesResult, tabPrecoResult] =
        await Promise.allSettled([
          listarErpFabricantes(),
          listarErpComposicoes(token),
          listarErpColecoes(),
          listarErpGrades(),
          listarErpTabPreco(token),
        ]);

      if (cancelled) return;

      let anyCombo = false;

      if (fabricantesResult.status === 'fulfilled') {
        setFabricanteOptions(comboErpToOptions(fabricantesResult.value));
        anyCombo = true;
      }
      if (composicoesResult.status === 'fulfilled') {
        setComposicaoOptions(comboErpCodigoDescricaoToOptions(composicoesResult.value));
        anyCombo = true;
      }
      if (colecoesResult.status === 'fulfilled') {
        setColecaoOptions(comboErpToOptions(colecoesResult.value));
        anyCombo = true;
      }
      if (gradesResult.status === 'fulfilled') {
        setGradeOptions(comboErpToOptions(gradesResult.value));
        anyCombo = true;
      }
      if (tabPrecoResult.status === 'fulfilled') {
        setTabPrecoOptions(comboErpCodigoDescricaoToOptions(tabPrecoResult.value));
        anyCombo = true;
      }

      setCombosDisponiveis(anyCombo);
      setLoadingCombos(false);
    };

    void loadCombos();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!combosDisponiveis || !fabricanteOptions.length) return;
    setFormData((prev) => {
      const r = resolveFabricanteCodigoErpSalvo(prev.fabricante, fabricanteOptions);
      return r === prev.fabricante ? prev : { ...prev, fabricante: r };
    });
  }, [combosDisponiveis, fabricanteOptions]);

  useEffect(() => {
    if (!tabPrecoOptions.length) return;
    setFormData((prev) => {
      let changed = false;
      const precos = prev.precos.map((p) => {
        const cod = resolveCodigoDescricaoComboSalvo(p.codigoTabelaPreco, tabPrecoOptions);
        if (cod === p.codigoTabelaPreco) return p;
        changed = true;
        return { ...p, codigoTabelaPreco: cod };
      });
      return changed ? { ...prev, precos } : prev;
    });
  }, [tabPrecoOptions]);

  const fabricanteOpts = useMemo(
    () => mergeCustomErpOption(fabricanteOptions, formData.fabricante),
    [fabricanteOptions, formData.fabricante],
  );
  const composicaoOpts = useMemo(
    () => mergeCustomErpOption(composicaoOptions, formData.composicao),
    [composicaoOptions, formData.composicao],
  );
  const colecaoOpts = useMemo(
    () => mergeCustomErpOption(colecaoOptions, formData.subColecao),
    [colecaoOptions, formData.subColecao],
  );

  useEffect(() => {
    if (mode === 'edit' && produtoDetalhe) {
      const snapshot = loadProdutoPreCadastroSnapshot(produtoDetalhe.id);
      setFormData(detalheToFormData(produtoDetalhe, snapshot));
    }
  }, [mode, produtoDetalhe, produtoId]);

  const handleChange = (field: keyof ProdutoFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleAddCor = () => {
    setFormData({
      ...formData,
      cores: [...formData.cores, { codCor: '', descCor: '', origemCor: '', corFabricante: '', ncm: '' }],
    });
  };

  const handleRemoveCor = (index: number) => {
    setFormData({
      ...formData,
      cores: formData.cores.filter((_, i) => i !== index),
    });
  };

  const handleCorChange = (index: number, field: keyof Cor, value: string) => {
    const newCores = [...formData.cores];
    newCores[index] = { ...newCores[index], [field]: value };
    setFormData({ ...formData, cores: newCores });
  };

  const handleAddPreco = () => {
    setFormData({
      ...formData,
      precos: [...formData.precos, { codigoTabelaPreco: '', preco: 0 }],
    });
  };

  const handleRemovePreco = (index: number) => {
    setFormData({
      ...formData,
      precos: formData.precos.filter((_, i) => i !== index),
    });
  };

  const handlePrecoChange = (index: number, field: keyof Preco, value: string | number) => {
    const newPrecos = [...formData.precos];
    const next =
      field === 'codigoTabelaPreco' && typeof value === 'string'
        ? resolveCodigoDescricaoComboSalvo(value, tabPrecoOptions)
        : value;
    newPrecos[index] = { ...newPrecos[index], [field]: next };
    setFormData({ ...formData, precos: newPrecos });
  };

  const handleAddBarra = () => {
    setFormData({
      ...formData,
      barras: [...formData.barras, { codigoBarra: '', corProduto: '', tamanho: '', grade: '' }],
    });
  };

  const handleRemoveBarra = (index: number) => {
    setFormData({
      ...formData,
      barras: formData.barras.filter((_, i) => i !== index),
    });
  };

  const handleBarraChange = (index: number, field: keyof Barra, value: string) => {
    const newBarras = [...formData.barras];
    newBarras[index] = { ...newBarras[index], [field]: value };
    setFormData({ ...formData, barras: newBarras });
  };

  const handleAddFoto = () => {
    setFormData({
      ...formData,
      fotos: [
        ...formData.fotos,
        { corLinx: '', nomeArquivo: '', caminhoArquivo: '', base64Foto: '', ordemFoto: formData.fotos.length + 1 },
      ],
    });
  };

  const handleRemoveFoto = (index: number) => {
    setFormData({
      ...formData,
      fotos: formData.fotos.filter((_, i) => i !== index),
    });
  };

  const handleFotoChange = (index: number, field: keyof Foto, value: string | number) => {
    const newFotos = [...formData.fotos];
    newFotos[index] = { ...newFotos[index], [field]: value };
    setFormData({ ...formData, fotos: newFotos });
  };

  const handleFileUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1] ?? '';

      const newFotos = [...formData.fotos];
      newFotos[index] = {
        ...newFotos[index],
        nomeArquivo: file.name,
        caminhoArquivo: file.name,
        base64Foto: base64Data,
      };
      setFormData({ ...formData, fotos: newFotos });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (isReadOnly) {
      navigate('/fornecedor/dashboard', { state: { fornecedorData } });
      return;
    }
    const session = getAuthSession();

    if (!session?.token) {
      toast.error('Sessão expirada', {
        description: 'Faça login novamente.',
      });
      navigate('/fornecedor/cnpj');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = toPayload(formData, tabPrecoOptions);

      if (mode === 'edit') {
        if (!produtoId) {
          throw new Error('Produto inválido para edição.');
        }

        await atualizarPreCadastroProduto(session.token, produtoId, payload);
        saveProdutoPreCadastroSnapshot(produtoId, payload);

        toast.success('Produto atualizado com sucesso!', {
          description: 'O pré-cadastro foi salvo.',
        });
      } else {
        const criado = await criarPreCadastroProduto(session.token, payload);
        saveProdutoPreCadastroSnapshot(criado.id, payload);

        toast.success('Produto cadastrado com sucesso!', {
          description: 'O pré-cadastro foi salvo e está disponível no dashboard.',
        });
      }

      setTimeout(() => {
        navigate('/fornecedor/dashboard', { state: { fornecedorData } });
      }, 700);
    } catch (error) {
      toast.error(mode === 'edit' ? 'Não foi possível atualizar o produto.' : 'Não foi possível cadastrar o produto.', {
        description: error instanceof ApiError || error instanceof Error ? error.message : 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = Boolean(formData.descProduto && formData.referFabricante);

  if (isLoading) {
    return (
      <Layout>
        <div className="w-full max-w-7xl py-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border-2 border-white/20 shadow-2xl">
            <LoadingBlock message="Carregando produto..." size="lg" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-7xl py-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border-2 border-white/20 shadow-2xl animate-[fadeIn_0.6s_ease-out]">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              {isReadOnly ? 'Detalhes do Produto' : 'Cadastro de Produto'}
            </h1>
            <div className="w-24 h-1 bg-white/40 mx-auto rounded-full mb-6"></div>
            <p className="text-white/80 text-lg" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
              {isReadOnly ? 'Visualize as informações cadastradas do produto' : 'Preencha as informações do produto para pré-cadastro'}
            </p>
          </div>

          <div className="space-y-8">
            {motivoDevolucao && !isReadOnly && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-5 py-4">
                <p className="text-amber-100 font-semibold text-sm mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Devolvido por compras — corrija e reenvie
                </p>
                <p className="text-white/90 text-sm whitespace-pre-wrap" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  {motivoDevolucao}
                </p>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Package className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Informações Básicas
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Descrição do Produto *
                  </label>
                  <input
                    type="text"
                    value={formData.descProduto}
                    onChange={(e) => handleChange('descProduto', e.target.value)}
                    placeholder="Ex: Camiseta Polo Premium"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Descrição Nota Fiscal
                  </label>
                  <input
                    type="text"
                    value={formData.descProdutoNf}
                    onChange={(e) => handleChange('descProdutoNf', e.target.value)}
                    placeholder="Descrição que aparecerá na NF"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Referência Fabricante *
                  </label>
                  <input
                    type="text"
                    value={formData.referFabricante}
                    onChange={(e) => handleChange('referFabricante', e.target.value)}
                    placeholder="Código do fabricante"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Subcoleção
                  </label>
                  {combosDisponiveis && colecaoOpts.length > 0 ? (
                    <Combobox
                      value={comboboxValueFromStored(formData.subColecao, colecaoOpts)}
                      options={colecaoOpts}
                      onChange={(val) => handleChange('subColecao', val ?? '')}
                      placeholder={loadingCombos ? 'Carregando...' : 'Selecione a coleção no ERP'}
                      searchPlaceholder="Buscar coleção..."
                      disabled={isReadOnly || loadingCombos}
                      buttonClassName={erpComboButtonClass}
                      className="bg-white/10 backdrop-blur-xl border-white/20"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.subColecao}
                      onChange={(e) => handleChange('subColecao', e.target.value)}
                      placeholder="Ex: Linha Conforto"
                      disabled={isReadOnly}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  )}
                  {combosDisponiveis && colecaoOpts.length > 0 && (
                    <p className="text-white/50 text-xs mt-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Lista integrada ao ERP (tabela COLECOES).
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Fabricante
                  </label>
                  {combosDisponiveis && fabricanteOpts.length > 0 ? (
                    <Combobox
                      value={comboboxValueFromStored(formData.fabricante, fabricanteOpts)}
                      options={fabricanteOpts}
                      onChange={(val) => handleChange('fabricante', val ?? '')}
                      placeholder={loadingCombos ? 'Carregando...' : 'Selecione o fabricante (fornecedor ERP)'}
                      searchPlaceholder="Buscar fabricante..."
                      disabled={isReadOnly || loadingCombos}
                      buttonClassName={erpComboButtonClass}
                      className="bg-white/10 backdrop-blur-xl border-white/20"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.fabricante}
                      onChange={(e) => handleChange('fabricante', e.target.value)}
                      placeholder="Código do fabricante no ERP"
                      disabled={isReadOnly}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  )}
                  {combosDisponiveis && fabricanteOpts.length > 0 && (
                    <p className="text-white/50 text-xs mt-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Código do fornecedor fabricante (integração valida no ERP).
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Características
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Material
                  </label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) => handleChange('material', e.target.value)}
                    placeholder="Ex: Couro"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Material Interno
                  </label>
                  <input
                    type="text"
                    value={formData.materialInterno}
                    onChange={(e) => handleChange('materialInterno', e.target.value)}
                    placeholder="Ex: Têxtil"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Composição
                  </label>
                  {composicaoOpts.length > 0 ? (
                    <Combobox
                      value={comboboxValueFromStored(formData.composicao, composicaoOpts)}
                      options={composicaoOpts}
                      onChange={(val) => handleChange('composicao', val ?? '')}
                      placeholder={loadingCombos ? 'Carregando...' : 'Selecione a composição no ERP'}
                      searchPlaceholder="Buscar por código ou descrição..."
                      disabled={isReadOnly || loadingCombos}
                      buttonClassName={erpComboButtonClass}
                      className="bg-white/10 backdrop-blur-xl border-white/20"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.composicao}
                      onChange={(e) => handleChange('composicao', e.target.value)}
                      placeholder={
                        loadingCombos
                          ? 'Carregando composições do ERP...'
                          : 'Código de composição (MATERIAIS_COMPOSICAO)'
                      }
                      disabled={isReadOnly || loadingCombos}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  )}
                  {composicaoOpts.length > 0 && (
                    <p className="text-white/50 text-xs mt-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Lista do ERP (MATERIAIS_COMPOSICAO). O código é gravado; busque por código ou descrição.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Tamanho (cm)
                  </label>
                  <input
                    type="text"
                    value={formData.tamCentimetros}
                    onChange={(e) => handleChange('tamCentimetros', e.target.value)}
                    placeholder="Ex: 27"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Tipo de Bico
                  </label>
                  <input
                    type="text"
                    value={formData.tipoBico}
                    onChange={(e) => handleChange('tipoBico', e.target.value)}
                    placeholder="Ex: Redondo"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Tipo de Salto
                  </label>
                  <input
                    type="text"
                    value={formData.tipoSalto}
                    onChange={(e) => handleChange('tipoSalto', e.target.value)}
                    placeholder="Ex: Bloco"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Pisada
                  </label>
                  <input
                    type="text"
                    value={formData.pisada}
                    onChange={(e) => handleChange('pisada', e.target.value)}
                    placeholder="Ex: Neutra"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Altura Drop
                  </label>
                  <input
                    type="text"
                    value={formData.alturaDrop}
                    onChange={(e) => handleChange('alturaDrop', e.target.value)}
                    placeholder="Ex: 8mm"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Altura Salto
                  </label>
                  <input
                    type="text"
                    value={formData.alturaSalto}
                    onChange={(e) => handleChange('alturaSalto', e.target.value)}
                    placeholder="Ex: 5cm"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Classificação Altura
                  </label>
                  <input
                    type="text"
                    value={formData.classificacaoAltura}
                    onChange={(e) => handleChange('classificacaoAltura', e.target.value)}
                    placeholder="Ex: Médio"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Ocasião de Uso
                  </label>
                  <input
                    type="text"
                    value={formData.ocasiaoUso}
                    onChange={(e) => handleChange('ocasiaoUso', e.target.value)}
                    placeholder="Ex: Casual"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Tecnologia
                  </label>
                  <input
                    type="text"
                    value={formData.tecnologia}
                    onChange={(e) => handleChange('tecnologia', e.target.value)}
                    placeholder="Ex: EVA"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Peso (kg)
                  </label>
                  <input
                    type="text"
                    value={formData.peso}
                    onChange={(e) => handleChange('peso', e.target.value)}
                    placeholder="Ex: 0,35"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Descrição Técnica
                  </label>
                  <textarea
                    value={formData.descricaoTecnica}
                    onChange={(e) => handleChange('descricaoTecnica', e.target.value)}
                    placeholder="Descrição técnica do produto"
                    rows={3}
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300 resize-none"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Descrição Emocional
                  </label>
                  <textarea
                    value={formData.descricaoEmocional}
                    onChange={(e) => handleChange('descricaoEmocional', e.target.value)}
                    placeholder="Descrição emocional do produto"
                    rows={3}
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300 resize-none"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Observações do Fornecedor
                  </label>
                  <textarea
                    value={formData.obsFornecedor}
                    onChange={(e) => handleChange('obsFornecedor', e.target.value)}
                    placeholder="Observações adicionais sobre o produto"
                    rows={3}
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300 resize-none"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Scale className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Informações Fiscais
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    CEST
                  </label>
                  <input
                    type="text"
                    value={formData.cest}
                    onChange={(e) => handleChange('cest', e.target.value)}
                    placeholder="Código CEST"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Tribut. Origem
                  </label>
                  <input
                    type="text"
                    value={formData.tributOrigem}
                    onChange={(e) => handleChange('tributOrigem', e.target.value)}
                    placeholder="Tributação de origem"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Classificação Fiscal Final
                  </label>
                  <input
                    type="text"
                    value={formData.classificacaoFiscalFinal}
                    onChange={(e) => handleChange('classificacaoFiscalFinal', e.target.value)}
                    placeholder="Classificação fiscal"
                    disabled={isReadOnly}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Palette className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Cores
                  </h2>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={handleAddCor}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg border border-white/30 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Cor
                  </button>
                )}
              </div>

              {formData.cores.length === 0 ? (
                <p className="text-white/60 text-center py-8" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  Nenhuma cor adicionada. Clique em "Adicionar Cor" para começar.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.cores.map((cor, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-5 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Cor #{index + 1}
                        </span>
                        {!isReadOnly && (
                          <button onClick={() => handleRemoveCor(index)} className="text-red-300 hover:text-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Código da Cor
                          </label>
                          <input
                            type="text"
                            value={cor.codCor}
                            onChange={(e) => handleCorChange(index, 'codCor', e.target.value)}
                            placeholder="Código"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Descrição
                          </label>
                          <input
                            type="text"
                            value={cor.descCor}
                            onChange={(e) => handleCorChange(index, 'descCor', e.target.value)}
                            placeholder="Ex: Azul Marinho"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Origem
                          </label>
                          <input
                            type="text"
                            value={cor.origemCor}
                            onChange={(e) => handleCorChange(index, 'origemCor', e.target.value)}
                            placeholder="Origem"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Cor Fabricante
                          </label>
                          <input
                            type="text"
                            value={cor.corFabricante}
                            onChange={(e) => handleCorChange(index, 'corFabricante', e.target.value)}
                            placeholder="Cor do fabricante"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            NCM
                          </label>
                          <input
                            type="text"
                            value={cor.ncm}
                            onChange={(e) => handleCorChange(index, 'ncm', e.target.value)}
                            placeholder="NCM"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Tabela de Preços
                  </h2>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={handleAddPreco}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg border border-white/30 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Preço
                  </button>
                )}
              </div>

              {formData.precos.length === 0 ? (
                <p className="text-white/60 text-center py-8" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  Nenhum preço adicionado. Clique em "Adicionar Preço" para começar.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.precos.map((preco, index) => {
                    const tabPrecoOpts = mergeCustomErpOption(tabPrecoOptions, preco.codigoTabelaPreco);
                    return (
                    <div key={index} className="bg-white/5 rounded-xl p-5 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Preço #{index + 1}
                        </span>
                        {!isReadOnly && (
                          <button onClick={() => handleRemovePreco(index)} className="text-red-300 hover:text-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Tabela de Preço
                          </label>
                          {tabPrecoOpts.length > 0 ? (
                            <Combobox
                              value={comboboxValueFromStored(preco.codigoTabelaPreco, tabPrecoOpts)}
                              options={tabPrecoOpts}
                              onChange={(val) =>
                                handlePrecoChange(
                                  index,
                                  'codigoTabelaPreco',
                                  resolveCodigoDescricaoComboSalvo(val ?? '', tabPrecoOpts),
                                )
                              }
                              placeholder={loadingCombos ? 'Carregando...' : 'Selecione a tabela no ERP'}
                              searchPlaceholder="Buscar por código ou descrição..."
                              disabled={isReadOnly || loadingCombos}
                              buttonClassName={erpComboButtonClassSm}
                              className="bg-white/10 backdrop-blur-xl border-white/20"
                            />
                          ) : (
                            <input
                              type="text"
                              value={preco.codigoTabelaPreco}
                              onChange={(e) => handlePrecoChange(index, 'codigoTabelaPreco', e.target.value)}
                              placeholder={
                                loadingCombos ? 'Carregando tabelas do ERP...' : 'Código da tabela de preço'
                              }
                              disabled={isReadOnly || loadingCombos}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          )}
                          {tabPrecoOpts.length > 0 && (
                            <p className="text-white/50 text-xs mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              O código da tabela é gravado; busque por código ou descrição.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Preço
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={preco.preco}
                            onChange={(e) => handlePrecoChange(index, 'preco', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Camera className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Fotos do Produto
                  </h2>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={handleAddFoto}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg border border-white/30 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Foto
                  </button>
                )}
              </div>

              {formData.fotos.length === 0 ? (
                <p className="text-white/60 text-center py-8" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  Nenhuma foto adicionada. Clique em "Adicionar Foto" para começar.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.fotos.map((foto, index) => (
                    <div key={index} className="bg-white/5 rounded-xl p-5 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-white font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                          Foto #{index + 1}
                        </span>
                        {!isReadOnly && (
                          <button onClick={() => handleRemoveFoto(index)} className="text-red-300 hover:text-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Cor Linx
                          </label>
                          <input
                            type="text"
                            value={foto.corLinx}
                            onChange={(e) => handleFotoChange(index, 'corLinx', e.target.value)}
                            placeholder="Código da cor"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                        <div>
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Ordem da Foto
                          </label>
                          <input
                            type="number"
                            value={foto.ordemFoto}
                            onChange={(e) => handleFotoChange(index, 'ordemFoto', parseInt(e.target.value) || 0)}
                            placeholder="1"
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Upload da Foto
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(index, e)}
                            disabled={isReadOnly}
                            className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/30 file:text-white file:cursor-pointer hover:file:bg-white/40 transition-all"
                            style={{ fontFamily: 'Outfit, sans-serif' }}
                          />
                          {foto.nomeArquivo && (
                            <p className="text-white/60 text-xs mt-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Arquivo: {foto.nomeArquivo}
                            </p>
                          )}
                        </div>
                        {foto.base64Foto && (
                          <div className="md:col-span-2">
                            <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Preview
                            </label>
                            <div className="bg-white/10 rounded-lg p-3 border border-white/20">
                              <img
                                src={`data:image/jpeg;base64,${foto.base64Foto}`}
                                alt={`Preview ${index + 1}`}
                                className="max-w-full h-auto max-h-48 rounded-lg mx-auto"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Barcode className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Códigos de Barras
                  </h2>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={handleAddBarra}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg border border-white/30 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Código
                  </button>
                )}
              </div>
              <p className="text-white/50 text-xs mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Para integrar ao ERP, use a posição numérica da grade (1–48, coluna TAMANHO_N) e o mesmo texto de
                tamanho visual cadastrado em PRODUTOS_TAMANHOS para essa grade.
              </p>

              {formData.barras.length === 0 ? (
                <p className="text-white/60 text-center py-8" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  Nenhum código de barras adicionado. Clique em "Adicionar Código" para começar.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.barras.map((barra, index) => {
                    const gradeOpts = mergeCustomErpOption(gradeOptions, barra.grade);
                    return (
                      <div key={index} className="bg-white/5 rounded-xl p-5 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-white font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Código #{index + 1}
                          </span>
                          {!isReadOnly && (
                            <button onClick={() => handleRemoveBarra(index)} className="text-red-300 hover:text-red-100 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Código de Barras
                            </label>
                            <input
                              type="text"
                              value={barra.codigoBarra}
                              onChange={(e) => handleBarraChange(index, 'codigoBarra', e.target.value)}
                              placeholder="EAN/SKU"
                              disabled={isReadOnly}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>
                          <div>
                            <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Cor
                            </label>
                            <input
                              type="text"
                              value={barra.corProduto}
                              onChange={(e) => handleBarraChange(index, 'corProduto', e.target.value)}
                              placeholder="Cor"
                              disabled={isReadOnly}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>
                          <div>
                            <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Posição na grade (1–48)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={barra.tamanho}
                              onChange={(e) => handleBarraChange(index, 'tamanho', e.target.value)}
                              placeholder="Ex.: 37"
                              disabled={isReadOnly}
                              className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                              style={{ fontFamily: 'Outfit, sans-serif' }}
                            />
                          </div>
                          <div>
                            <label className="block text-white/80 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                              Tamanho visual (grade)
                            </label>
                            {combosDisponiveis && gradeOptions.length > 0 ? (
                              <Combobox
                                value={comboboxValueFromStored(barra.grade, gradeOpts)}
                                options={gradeOpts}
                                onChange={(val) => handleBarraChange(index, 'grade', val ?? '')}
                                placeholder={loadingCombos ? '...' : 'Grade ERP'}
                                searchPlaceholder="Buscar grade..."
                                disabled={isReadOnly || loadingCombos}
                                buttonClassName={erpComboButtonClassSm}
                                className="bg-white/10 backdrop-blur-xl border-white/20"
                              />
                            ) : (
                              <input
                                type="text"
                                value={barra.grade}
                                onChange={(e) => handleBarraChange(index, 'grade', e.target.value)}
                                placeholder="Grade"
                                disabled={isReadOnly}
                                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-sm placeholder-white/40 focus:outline-none focus:border-white/60"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 pt-4">
              {!isReadOnly && (
                <button
                  onClick={handleSubmit}
                  disabled={!isFormValid || isSubmitting || isLoading}
                  className="w-full bg-white text-[#ca0404] py-5 px-8 rounded-xl text-xl font-semibold hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  {isLoading ? 'Carregando...' : isSubmitting ? 'Salvando...' : mode === 'edit' ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              )}

              <button
                onClick={() => navigate('/fornecedor/dashboard', { state: { fornecedorData } })}
                className="w-full flex items-center justify-center text-white/80 hover:text-white text-lg transition-colors duration-300 py-4"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar ao Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
