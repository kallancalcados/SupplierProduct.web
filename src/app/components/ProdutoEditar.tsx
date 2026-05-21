import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { getAuthSession } from '../lib/auth-storage';
import { ApiError, obterDetalheProduto, type ProdutoCadastroDetalhe } from '../lib/supplier-api';
import { ProdutoCadastro } from './ProdutoCadastro';

export function ProdutoEditar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const fornecedorData = location.state?.fornecedorData;

  const produtoId = useMemo(() => {
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [id]);

  const [isLoading, setIsLoading] = useState(true);
  const [produto, setProduto] = useState<ProdutoCadastroDetalhe | null>(null);

  useEffect(() => {
    const session = getAuthSession();

    if (!session?.token) {
      navigate('/fornecedor/cnpj');
      return;
    }

    if (!produtoId) {
      navigate('/fornecedor/dashboard', { state: { fornecedorData } });
      return;
    }

    const load = async () => {
      setIsLoading(true);

      try {
        const data = await obterDetalheProduto(session.token, produtoId);

        if (data.statusFluxo !== 1) {
          toast.error('Produto não pode ser editado', {
            description: 'Apenas produtos em Pré-Cadastro podem ser editados pelo fornecedor.',
          });
          navigate('/fornecedor/dashboard', { state: { fornecedorData } });
          return;
        }

        setProduto(data);
      } catch (error) {
        toast.error('Não foi possível carregar o produto.', {
          description: error instanceof ApiError || error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        });
        navigate('/fornecedor/dashboard', { state: { fornecedorData } });
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [fornecedorData, navigate, produtoId]);

  if (isLoading) {
    return <ProdutoCadastro mode="edit" isLoading />;
  }

  if (!produtoId || !produto) {
    return <ProdutoCadastro mode="edit" isLoading />;
  }

  return <ProdutoCadastro mode="edit" fornecedorData={fornecedorData} produtoId={produtoId} produtoDetalhe={produto} />;
}
