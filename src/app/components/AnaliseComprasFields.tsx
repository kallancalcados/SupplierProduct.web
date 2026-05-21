import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { ComboErp } from '../lib/supplier-api';
import {
  listarErpCategorias,
  listarErpColecoes,
  listarErpContasContabeis,
  listarErpGrades,
  listarErpGriffes,
  listarErpGruposProduto,
  listarErpIndicadoresCfop,
  listarErpLinhas,
  listarErpPeriodosPcp,
  listarErpRedesLojas,
  listarErpSubcategorias,
  listarErpSubgruposKalNosValidos,
  listarErpSubgruposProduto,
  listarErpTiposProduto,
  listarErpTipoItem,
  listarErpUnidades,
} from '../lib/supplier-api';
import { Combobox, type ComboboxOption } from './ui/combobox';
import { LoadingOverlay } from './ui/loading-state';

export interface AnaliseComprasFormState {
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
}

function comboErpToOptions(items: ComboErp[]): ComboboxOption[] {
  return (items ?? [])
    .filter((x) => (x?.codigo ?? '').toString().trim().length > 0)
    .map((x) => ({
      value: String(x.codigo).trim(),
      label: (x.descricao?.toString() ?? String(x.codigo)).trim() || String(x.codigo).trim(),
    }));
}

/** Rótulo «código — descrição»; persiste apenas o código. */
function comboErpCodigoDescricaoToOptions(items: ComboErp[]): ComboboxOption[] {
  return (items ?? [])
    .filter((x) => (x?.codigo ?? '').toString().trim().length > 0)
    .map((x) => {
      const codigo = String(x.codigo).trim();
      const descricao = (x.descricao?.toString() ?? '').trim();
      const label = descricao ? `${codigo} — ${descricao}` : codigo;
      return { value: codigo, label };
    });
}

function mergeCustomErpOption(options: ComboboxOption[], current: string): ComboboxOption[] {
  const t = current.trim();
  if (!t) return options;
  if (options.some((o) => o.value === t || o.label === t)) return options;
  return [{ value: t, label: t }, ...options];
}

function comboboxValueFromStored(raw: string, options: ComboboxOption[]): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (options.some((o) => o.value === s)) return s;
  const byLabel = options.find((o) => o.label === s);
  if (byLabel) return byLabel.value;
  const byCodigoOuDescricao = options.find((o) => {
    const sep = ' — ';
    const idx = o.label.indexOf(sep);
    if (idx < 0) return false;
    const codigo = o.label.slice(0, idx);
    const descricao = o.label.slice(idx + sep.length);
    return codigo === s || descricao === s;
  });
  if (byCodigoOuDescricao) return byCodigoOuDescricao.value;
  return s;
}

const comboBtn =
  'min-h-[44px] h-auto px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white hover:bg-white/25 focus-visible:ring-white/30 disabled:opacity-60 text-left whitespace-normal';

