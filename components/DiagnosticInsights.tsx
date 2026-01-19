
import React from 'react';
import type { SummaryData } from '../types';
import { formatPercent } from '../utils/formatter';

export const DiagnosticInsights: React.FC<{ data: SummaryData }> = ({ data }) => {
    const { concordance, specimenYield, totals } = data;

    const funnelSteps = [
        { label: 'Total Episodes Reported', value: concordance.totalEpisodes, color: 'bg-slate-800' },
        { label: 'RT-PCR Positive', value: data.pcrTotals.totalPositive, color: 'bg-emerald-600' },
        { label: 'Culture Confirmed', value: totals.after1stDoseCulturePositive + totals.after2ndDoseCulturePositive + totals.after30Days2ndDoseCulturePositive, color: 'bg-rose-600' }
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            {/* Clinical Diagnostic Funnel */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-lg">Clinical Diagnostic Funnel</h3>
                </div>
                <div className="space-y-6">
                    {funnelSteps.map((step, i) => {
                        const width = (step.value / funnelSteps[0].value) * 100;
                        return (
                            <div key={step.label} className="relative">
                                <div className="flex justify-between items-end mb-1.5 px-1">
                                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{step.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-900">{step.value} Cases</span>
                                        {i > 0 && (
                                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                {formatPercent(step.value, funnelSteps[0].value)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="h-10 w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                    <div 
                                        className={`h-full ${step.color} transition-all duration-1000 shadow-inner`}
                                        style={{ width: `${width}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 font-bold leading-relaxed">
                    💡 <span className="uppercase tracking-tighter">Data Insight:</span> PCR detected {formatPercent(data.pcrTotals.totalPositive, funnelSteps[0].value)} of reported episodes, providing a {((data.pcrTotals.totalPositive / (totals.after1stDoseCulturePositive + totals.after2ndDoseCulturePositive + totals.after30Days2ndDoseCulturePositive || 1)) - 1).toFixed(1)}x diagnostic enhancement over culture alone.
                </div>
            </div>

            {/* Pathogen Concordance & Specimen Yield */}
            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 text-white">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 border-b border-slate-800 pb-4">Concordance Matrix</h3>
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">CULT+ / PCR+</p>
                        <p className="text-2xl font-black">{concordance.culturePosPcrPos}</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <p className="text-[9px] font-black text-amber-400 uppercase mb-1">CULT- / PCR+</p>
                        <p className="text-2xl font-black">{concordance.cultureNegPcrPos}</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <p className="text-[9px] font-black text-rose-400 uppercase mb-1">CULT+ / PCR-</p>
                        <p className="text-2xl font-black">{concordance.culturePosPcrNeg}</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">BOTH NEG</p>
                        <p className="text-2xl font-black text-slate-400">{concordance.bothNegative}</p>
                    </div>
                </div>

                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Specimen Performance</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-300">Stool Culture Yield</span>
                        </div>
                        <span className="text-xs font-black">{formatPercent(specimenYield.stool.culturePos, specimenYield.stool.count)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-300">Swab Culture Yield</span>
                        </div>
                        <span className="text-xs font-black">{formatPercent(specimenYield.swab.culturePos, specimenYield.swab.count)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
