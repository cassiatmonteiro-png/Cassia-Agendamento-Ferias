import React from 'react';
import { 
  BookOpen, 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  X,
  FileCheck
} from 'lucide-react';

export const CLTGuidelinesModal: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Scale className="w-4 h-4" />
          <span>Manual de Conformidade Trabalhista</span>
        </div>
        <h2 className="text-2xl font-bold">Legislação CLT sobre Férias & Políticas Internas</h2>
        <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
          O sistema de agendamento incorpora rigorosamente todas as regras dos Artigos 130 a 145 do Decreto-Lei nº 5.452/1943 (Consolidação das Leis do Trabalho) atualizado pela Reforma Trabalhista (Lei nº 13.467/2017), bem como as diretrizes de continuidade operacional da empresa.
        </p>
      </div>

      {/* Grid of Legal & Operational Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Card 1: Fracionamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm">
            <Calendar className="w-4 h-4" />
            <span>Art. 134, § 1º: Fracionamento</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Desde que haja concordância do empregado, as férias podem ser usufruídas em até <strong>3 (três) períodos</strong>, sendo que:
          </p>
          <ul className="text-xs space-y-1.5 text-slate-700 list-disc list-inside bg-slate-50 p-3 rounded-xl border border-slate-100">
            <li><strong>Fração principal:</strong> Não pode ser inferior a <strong>14 dias corridos</strong>.</li>
            <li><strong>Demais frações:</strong> Nenhuma delas pode ser inferior a <strong>5 dias corridos</strong>.</li>
            <li>Períodos de 1 a 4 dias são <strong>proibidos por lei</strong>.</li>
          </ul>
        </div>

        {/* Card 2: Vedação de Início */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-amber-700 font-bold text-sm">
            <Clock className="w-4 h-4" />
            <span>Art. 134, § 3º: Vedação de Início</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            É terminantemente vedado o início das férias no período de <strong>dois dias que antecede feriado ou dia de repouso semanal remunerado (DSR)</strong>:
          </p>
          <ul className="text-xs space-y-1.5 text-slate-700 list-disc list-inside bg-amber-50/70 p-3 rounded-xl border border-amber-100">
            <li><strong>Sexta-feira:</strong> Proibido (antecede 2 dias ao domingo).</li>
            <li><strong>Sábado:</strong> Proibido (antecede 1 dia ao domingo).</li>
            <li><strong>Feriados Nacionais:</strong> Proibido iniciar no próprio dia, na véspera ou antevéspera.</li>
          </ul>
        </div>

        {/* Card 3: Política Departamental de 7 Dias */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl border border-blue-800 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-blue-300 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Política: Sobreposição Departamental</span>
          </div>
          <p className="text-xs text-blue-100 leading-relaxed">
            Regra corporativa de garantia de cobertura das equipes:
          </p>
          <ul className="text-xs space-y-1.5 text-blue-200 list-disc list-inside bg-white/10 p-3 rounded-xl border border-white/10">
            <li>Não é permitida a ausência simultânea de colaboradores do mesmo departamento.</li>
            <li><strong>Exceção autorizada:</strong> Sobreposição máxima de até <strong>7 dias corridos (1 semana)</strong>.</li>
            <li><strong>Bloqueio:</strong> Se ultrapassar 7 dias, a solicitação é <strong>bloqueada automaticamente</strong> e sugere datas alternativas.</li>
          </ul>
        </div>

        {/* Card 4: Período Aquisitivo e Concessivo */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-blue-700 font-bold text-sm">
            <BookOpen className="w-4 h-4" />
            <span>Art. 130 e 134: Ciclos CLT</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            A cada 12 meses de vigência do contrato de trabalho, o colaborador adquire direito a 30 dias de férias (período aquisitivo).
          </p>
          <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
            <div><strong>Período Aquisitivo:</strong> 12 meses de trabalho inicial.</div>
            <div><strong>Período Concessivo:</strong> 12 meses subsequentes para gozo integral das férias.</div>
          </div>
        </div>

        {/* Card 5: Pagamento em Dobro */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-rose-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Art. 137: Pagamento em Dobro</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Sempre que as férias forem concedidas após o prazo do período concessivo (12 meses após a aquisição), o empregador pagará em dobro a respectiva remuneração.
          </p>
          <div className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
            O sistema emite alertas automáticos 60 dias antes da expiração do prazo concessivo para planejamento tempestivo pelo RH.
          </div>
        </div>

        {/* Card 6: Abono Pecuniário */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm">
            <DollarSign className="w-4 h-4" />
            <span>Art. 143: Abono Pecuniário (1/3)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            É facultado ao empregado converter 1/3 (um terço) do período de férias a que tiver direito em abono pecuniário no valor da remuneração que lhe seria devida nos dias correspondentes (máximo 10 dias).
          </p>
          <div className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
            Exemplo: Gozo de 20 dias de descanso + venda de 10 dias em folha de pagamento.
          </div>
        </div>
      </div>
    </div>
  );
};
