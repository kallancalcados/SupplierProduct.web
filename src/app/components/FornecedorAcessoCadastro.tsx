import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Layout } from './Layout';
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  ApiError,
  criarAcessoFornecedor,
  getFornecedorByCgcCpf,
  type FornecedorData,
} from '../lib/supplier-api';

export function FornecedorAcessoCadastro() {
  const navigate = useNavigate();
  const location = useLocation();
  const cgcCpf = location.state?.cgcCpf as string | undefined;
  const perfilAprovadoFiscalFromState = Boolean(location.state?.perfilAprovadoFiscal);

  const [fornecedorData, setFornecedorData] = useState<FornecedorData | null>(
    location.state?.fornecedorData ?? null,
  );

  const [isLoadingFornecedor, setIsLoadingFornecedor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    login: '',
    senha: '',
    confirmarSenha: '',
  });

  useEffect(() => {
    if (!cgcCpf) {
      navigate('/fornecedor/cnpj');
      return;
    }

    if (fornecedorData) {
      return;
    }

    const loadFornecedor = async () => {
      setIsLoadingFornecedor(true);
      try {
        const data = await getFornecedorByCgcCpf(cgcCpf);
        setFornecedorData(data);
      } catch (error) {
        toast.error('Não foi possível carregar os dados do fornecedor.', {
          description: error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        });
      } finally {
        setIsLoadingFornecedor(false);
      }
    };

    void loadFornecedor();
  }, [cgcCpf, fornecedorData, navigate]);

  const perfilAprovadoFiscal = perfilAprovadoFiscalFromState || Boolean(cgcCpf && fornecedorData);

  const handleSubmit = async () => {
    if (!cgcCpf) return;

    if (!formData.login || !formData.senha || !formData.confirmarSenha) {
      toast.error('Campos obrigatórios', { description: 'Preencha login e senha.' });
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      toast.error('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await criarAcessoFornecedor({
        cgcCpf,
        login: formData.login,
        senha: formData.senha,
      });

      if (!response.sucesso) {
        // Se já existir acesso, seguimos para o login normal.
        toast.info('Acesso já existente', { description: response.mensagem || 'Redirecionando para login...' });
        navigate('/fornecedor/login', { state: { cgcCpf, fornecedorData } });
        return;
      }

      toast.success('Acesso criado com sucesso!', {
        description: 'Agora faça login para acessar o portal.',
      });

      setTimeout(() => {
        navigate('/fornecedor/login', {
          state: { cgcCpf, fornecedorData },
        });
      }, 1200);
    } catch (error) {
      toast.error('Não foi possível criar o acesso', {
        description:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Tente novamente em instantes.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-2xl">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border-2 border-white/20 shadow-2xl animate-[fadeIn_0.6s_ease-out]">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Criar acesso
            </h1>
            <div className="w-24 h-1 bg-white/40 mx-auto rounded-full mb-8"></div>

            {perfilAprovadoFiscal && (
              <div className="bg-emerald-500/15 backdrop-blur-sm rounded-xl p-5 border border-emerald-300/30 mb-6 text-left">
                <p className="text-emerald-100 text-base" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                  Perfil aprovado pela equipe fiscal.
                </p>
                <p className="text-emerald-100/80 text-sm mt-1" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                  Crie seu login e senha para acessar o portal.
                </p>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
              <p className="text-white/70 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                Empresa
              </p>
              <p className="text-white text-2xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {isLoadingFornecedor ? 'Carregando...' : fornecedorData?.nomeFornecedor || 'Fornecedor'}
              </p>
              <p className="text-white/60 text-sm mt-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                CNPJ/CPF: {cgcCpf}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-white/90 text-lg mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                Login
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.login}
                  onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                  placeholder="Crie seu login"
                  disabled={isSubmitting}
                  className="w-full px-5 py-4 pr-12 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white text-lg placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                />
                <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-lg mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  placeholder="Crie sua senha"
                  disabled={isSubmitting}
                  className="w-full px-5 py-4 pr-14 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white text-lg placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-lg mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmarSenha}
                  onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                  placeholder="Repita sua senha"
                  disabled={isSubmitting}
                  className="w-full px-5 py-4 pr-14 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white text-lg placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-white text-[#ca0404] py-5 px-8 rounded-xl text-xl font-semibold hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-8"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {isSubmitting ? 'Salvando...' : 'Criar acesso'}
            </button>

            <button
              onClick={() => navigate('/fornecedor/cnpj')}
              className="w-full flex items-center justify-center text-white/80 hover:text-white text-lg transition-colors duration-300 py-4 mt-4"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

