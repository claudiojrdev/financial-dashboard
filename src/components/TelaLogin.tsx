import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';
import { IconCalendario } from './icons';

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
}

export function TelaLogin({ onLogin, onRegister }: Props) {
  const [modo, setModo] = useState<'carregando' | 'registro' | 'login'>('carregando');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaConf, setSenhaConf] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.getAuthStatus()
      .then((s) => setModo(s.configurada ? 'login' : 'registro'))
      .catch(() => setModo('login'));
  }, []);

  function resetar() {
    setErro('');
    setEnviando(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setErro('');
    setEnviando(true);

    try {
      const user = username.trim();
      if (user.length < 2) {
        setErro('O usuário deve ter no mínimo 2 caracteres.');
        setEnviando(false);
        return;
      }
      if (senha.length < 4) {
        setErro('A senha deve ter no mínimo 4 caracteres.');
        setEnviando(false);
        return;
      }

      if (modo === 'registro') {
        if (senha !== senhaConf) {
          setErro('As senhas não conferem.');
          setEnviando(false);
          return;
        }
        await onRegister(user, senha);
      } else {
        await onLogin(user, senha);
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="card rounded-2xl p-8">
          <div className="mb-6 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <IconCalendario width={24} height={24} />
            </span>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {modo === 'registro' ? 'Criar Conta' : 'Contas a Pagar'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {modo === 'registro'
                ? 'Crie seu usuário para acessar o dashboard.'
                : 'Digite seu usuário e senha para acessar.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="f-user" className="field-label">Usuário</label>
              <input
                id="f-user"
                type="text"
                className="field-input"
                placeholder="Seu nome de usuário"
                value={username}
                onChange={(e) => { setUsername(e.target.value); resetar(); }}
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="f-senha" className="field-label">Senha</label>
              <input
                id="f-senha"
                type="password"
                className="field-input"
                placeholder="Digite a senha"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); resetar(); }}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
              />
            </div>

            {modo === 'registro' && (
              <div>
                <label htmlFor="f-senha-conf" className="field-label">Confirmar senha</label>
                <input
                  id="f-senha-conf"
                  type="password"
                  className="field-input"
                  placeholder="Repita a senha"
                  value={senhaConf}
                  onChange={(e) => { setSenhaConf(e.target.value); resetar(); }}
                  autoComplete="new-password"
                />
              </div>
            )}

            {erro && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {erro}
              </p>
            )}

            <button type="submit" disabled={enviando} className="btn-primary w-full justify-center py-2.5">
              {enviando
                ? 'Aguarde…'
                : modo === 'registro'
                  ? 'Criar Conta'
                  : 'Entrar'}
            </button>
          </form>

          {modo === 'login' && (
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Ainda não tem conta?{' '}
              <button
                type="button"
                className="font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                onClick={() => { setModo('registro'); resetar(); setUsername(''); setSenha(''); setSenhaConf(''); }}
              >
                Criar conta
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}