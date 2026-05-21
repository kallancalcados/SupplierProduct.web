import { useNavigate } from 'react-router';
import { Layout } from './Layout';
import { Building2, UserCircle } from 'lucide-react';
import { ImageWithFallback } from './ui/image-with-fallback';
import { kallanMarkSrc } from './kallan-mark';

export function Home() {
  const navigate = useNavigate();

  return (
    <Layout showLogo={false}>
      <div className="w-full max-w-5xl animate-[fadeIn_0.6s_ease-out]">
        {/* Logo and Title */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-8">
            <ImageWithFallback
              src={kallanMarkSrc}
              alt="Kallan"
              className="w-24 h-24 drop-shadow-2xl animate-[fadeIn_1s_ease-out]"
            />
          </div>
          <h1 className="text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Portal Kallan
          </h1>
          <p className="text-2xl text-white/90" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
            Cadastro de Produtos
          </p>
        </div>

        {/* Choice Cards */}
        <div className="text-center mb-12">
          <h2 className="text-3xl text-white/95 mb-2" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 500 }}>
            Escolha seu tipo de acesso
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Fornecedor Card */}
          <button
            onClick={() => navigate('/fornecedor/cnpj')}
            className="group relative bg-white/10 backdrop-blur-md rounded-2xl p-12 border-2 border-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 hover:bg-white/15 overflow-hidden"
          >
            {/* Card glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 group-hover:bg-white/30 transition-all duration-300">
                  <Building2 className="w-16 h-16 text-white" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Fornecedor
              </h3>
              <p className="text-lg text-white/80 mb-6" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                Acesse a área de cadastro de produtos para fornecedores
              </p>
              <div className="inline-flex items-center text-white font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Acessar área
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Colaborador Card */}
          <button
            onClick={() => navigate('/colaborador/login')}
            className="group relative bg-white/10 backdrop-blur-md rounded-2xl p-12 border-2 border-white/20 hover:border-white/40 transition-all duration-500 hover:scale-105 hover:bg-white/15 overflow-hidden"
          >
            {/* Card glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative z-10">
              <div className="flex justify-center mb-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 group-hover:bg-white/30 transition-all duration-300">
                  <UserCircle className="w-16 h-16 text-white" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                Colaborador
              </h3>
              <p className="text-lg text-white/80 mb-6" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 300 }}>
                Acesse com suas credenciais de colaborador interno
              </p>
              <div className="inline-flex items-center text-white font-medium" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Acessar área
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </div>
    </Layout>
  );
}