export function AnaliseComprasFields({
  formCompras,
  setFormCompras,
  disabled = false,
}: {
  formCompras: AnaliseComprasFormState;
  setFormCompras: Dispatch<SetStateAction<AnaliseComprasFormState>>;
  disabled?: boolean;
}) {
  const [loadingCombos, setLoadingCombos] = useState(true);
  const [combosOk, setCombosOk] = useState(false);

  const [optsGrupo, setOptsGrupo] = useState<ComboboxOption[]>([]);
  const [optsSubgrupo, setOptsSubgrupo] = useState<ComboboxOption[]>([]);
  const [optsCategoria, setOptsCategoria] = useState<ComboboxOption[]>([]);
  const [optsSubcategoria, setOptsSubcategoria] = useState<ComboboxOption[]>([]);
  const [optsTipoProduto, setOptsTipoProduto] = useState<ComboboxOption[]>([]);
  const [optsGrade, setOptsGrade] = useState<ComboboxOption[]>([]);
  const [optsLinha, setOptsLinha] = useState<ComboboxOption[]>([]);
  const [optsGriffe, setOptsGriffe] = useState<ComboboxOption[]>([]);
  const [optsColecao, setOptsColecao] = useState<ComboboxOption[]>([]);
  const [optsPeriodoPcp, setOptsPeriodoPcp] = useState<ComboboxOption[]>([]);
  const [optsRedeLojas, setOptsRedeLojas] = useState<ComboboxOption[]>([]);
  const [optsUnidade, setOptsUnidade] = useState<ComboboxOption[]>([]);
  const [optsContasContabeis, setOptsContasContabeis] = useState<ComboboxOption[]>([]);
  const [optsIndicadorCfop, setOptsIndicadorCfop] = useState<ComboboxOption[]>([]);
  const [optsTipoItemSped, setOptsTipoItemSped] = useState<ComboboxOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCombos(true);
      try {
        const [
          grupos,
          categorias,
          tipos,
          grades,
          linhas,
          griffes,
          colecoes,
          periodos,
          redes,
          unidades,
          contasContabeis,
        ] = await Promise.all([
          listarErpGruposProduto(),
          listarErpCategorias(),
          listarErpTiposProduto(),
          listarErpGrades(),
          listarErpLinhas(),
          listarErpGriffes(),
          listarErpColecoes(),
          listarErpPeriodosPcp(),
          listarErpRedesLojas(),
          listarErpUnidades(),
          listarErpContasContabeis(),
        ]);
        if (cancelled) return;
        setOptsGrupo(comboErpToOptions(grupos));
        setOptsCategoria(comboErpToOptions(categorias));
        setOptsTipoProduto(comboErpToOptions(tipos));
        setOptsGrade(comboErpToOptions(grades));
        setOptsLinha(comboErpToOptions(linhas));
        setOptsGriffe(comboErpToOptions(griffes));
        setOptsColecao(comboErpToOptions(colecoes));
        setOptsPeriodoPcp(comboErpToOptions(periodos));
        setOptsRedeLojas(comboErpToOptions(redes));
        setOptsUnidade(comboErpToOptions(unidades));
        setOptsContasContabeis(comboErpToOptions(contasContabeis));

        let indicadoresCfop: ComboErp[] = [];
        try {
          indicadoresCfop = await listarErpIndicadoresCfop();
        } catch {
          indicadoresCfop = [];
        }
        if (!cancelled) setOptsIndicadorCfop(comboErpToOptions(indicadoresCfop));

        let tiposItem: ComboErp[] = [];
        try {
          tiposItem = await listarErpTipoItem();
        } catch {
          tiposItem = [];
        }
        if (!cancelled) setOptsTipoItemSped(comboErpCodigoDescricaoToOptions(tiposItem));

        setCombosOk(true);
      } catch {
        if (!cancelled) setCombosOk(false);
      } finally {
        if (!cancelled) setLoadingCombos(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const g = formCompras.grupoProduto.trim();
      if (!g) {
        if (!cancelled) setOptsSubgrupo([]);
        return;
      }
      const rede = formCompras.redeLojas.trim();
      const linha = formCompras.linha.trim();
      try {
        let sub: ComboErp[];
        if (rede && linha) {
          try {
            sub = await listarErpSubgruposKalNosValidos(rede, linha, g);
          } catch {
            sub = [];
          }
          if (sub.length === 0) sub = await listarErpSubgruposProduto(g);
        } else {
          sub = await listarErpSubgruposProduto(g);
        }
        if (!cancelled) setOptsSubgrupo(comboErpToOptions(sub));
      } catch {
        if (!cancelled) setOptsSubgrupo([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [formCompras.grupoProduto, formCompras.redeLojas, formCompras.linha]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const sub = await listarErpSubcategorias(formCompras.codCategoria.trim() || null);
        if (!cancelled) setOptsSubcategoria(comboErpToOptions(sub));
      } catch {
        if (!cancelled) setOptsSubcategoria([]);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [formCompras.codCategoria]);

  const grupoOpts = useMemo(
    () => mergeCustomErpOption(optsGrupo, formCompras.grupoProduto),
    [optsGrupo, formCompras.grupoProduto],
  );
  const subgrupoOpts = useMemo(
    () => mergeCustomErpOption(optsSubgrupo, formCompras.subgrupoProduto),
    [optsSubgrupo, formCompras.subgrupoProduto],
  );
  const catOpts = useMemo(
    () => mergeCustomErpOption(optsCategoria, formCompras.codCategoria),
    [optsCategoria, formCompras.codCategoria],
  );
  const subcatOpts = useMemo(
    () => mergeCustomErpOption(optsSubcategoria, formCompras.codSubcategoria),
    [optsSubcategoria, formCompras.codSubcategoria],
  );
  const tipoOpts = useMemo(
    () => mergeCustomErpOption(optsTipoProduto, formCompras.tipoProduto),
    [optsTipoProduto, formCompras.tipoProduto],
  );
  const gradeOpts = useMemo(
    () => mergeCustomErpOption(optsGrade, formCompras.grade),
    [optsGrade, formCompras.grade],
  );
  const linhaOpts = useMemo(
    () => mergeCustomErpOption(optsLinha, formCompras.linha),
    [optsLinha, formCompras.linha],
  );
  const griffeOpts = useMemo(
    () => mergeCustomErpOption(optsGriffe, formCompras.griffe),
    [optsGriffe, formCompras.griffe],
  );
  const colecaoOpts = useMemo(
    () => mergeCustomErpOption(optsColecao, formCompras.colecao),
    [optsColecao, formCompras.colecao],
  );
  const pcpOpts = useMemo(
    () => mergeCustomErpOption(optsPeriodoPcp, formCompras.periodoPcp),
    [optsPeriodoPcp, formCompras.periodoPcp],
  );
  const redeOpts = useMemo(
    () => mergeCustomErpOption(optsRedeLojas, formCompras.redeLojas),
    [optsRedeLojas, formCompras.redeLojas],
  );
  const unidadeOpts = useMemo(
    () => mergeCustomErpOption(optsUnidade, formCompras.unidade),
    [optsUnidade, formCompras.unidade],
  );
  const contaEstoqueOpts = useMemo(
    () => mergeCustomErpOption(optsContasContabeis, formCompras.contaContabil),
    [optsContasContabeis, formCompras.contaContabil],
  );
  const contaCompraOpts = useMemo(
    () => mergeCustomErpOption(optsContasContabeis, formCompras.contaContabilCompra),
    [optsContasContabeis, formCompras.contaContabilCompra],
  );
  const contaVendaOpts = useMemo(
    () => mergeCustomErpOption(optsContasContabeis, formCompras.contaContabilVenda),
    [optsContasContabeis, formCompras.contaContabilVenda],
  );
  const contaDevCompraOpts = useMemo(
    () => mergeCustomErpOption(optsContasContabeis, formCompras.contaContabilDevCompra),
    [optsContasContabeis, formCompras.contaContabilDevCompra],
  );
  const contaDevVendaOpts = useMemo(
    () => mergeCustomErpOption(optsContasContabeis, formCompras.contaContabilDevVenda),
    [optsContasContabeis, formCompras.contaContabilDevVenda],
  );
  const indicadorCfopOpts = useMemo(
    () => mergeCustomErpOption(optsIndicadorCfop, formCompras.indicadorCfop),
    [optsIndicadorCfop, formCompras.indicadorCfop],
  );
  const tipoItemSpedOpts = useMemo(
    () => mergeCustomErpOption(optsTipoItemSped, formCompras.tipoItemSped),
    [optsTipoItemSped, formCompras.tipoItemSped],
  );

  const inputClass =
    'w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300';

  const placeholderCombo = loadingCombos ? 'Carregando ERP…' : 'Selecione…';

  return (
    <LoadingOverlay loading={loadingCombos} message="Carregando opções do ERP...">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Grupo Produto
        </label>
        {combosOk && grupoOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.grupoProduto, grupoOpts)}
            options={grupoOpts}
            onChange={(v) =>
              setFormCompras((prev) => ({
                ...prev,
                grupoProduto: v ?? '',
                subgrupoProduto: v !== prev.grupoProduto ? '' : prev.subgrupoProduto,
              }))
            }
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar grupo…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.grupoProduto}
            onChange={(e) => setFormCompras({ ...formCompras, grupoProduto: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Subgrupo Produto
        </label>
        {combosOk && subgrupoOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.subgrupoProduto, subgrupoOpts)}
            options={subgrupoOpts}
            onChange={(v) => setFormCompras({ ...formCompras, subgrupoProduto: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar subgrupo…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.subgrupoProduto}
            onChange={(e) => setFormCompras({ ...formCompras, subgrupoProduto: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Código Categoria
        </label>
        {combosOk && catOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.codCategoria, catOpts)}
            options={catOpts}
            onChange={(v) =>
              setFormCompras((prev) => ({
                ...prev,
                codCategoria: v ?? '',
                codSubcategoria: v !== prev.codCategoria ? '' : prev.codSubcategoria,
              }))
            }
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar categoria…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.codCategoria}
            onChange={(e) => setFormCompras({ ...formCompras, codCategoria: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Código Subcategoria
        </label>
        {combosOk && subcatOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.codSubcategoria, subcatOpts)}
            options={subcatOpts}
            onChange={(v) => setFormCompras({ ...formCompras, codSubcategoria: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar subcategoria…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.codSubcategoria}
            onChange={(e) => setFormCompras({ ...formCompras, codSubcategoria: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Tipo de Produto
        </label>
        {combosOk && tipoOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.tipoProduto, tipoOpts)}
            options={tipoOpts}
            onChange={(v) => setFormCompras({ ...formCompras, tipoProduto: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar tipo…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.tipoProduto}
            onChange={(e) => setFormCompras({ ...formCompras, tipoProduto: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Grade
        </label>
        {combosOk && gradeOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.grade, gradeOpts)}
            options={gradeOpts}
            onChange={(v) => setFormCompras({ ...formCompras, grade: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar grade…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.grade}
            onChange={(e) => setFormCompras({ ...formCompras, grade: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Linha
        </label>
        {combosOk && linhaOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.linha, linhaOpts)}
            options={linhaOpts}
            onChange={(v) =>
              setFormCompras((prev) => ({
                ...prev,
                linha: v ?? '',
                subgrupoProduto: (v ?? '') !== prev.linha ? '' : prev.subgrupoProduto,
              }))
            }
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar linha…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.linha}
            onChange={(e) => setFormCompras({ ...formCompras, linha: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Griffe
        </label>
        {combosOk && griffeOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.griffe, griffeOpts)}
            options={griffeOpts}
            onChange={(v) => setFormCompras({ ...formCompras, griffe: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar griffe…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.griffe}
            onChange={(e) => setFormCompras({ ...formCompras, griffe: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Coleção
        </label>
        {combosOk && colecaoOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.colecao, colecaoOpts)}
            options={colecaoOpts}
            onChange={(v) => setFormCompras({ ...formCompras, colecao: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar coleção…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.colecao}
            onChange={(e) => setFormCompras({ ...formCompras, colecao: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Unidade
        </label>
        {combosOk && unidadeOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.unidade, unidadeOpts)}
            options={unidadeOpts}
            onChange={(v) => setFormCompras({ ...formCompras, unidade: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar unidade…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.unidade}
            onChange={(e) => setFormCompras({ ...formCompras, unidade: e.target.value })}
            disabled={disabled}
            placeholder="Digite o código da unidade"
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Tipo Status Produto
        </label>
        <input
          type="text"
          value={formCompras.tipoStatusProduto}
          onChange={(e) => setFormCompras({ ...formCompras, tipoStatusProduto: e.target.value })}
          disabled={disabled}
          className={inputClass}
          style={{ fontFamily: 'Outfit, sans-serif' }}
        />
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Sexo Tipo
        </label>
        <input
          type="text"
          value={formCompras.sexoTipo}
          onChange={(e) => setFormCompras({ ...formCompras, sexoTipo: e.target.value })}
          disabled={disabled}
          className={inputClass}
          style={{ fontFamily: 'Outfit, sans-serif' }}
        />
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Tipo Item SPED
        </label>
        {tipoItemSpedOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.tipoItemSped, tipoItemSpedOpts)}
            options={tipoItemSpedOpts}
            onChange={(v) => setFormCompras({ ...formCompras, tipoItemSped: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar por código ou descrição…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.tipoItemSped}
            onChange={(e) => setFormCompras({ ...formCompras, tipoItemSped: e.target.value })}
            placeholder={loadingCombos ? 'Carregando tipos do ERP…' : 'Código do tipo item SPED'}
            disabled={disabled || loadingCombos}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
        {tipoItemSpedOpts.length > 0 && (
          <p className="text-white/50 text-xs mt-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
            O código é gravado no banco; busque por código ou descrição.
          </p>
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Indicador CFOP
        </label>
        {combosOk && indicadorCfopOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.indicadorCfop, indicadorCfopOpts)}
            options={indicadorCfopOpts}
            onChange={(v) => setFormCompras({ ...formCompras, indicadorCfop: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar indicador…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            inputMode="numeric"
            value={formCompras.indicadorCfop}
            onChange={(e) => setFormCompras({ ...formCompras, indicadorCfop: e.target.value })}
            disabled={disabled}
            placeholder="Código numérico (ex.: 10)"
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
        <p className="text-white/45 text-xs mt-1.5" style={{ fontFamily: 'Outfit, sans-serif' }}>
          O ERP grava o indicador como número (0–255), não o CFOP fiscal em texto.
        </p>
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Período PCP
        </label>
        {combosOk && pcpOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.periodoPcp, pcpOpts)}
            options={pcpOpts}
            onChange={(v) => setFormCompras({ ...formCompras, periodoPcp: v ?? '' })}
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar período…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.periodoPcp}
            onChange={(e) => setFormCompras({ ...formCompras, periodoPcp: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Rede Lojas
        </label>
        {combosOk && redeOpts.length > 0 ? (
          <Combobox
            value={comboboxValueFromStored(formCompras.redeLojas, redeOpts)}
            options={redeOpts}
            onChange={(v) =>
              setFormCompras((prev) => ({
                ...prev,
                redeLojas: v ?? '',
                subgrupoProduto: (v ?? '') !== prev.redeLojas ? '' : prev.subgrupoProduto,
              }))
            }
            placeholder={placeholderCombo}
            searchPlaceholder="Buscar rede…"
            disabled={disabled || loadingCombos}
            buttonClassName={comboBtn}
            className="bg-white/10 backdrop-blur-xl border-white/20"
          />
        ) : (
          <input
            type="text"
            value={formCompras.redeLojas}
            onChange={(e) => setFormCompras({ ...formCompras, redeLojas: e.target.value })}
            disabled={disabled}
            className={inputClass}
            style={{ fontFamily: 'Outfit, sans-serif' }}
          />
        )}
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Código Produto Solução
        </label>
        <input
          type="text"
          value={formCompras.codProdutoSolucao}
          onChange={(e) => setFormCompras({ ...formCompras, codProdutoSolucao: e.target.value })}
          disabled={disabled}
          className={inputClass}
          style={{ fontFamily: 'Outfit, sans-serif' }}
        />
      </div>

      <div>
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Código Produto Segmento
        </label>
        <input
          type="text"
          value={formCompras.codProdutoSegmento}
          onChange={(e) => setFormCompras({ ...formCompras, codProdutoSegmento: e.target.value })}
          disabled={disabled}
          className={inputClass}
          style={{ fontFamily: 'Outfit, sans-serif' }}
        />
      </div>

      <div className="md:col-span-2">
        <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
          Observações Compras
        </label>
        <textarea
          value={formCompras.obsCompras}
          onChange={(e) => setFormCompras({ ...formCompras, obsCompras: e.target.value })}
          rows={3}
          disabled={disabled}
          className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300 resize-none"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        />
      </div>

      <div className="md:col-span-2 rounded-lg border border-white/20 bg-white/5 px-4 py-4 space-y-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <p className="text-white/90 font-medium text-sm">Contas contábeis (ERP)</p>
        <p className="text-white/55 text-xs -mt-2">
          Lista carregada do ERP (contas contábeis). Se a lista não carregar, use os campos de texto abaixo.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
              Conta contábil (estoque)
            </label>
            {combosOk && contaEstoqueOpts.length > 0 ? (
              <Combobox
                value={comboboxValueFromStored(formCompras.contaContabil, contaEstoqueOpts)}
                options={contaEstoqueOpts}
                onChange={(v) => setFormCompras({ ...formCompras, contaContabil: v ?? '' })}
                placeholder={placeholderCombo}
                searchPlaceholder="Buscar conta…"
                disabled={disabled || loadingCombos}
                buttonClassName={comboBtn}
                className="bg-white/10 backdrop-blur-xl border-white/20"
                commandClassName="max-h-[min(320px,50vh)]"
              />
            ) : (
              <input
                type="text"
                value={formCompras.contaContabil}
                onChange={(e) => setFormCompras({ ...formCompras, contaContabil: e.target.value })}
                disabled={disabled}
                className={inputClass}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            )}
          </div>
          <div>
            <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
              Conta contábil (compra)
            </label>
            {combosOk && contaCompraOpts.length > 0 ? (
              <Combobox
                value={comboboxValueFromStored(formCompras.contaContabilCompra, contaCompraOpts)}
                options={contaCompraOpts}
                onChange={(v) => setFormCompras({ ...formCompras, contaContabilCompra: v ?? '' })}
                placeholder={placeholderCombo}
                searchPlaceholder="Buscar conta…"
                disabled={disabled || loadingCombos}
                buttonClassName={comboBtn}
                className="bg-white/10 backdrop-blur-xl border-white/20"
                commandClassName="max-h-[min(320px,50vh)]"
              />
            ) : (
              <input
                type="text"
                value={formCompras.contaContabilCompra}
                onChange={(e) => setFormCompras({ ...formCompras, contaContabilCompra: e.target.value })}
                disabled={disabled}
                className={inputClass}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            )}
          </div>
          <div>
            <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
              Conta contábil (venda)
            </label>
            {combosOk && contaVendaOpts.length > 0 ? (
              <Combobox
                value={comboboxValueFromStored(formCompras.contaContabilVenda, contaVendaOpts)}
                options={contaVendaOpts}
                onChange={(v) => setFormCompras({ ...formCompras, contaContabilVenda: v ?? '' })}
                placeholder={placeholderCombo}
                searchPlaceholder="Buscar conta…"
                disabled={disabled || loadingCombos}
                buttonClassName={comboBtn}
                className="bg-white/10 backdrop-blur-xl border-white/20"
                commandClassName="max-h-[min(320px,50vh)]"
              />
            ) : (
              <input
                type="text"
                value={formCompras.contaContabilVenda}
                onChange={(e) => setFormCompras({ ...formCompras, contaContabilVenda: e.target.value })}
                disabled={disabled}
                className={inputClass}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            )}
          </div>
          <div>
            <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
              Conta contábil (devolução compra)
            </label>
            {combosOk && contaDevCompraOpts.length > 0 ? (
              <Combobox
                value={comboboxValueFromStored(formCompras.contaContabilDevCompra, contaDevCompraOpts)}
                options={contaDevCompraOpts}
                onChange={(v) => setFormCompras({ ...formCompras, contaContabilDevCompra: v ?? '' })}
                placeholder={placeholderCombo}
                searchPlaceholder="Buscar conta…"
                disabled={disabled || loadingCombos}
                buttonClassName={comboBtn}
                className="bg-white/10 backdrop-blur-xl border-white/20"
                commandClassName="max-h-[min(320px,50vh)]"
              />
            ) : (
              <input
                type="text"
                value={formCompras.contaContabilDevCompra}
                onChange={(e) => setFormCompras({ ...formCompras, contaContabilDevCompra: e.target.value })}
                disabled={disabled}
                className={inputClass}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            )}
          </div>
          <div>
            <label className="block text-white/90 mb-2 text-sm" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
              Conta contábil (devolução venda)
            </label>
            {combosOk && contaDevVendaOpts.length > 0 ? (
              <Combobox
                value={comboboxValueFromStored(formCompras.contaContabilDevVenda, contaDevVendaOpts)}
                options={contaDevVendaOpts}
                onChange={(v) => setFormCompras({ ...formCompras, contaContabilDevVenda: v ?? '' })}
                placeholder={placeholderCombo}
                searchPlaceholder="Buscar conta…"
                disabled={disabled || loadingCombos}
                buttonClassName={comboBtn}
                className="bg-white/10 backdrop-blur-xl border-white/20"
                commandClassName="max-h-[min(320px,50vh)]"
              />
            ) : (
              <input
                type="text"
                value={formCompras.contaContabilDevVenda}
                onChange={(e) => setFormCompras({ ...formCompras, contaContabilDevVenda: e.target.value })}
                disabled={disabled}
                className={inputClass}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
    </LoadingOverlay>
  );
}
