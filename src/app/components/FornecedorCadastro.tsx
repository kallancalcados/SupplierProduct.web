import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Layout } from './Layout';
import { ArrowLeft, Building2, FileText, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { CepError, pesquisacep } from '../lib/viacep';
import {
  sanitizeDocument,
  criarPreCadastroFornecedor,
  listarErpMunicipios,
  listarErpPaises,
  type ComboErp,
  type FornecedorPreCadastroPayload,
} from '../lib/supplier-api';
import { Combobox, type ComboboxOption } from './ui/combobox';

interface FornecedorFormData {
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
  obsFornecedor: string;
}

export function FornecedorCadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const cnpjFromState = location.state?.cnpj || '';

  const [loadingCombos, setLoadingCombos] = useState(false);
  const [combosDisponiveis, setCombosDisponiveis] = useState(false);
  const [municipiosOptions, setMunicipiosOptions] = useState<ComboboxOption[]>([]);
  const [paisesOptions, setPaisesOptions] = useState<ComboboxOption[]>([]);

  const [formData, setFormData] = useState<FornecedorFormData>({
    nomeCliFor: '',
    razaoSocial: '',
    cgcCpf: cnpjFromState,
    pjPf: 0,
    rgIe: '',
    cep: '',
    endereco: '',
    cidade: '',
    bairro: '',
    uf: '',
    pais: 'Brasil',
    ddi: '+55',
    ddd1: '',
    ddd2: '',
    email: '',
    numero: '',
    complemento: '',
    obsFornecedor: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const cepNumbers = useMemo(() => formData.cep.replace(/\D/g, ''), [formData.cep]);

  const canLookupCep = useMemo(() => cepNumbers.length === 8, [cepNumbers.length]);

  const comboErpToOptions = (items: ComboErp[]): ComboboxOption[] =>
    (items ?? [])
      .filter((x) => (x?.codigo ?? '').toString().trim().length > 0)
      .map((x) => ({
        value: String(x.codigo),
        label: x.descricao?.toString() ?? String(x.codigo),
      }));

  useEffect(() => {
    const loadCombos = async () => {
      setLoadingCombos(true);
      try {
        const [municipios, paises] = await Promise.all([listarErpMunicipios(null), listarErpPaises()]);
        setMunicipiosOptions(comboErpToOptions(municipios));
        setPaisesOptions(comboErpToOptions(paises));
        setCombosDisponiveis(true);
      } catch {
        setCombosDisponiveis(false);
      } finally {
        setLoadingCombos(false);
      }
    };

    void loadCombos();
  }, []);

  useEffect(() => {
    if (!canLookupCep) {
      return;
    }

    let isCancelled = false;

    const lookupCep = async () => {
      setIsCepLoading(true);

      try {
        const result = await pesquisacep(cepNumbers);

        if (isCancelled || !result) {
          return;
        }

        setFormData((current) => ({
          ...current,
          endereco: result.endereco || current.endereco,
          bairro: result.bairro || current.bairro,
          cidade: result.cidade || current.cidade,
          uf: result.estado || current.uf,
          pais: current.pais || 'Brasil',
        }));
      } catch (error) {
        if (!isCancelled) {
          toast.error('Não foi possível consultar o CEP.', {
            description:
              error instanceof CepError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : 'Tente novamente em instantes.',
          });
        }
      } finally {
        if (!isCancelled) {
          setIsCepLoading(false);
        }
      }
    };

    void lookupCep();

    return () => {
      isCancelled = true;
    };
  }, [canLookupCep, cepNumbers]);

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 8) {
      return numbers.replace(/^(\d{5})(\d)/, '$1-$2');
    }
    return value;
  };

  const handleChange = (field: keyof FornecedorFormData, value: string | number | boolean | null) => {
    if (field === 'cep' && typeof value === 'string') {
      setFormData({ ...formData, [field]: formatCEP(value) });
    } else if (field === 'uf' && typeof value === 'string') {
      setFormData({ ...formData, [field]: value.toUpperCase().trim() });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSubmit = async () => {
    const documento = sanitizeDocument(formData.cgcCpf);
    const nomeCliForTrim = formData.nomeCliFor.trim();
    const razaoSocialTrim = formData.razaoSocial.trim();
    const emailTrim = formData.email.trim();

    if (!documento || (documento.length !== 11 && documento.length !== 14)) {
      toast.error('CNPJ/CPF inválido.', { description: 'Volte e informe um documento válido.' });
      return;
    }

    if (!razaoSocialTrim.length || !nomeCliForTrim.length) {
      toast.error('Preencha os campos obrigatórios.', {
        description: 'Razão Social e Nome Fantasia são obrigatórios.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: FornecedorPreCadastroPayload = {
        nomeCliFor: nomeCliForTrim,
        razaoSocial: razaoSocialTrim,
        cgcCpf: documento,
        pjPf: formData.pjPf,
        rgIe: formData.rgIe.trim().length ? formData.rgIe.trim() : null,
        cep: formData.cep.trim().length ? formData.cep.trim() : null,
        endereco: formData.endereco.trim().length ? formData.endereco.trim() : null,
        cidade: formData.cidade.trim().length ? formData.cidade.trim() : null,
        bairro: formData.bairro.trim().length ? formData.bairro.trim() : null,
        uf: formData.uf.trim().length ? formData.uf.trim().toUpperCase() : null,
        pais: formData.pais.trim().length ? formData.pais.trim() : null,
        ddi: formData.ddi.trim().length ? formData.ddi.trim() : null,
        ddd1: formData.ddd1.trim().length ? formData.ddd1.trim() : null,
        ddd2: formData.ddd2.trim().length ? formData.ddd2.trim() : null,
        email: emailTrim.length ? emailTrim : null,
        numero: formData.numero.trim().length ? formData.numero.trim() : null,
        complemento: formData.complemento.trim().length ? formData.complemento.trim() : null,
        obsFornecedor: formData.obsFornecedor.trim().length ? formData.obsFornecedor.trim() : null,
      };

      await criarPreCadastroFornecedor(payload);

      toast.success('Pré-cadastro enviado com sucesso!', {
        description: 'Seu cadastro foi encaminhado para análise fiscal. Você será contatado se necessário.',
      });

      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (error) {
      toast.error('Erro ao enviar pré-cadastro', {
        description: error instanceof Error ? error.message : 'Tente novamente em instantes.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    sanitizeDocument(formData.cgcCpf).length > 0 &&
    formData.razaoSocial.trim().length > 0 &&
    formData.nomeCliFor.trim().length > 0;

  return (
    <Layout>
      <div className="w-full max-w-6xl py-8">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border-2 border-white/20 shadow-2xl animate-[fadeIn_0.6s_ease-out]">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Cadastro de Fornecedor
            </h1>
            <div className="w-24 h-1 bg-white/40 mx-auto rounded-full mb-6"></div>
            <p className="text-white/80 text-lg" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
              CNPJ não encontrado. Preencha os dados para continuar
            </p>
          </div>

          {/* Form */}
          <div className="space-y-8">
            {/* Dados Básicos */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Dados Básicos
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    CNPJ/CPF
                  </label>
                  <input
                    type="text"
                    value={formData.cgcCpf}
                    disabled
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white/60 cursor-not-allowed"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Tipo *
                  </label>
                  <select
                    value={formData.pjPf}
                    onChange={(e) => handleChange('pjPf', Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  >
                    <option value={0} className="bg-[#ca0404] text-white">Pessoa Jurídica</option>
                    <option value={1} className="bg-[#ca0404] text-white">Pessoa Física</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Razão Social *
                  </label>
                  <input
                    type="text"
                    value={formData.razaoSocial}
                    onChange={(e) => handleChange('razaoSocial', e.target.value)}
                    placeholder="Digite a razão social"
                    maxLength={150}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    value={formData.nomeCliFor}
                    onChange={(e) => handleChange('nomeCliFor', e.target.value)}
                    placeholder="Digite o nome fantasia"
                    maxLength={25}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    RG/IE
                  </label>
                  <input
                    type="text"
                    value={formData.rgIe}
                    onChange={(e) => handleChange('rgIe', e.target.value)}
                    placeholder="Digite RG ou Inscrição Estadual"
                    maxLength={30}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Endereço
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    CEP
                  </label>
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={(e) => handleChange('cep', e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                  <p className="text-white/60 text-sm mt-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    {isCepLoading ? 'Consultando CEP...' : 'Ao preencher o CEP, cidade/UF são validados automaticamente.'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => handleChange('endereco', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                    maxLength={150}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => handleChange('numero', e.target.value)}
                    placeholder="Nº"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.complemento}
                    onChange={(e) => handleChange('complemento', e.target.value)}
                    placeholder="Apto, Sala, Bloco, etc."
                    maxLength={100}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.bairro}
                    onChange={(e) => handleChange('bairro', e.target.value)}
                    placeholder="Bairro"
                    maxLength={100}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Município / Cidade
                  </label>
                  {combosDisponiveis && municipiosOptions.length > 0 ? (
                    <Combobox
                      value={null}
                      options={municipiosOptions}
                      onChange={(val) => {
                        if (!val) return;
                        const selected = municipiosOptions.find((o) => o.value === val) ?? null;
                        const label = selected?.label ?? '';
                        handleChange('cidade', label);
                        // Muitos ERPs devolvem algo como "SÃO PAULO - SP". Se vier assim, sincroniza UF automaticamente.
                        const ufMatch = label.match(/-\s*([A-Z]{2})\s*$/i);
                        if (ufMatch?.[1]) {
                          handleChange('uf', ufMatch[1].toUpperCase());
                        }
                      }}
                      placeholder={loadingCombos ? 'Carregando...' : 'Selecione o município'}
                      searchPlaceholder="Buscar município..."
                      disabled={loadingCombos}
                      buttonClassName="px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white hover:bg-white/25 focus-visible:ring-white/30 disabled:opacity-60"
                      className="bg-white/10 backdrop-blur-xl border-white/20"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => handleChange('cidade', e.target.value)}
                      placeholder="Cidade"
                      maxLength={100}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  )}
                  <p className="text-white/50 text-xs mt-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    Selecionado: {formData.cidade || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    UF
                  </label>
                  <input
                    type="text"
                    value={formData.uf}
                    onChange={(e) => handleChange('uf', e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300 uppercase"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    País
                  </label>
                  {combosDisponiveis && paisesOptions.length > 0 ? (
                    <Combobox
                      value={null}
                      options={paisesOptions}
                      onChange={(val) => {
                        if (!val) return;
                        const selected = paisesOptions.find((o) => o.value === val) ?? null;
                        handleChange('pais', selected?.label ?? '');
                      }}
                      placeholder={loadingCombos ? 'Carregando...' : 'Selecione o país'}
                      searchPlaceholder="Buscar país..."
                      disabled={loadingCombos}
                      buttonClassName="px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white hover:bg-white/25 focus-visible:ring-white/30 disabled:opacity-60"
                      className="bg-white/10 backdrop-blur-xl border-white/20"
                    />
                  ) : (
                    <input
                      type="text"
                      value={formData.pais}
                      onChange={(e) => handleChange('pais', e.target.value)}
                      placeholder="País"
                      maxLength={50}
                      className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                      style={{ fontFamily: 'Outfit, sans-serif' }}
                    />
                  )}
                  <p className="text-white/50 text-xs mt-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                    Selecionado: {formData.pais || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <Phone className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Contato
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    DDI
                  </label>
                  <input
                    type="text"
                    value={formData.ddi}
                    onChange={(e) => handleChange('ddi', e.target.value)}
                    placeholder="+55"
                    maxLength={5}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    DDD 1
                  </label>
                  <input
                    type="text"
                    value={formData.ddd1}
                    onChange={(e) => handleChange('ddd1', e.target.value)}
                    placeholder="11"
                    maxLength={3}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    DDD 2
                  </label>
                  <input
                    type="text"
                    value={formData.ddd2}
                    onChange={(e) => handleChange('ddd2', e.target.value)}
                    placeholder="11"
                    maxLength={3}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="exemplo@empresa.com.br"
                    maxLength={150}
                    className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-6 h-6 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Observações
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-white/90 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                    Observações do fornecedor (opcional)
                  </label>
                  <textarea
                    value={formData.obsFornecedor}
                    onChange={(e) => handleChange('obsFornecedor', e.target.value)}
                    placeholder="Ex: informações adicionais, contato preferencial, etc."
                    rows={4}
                  className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300 resize-none"
                    style={{ fontFamily: 'Outfit, sans-serif' }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 pt-4">
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full bg-white text-[#ca0404] py-5 px-8 rounded-xl text-xl font-semibold hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar Pré-cadastro'}
              </button>

              <button
                onClick={() => navigate('/fornecedor/cnpj')}
                className="w-full flex items-center justify-center text-white/80 hover:text-white text-lg transition-colors duration-300 py-4"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Já possui cadastro? Voltar
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
