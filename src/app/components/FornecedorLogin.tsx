import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Layout } from './Layout';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { saveAuthSession } from '../lib/auth-storage';
import { ApiError, getFornecedorByCgcCpf, loginFornecedor, type FornecedorData } from '../lib/supplier-api';

export function FornecedorLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const cgcCpf = location.state?.cgcCpf as string | undefined;
  const [fornecedorData, setFornecedorData] = useState<FornecedorData | null>(
    location.state?.fornecedorData ?? null,
  );

  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingFornecedor, setIsLoadingFornecedor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  useEffect(() => {
    if (fornecedorData || !cgcCpf) {
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
  }, [fornecedorData, cgcCpf]);

  const handleLogin = async () => {
    if (!formData.username || !formData.password) {
      toast.error('Erro ao fazer login', {
        description: 'Verifique suas credenciais.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await loginFornecedor({
        login: formData.username,
        senha: formData.password,
      });

      saveAuthSession(session);

      toast.success('Login realizado com sucesso!', {
        description: 'Redirecionando para o dashboard...',
      });

      setTimeout(() => {
        navigate('/fornecedor/dashboard');
      }, 1500);
    } catch (error) {
      toast.error('Erro ao fazer login', {
        description:
          error instanceof ApiError || error instanceof Error
            ? error.message
            : 'Verifique suas credenciais.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.username && formData.password;

  return (
    <Layout>
      <div className="w-full max-w-2xl">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border-2 border-white/20 shadow-2xl animate-[fadeIn_0.6s_ease-out]">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Login Fornecedor
            </h1>
            <div className="w-24 h-1 bg-white/40 mx-auto rounded-full mb-8"></div>

            {/* Company Info */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
              <p className="text-white/70 text-sm mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                Empresa
              </p>
              <p className="text-white text-2xl font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {isLoadingFornecedor ? 'Carregando...' : fornecedorData?.nomeFornecedor || 'Nome da Empresa'}
              </p>
              <p className="text-white/60 text-sm mt-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                Código: {fornecedorData?.codigoFornecedor || 'N/A'}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label className="block text-white/90 text-lg mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                Usuário
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Digite seu usuário"
                onKeyPress={(e) => e.key === 'Enter' && isFormValid && handleLogin()}
                disabled={isSubmitting}
                className="w-full px-5 py-4 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white text-lg placeholder-white/40 focus:outline-none focus:border-white/60 focus:bg-white/25 transition-all duration-300"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              />
            </div>

            <div>
              <label className="block text-white/90 text-lg mb-3" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 400 }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Digite sua senha"
                  onKeyPress={(e) => e.key === 'Enter' && isFormValid && handleLogin()}
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

            <button
              onClick={handleLogin}
              disabled={!isFormValid || isSubmitting}
              className="w-full bg-white text-[#ca0404] py-5 px-8 rounded-xl text-xl font-semibold hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-8"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center mt-6">
              <button
                className="text-white/80 hover:text-white text-base transition-colors duration-300"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
              >
                Esqueceu a senha?
              </button>
            </div>

            <button
              onClick={() => navigate('/fornecedor/cnpj')}
              className="w-full flex items-center justify-center text-white/80 hover:text-white text-lg transition-colors duration-300 py-4 mt-4"
              style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar para consulta CNPJ
            </button>

            {cgcCpf && (
              <button
                onClick={() =>
                  navigate('/fornecedor/acesso', {
                    state: {
                      cgcCpf,
                      fornecedorData,
                    },
                  })
                }
                className="w-full text-white/80 hover:text-white text-base transition-colors duration-300 py-2"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}
              >
                Primeiro acesso? Criar login e senha
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
