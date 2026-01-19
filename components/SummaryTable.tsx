
import React from 'react';
import type { SummaryData } from '../types';
import { formatPercent } from '../utils/formatter';

const bar = (num: number, den: number, color: string) => {
    const pct = den > 0 ? (num / den) * 100 : 0;
    return (
        <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden inline-block align-middle ml-2">
            <div className={`h-full ${color} rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${pct}%` }}></div>
        </div>
    );
};

export const SummaryTable: React.FC<{ data: SummaryData }> = ({ data }) => {
    return (
        <div className="space-y-16 pb-20">
            {/* Main Site Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden">
                <div className="bg-slate-100 px-6 py-5 border-b border-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-7 bg-teal-700 rounded-full"></div>
                        <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl">Site Enrollment & Validated Case Breakdown</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full shadow-sm">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Grouped by Event No (Site)
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th rowSpan={2} className="px-6 py-5 font-black uppercase text-xs tracking-widest align-middle border-r border-slate-700">Clinical Site</th>
                                <th rowSpan={2} className="px-6 py-5 font-black uppercase text-xs tracking-widest align-middle text-center border-r border-slate-700 bg-slate-800">Enrolled</th>
                                <th rowSpan={2} className="px-6 py-5 font-black uppercase text-xs tracking-widest align-middle text-center border-r border-slate-700 bg-slate-900">Total Validated Episodes</th>
                                <th colSpan={2} className="px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest border-b border-r border-slate-700 bg-slate-900">Post-Dose 1 (Reported)</th>
                                <th colSpan={2} className="px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest border-b border-r border-slate-700 bg-slate-900">Post-Dose 2 (Reported)</th>
                                <th colSpan={2} className="px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest border-b bg-slate-900">Post-30D Follow-up</th>
                            </tr>
                            <tr className="bg-slate-700 text-slate-100">
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Events</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Positives (%)</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Events</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Positives (%)</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Events</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-center">Positives (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {[...data.sites, data.totals].map((s, idx) => {
                                const isTotal = idx === data.sites.length;
                                
                                return (
                                    <tr key={s.siteName} className={`${isTotal ? 'bg-slate-100 font-black' : 'hover:bg-slate-50 transition-colors'}`}>
                                        <td className="px-6 py-5 text-base font-black text-slate-950 border-r border-slate-200">{s.siteName}</td>
                                        <td className="px-6 py-5 text-lg text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50/50">{s.enrollment}</td>
                                        
                                        <td className="px-6 py-5 text-center border-r border-slate-200 font-black text-slate-950 bg-slate-100/30">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <span className="text-xl">{s.reportedEventsCount}</span>
                                                <div className="text-[10px] opacity-60 uppercase font-black">{formatPercent(s.reportedEventsCount, s.enrollment)} Rate</div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-teal-50/30 text-slate-900 font-bold">{s.after1stDoseEvents}</td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-teal-50/50">
                                            <div className="text-lg font-black text-teal-950">{s.after1stDoseCulturePositive}</div>
                                            <div className="text-[11px] text-teal-800 font-black">{formatPercent(s.after1stDoseCulturePositive, s.after1stDoseEvents)}</div>
                                            {bar(s.after1stDoseCulturePositive, s.after1stDoseEvents, 'bg-teal-700')}
                                        </td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-amber-50/30 text-slate-900 font-bold">{s.after2ndDoseEvents}</td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-amber-50/50">
                                            <div className="text-lg font-black text-amber-950">{s.after2ndDoseCulturePositive}</div>
                                            <div className="text-[11px] text-amber-800 font-black">{formatPercent(s.after2ndDoseCulturePositive, s.after2ndDoseEvents)}</div>
                                            {bar(s.after2ndDoseCulturePositive, s.after2ndDoseEvents, 'bg-amber-700')}
                                        </td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-rose-50/30 text-slate-900 font-bold">{s.after30Days2ndDoseEvents}</td>
                                        <td className="px-4 py-5 text-center bg-rose-50/50">
                                            <div className="text-lg font-black text-rose-950">{s.after30Days2ndDoseCulturePositive}</div>
                                            <div className="text-[11px] text-rose-800 font-black">{formatPercent(s.after30Days2ndDoseCulturePositive, s.after30Days2ndDoseEvents)}</div>
                                            {bar(s.after30Days2ndDoseCulturePositive, s.after30Days2ndDoseEvents, 'bg-rose-700')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Attack Rate Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden">
                <div className="bg-slate-100 px-6 py-5 border-b border-slate-300 flex items-center gap-3">
                    <div className="w-3 h-7 bg-blue-700 rounded-full"></div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl">Clinical Attack Rate (Reported Events)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5 border-r border-slate-700">Clinical Site</th>
                                <th className="px-6 py-5 text-center border-r border-slate-700">Enrolled Population</th>
                                <th className="px-6 py-5 text-center">Participants with Verified Events</th>
                                <th className="px-6 py-5 text-center">Attack Rate (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {[...data.sites, data.totals].map((s, idx) => {
                                const isTotal = idx === data.sites.length;
                                return (
                                    <tr key={`p-evt-${s.siteName}`} className={`${isTotal ? 'bg-slate-100 font-black' : 'hover:bg-slate-50 transition-colors'}`}>
                                        <td className="px-6 py-5 text-base font-black text-slate-950 border-r border-slate-200">{s.siteName}</td>
                                        <td className="px-6 py-5 text-base text-center border-r border-slate-200 font-bold text-slate-700">{s.enrollment}</td>
                                        <td className="px-6 py-5 text-lg text-center border-r border-slate-200 font-black text-blue-900">{s.participantsWithEvents}</td>
                                        <td className="px-6 py-5 text-center font-black text-slate-900">
                                            <span className="bg-blue-50 px-3 py-1 rounded-full text-blue-700 border border-blue-100">
                                                {formatPercent(s.participantsWithEvents, s.enrollment)}
                                            </span>
                                            {bar(s.participantsWithEvents, s.enrollment, 'bg-blue-600')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RT-PCR Result Table - UPDATED HEADERS */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden">
                <div className="bg-slate-100 px-6 py-5 border-b border-slate-300 flex items-center gap-3">
                    <div className="w-3 h-7 bg-emerald-700 rounded-full"></div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl">RT-PCR Diagnostic Statistics (Validated Episodes)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th rowSpan={2} className="px-6 py-5 font-black uppercase text-xs tracking-widest align-middle border-r border-slate-700">Clinical Site</th>
                                <th rowSpan={2} className="px-6 py-5 font-black uppercase text-xs tracking-widest align-middle text-center border-r border-slate-700 bg-slate-800">Episodes Tested</th>
                                <th rowSpan={2} className="px-6 py-5 font-black uppercase text-xs tracking-widest align-middle text-center border-r border-slate-700">Positive Episodes</th>
                                <th colSpan={2} className="px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest border-b border-r border-slate-700 bg-slate-900">Post-Dose 1</th>
                                <th colSpan={2} className="px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest border-b border-r border-slate-700 bg-slate-900">Post-Dose 2</th>
                                <th colSpan={2} className="px-6 py-3 text-center text-[11px] font-black uppercase tracking-widest border-b bg-slate-900">Post-30D Follow-up</th>
                            </tr>
                            <tr className="bg-slate-700 text-slate-100">
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Tested</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Positive (%)</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Tested</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Positive (%)</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold border-r border-slate-600 text-center">Tested</th>
                                <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-center">Positive (%)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {[...data.pcrSites, data.pcrTotals].map((s, idx) => {
                                const isTotal = idx === data.pcrSites.length;
                                return (
                                    <tr key={`pcr-${s.siteName}`} className={`${isTotal ? 'bg-slate-100 font-black' : 'hover:bg-slate-50 transition-colors'}`}>
                                        <td className="px-6 py-5 text-base font-black text-slate-950 border-r border-slate-200">{s.siteName}</td>
                                        <td className="px-6 py-5 text-lg text-center border-r border-slate-200 font-black text-slate-900 bg-slate-50/50">{s.totalTests}</td>
                                        <td className="px-6 py-5 text-base text-center border-r border-slate-200 font-bold">
                                            <div className="text-emerald-950">{s.totalPositive}</div>
                                            <div className="text-[11px] text-emerald-600 font-black uppercase tracking-tighter mt-0.5">{formatPercent(s.totalPositive, s.totalTests)} Rate</div>
                                        </td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-slate-50/30 text-slate-900 font-bold">{s.after1stDoseTests}</td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-emerald-50/50">
                                            <div className="text-lg font-black text-emerald-950">{s.after1stDosePositive}</div>
                                            <div className="text-[11px] text-emerald-800 font-black">{formatPercent(s.after1stDosePositive, s.after1stDoseTests)}</div>
                                            {bar(s.after1stDosePositive, s.after1stDoseTests, 'bg-emerald-600')}
                                        </td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-slate-50/30 text-slate-900 font-bold">{s.after2ndDoseTests}</td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-emerald-50/50">
                                            <div className="text-lg font-black text-emerald-950">{s.after2ndDosePositive}</div>
                                            <div className="text-[11px] text-emerald-800 font-black">{formatPercent(s.after2ndDosePositive, s.after2ndDoseTests)}</div>
                                            {bar(s.after2ndDosePositive, s.after2ndDoseTests, 'bg-emerald-600')}
                                        </td>
                                        <td className="px-4 py-5 text-center border-r border-slate-200 bg-slate-50/30 text-slate-900 font-bold">{s.after30DaysTests}</td>
                                        <td className="px-4 py-5 text-center bg-emerald-50/50">
                                            <div className="text-lg font-black text-emerald-950">{s.after30DaysPositive}</div>
                                            <div className="text-[11px] text-emerald-800 font-black">{formatPercent(s.after30DaysPositive, s.after30DaysTests)}</div>
                                            {bar(s.after30DaysPositive, s.after30DaysTests, 'bg-emerald-600')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Age Distribution */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden">
                <div className="bg-slate-100 px-6 py-5 border-b border-slate-300 flex items-center gap-3">
                    <div className="w-3 h-7 bg-indigo-700 rounded-full"></div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl">Age Distribution Analytics (Reported Events)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-5">Age Bracket</th>
                                <th className="px-4 py-5 text-center">Total Verified Events</th>
                                <th className="px-4 py-5 text-center">Total Culture Positives</th>
                                <th className="px-4 py-5 text-center bg-teal-900">Post-Dose 1 Pos</th>
                                <th className="px-4 py-5 text-center bg-amber-900">Post-Dose 2 Pos</th>
                                <th className="px-4 py-5 text-center bg-rose-900">Post-30D Pos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {data.ageDistribution.map(a => (
                                <tr key={a.ageGroup} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-5 text-base font-black text-slate-950">{a.ageGroup}</td>
                                    <td className="px-4 py-5 text-base text-center text-slate-900 font-bold">{a.totalEvents}</td>
                                    <td className="px-4 py-5 text-center">
                                        <div className="text-lg font-black text-slate-950">{a.culturePositive}</div>
                                        <div className="text-[11px] text-slate-600 font-black">{formatPercent(a.culturePositive, a.totalEvents)}</div>
                                        {bar(a.culturePositive, a.totalEvents, 'bg-indigo-700')}
                                    </td>
                                    <td className="px-4 py-5 text-lg text-center text-teal-950 font-black bg-teal-50/40">{a.after1stDoseCulturePositive}</td>
                                    <td className="px-4 py-5 text-lg text-center text-amber-950 font-black bg-amber-50/40">{a.after2ndDoseCulturePositive}</td>
                                    <td className="px-4 py-5 text-lg text-center text-rose-950 font-black bg-rose-50/40">{a.after30Days2ndDoseCulturePositive}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Serotype Prevalence */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-300 overflow-hidden">
                <div className="bg-slate-100 px-6 py-5 border-b border-slate-300 flex items-center gap-3">
                    <div className="w-3 h-7 bg-slate-900 rounded-full"></div>
                    <h3 className="font-black text-slate-900 uppercase tracking-tight text-xl">Top Serotype Prevalence (Reported Data)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-slate-200">
                    {data.strains.slice(0, 3).map(s => (
                        <div key={s.strainName} className="p-8 hover:bg-slate-50 transition-colors">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">{s.strainName}</p>
                            <p className="text-4xl font-black text-slate-950">{s.total} <span className="text-sm text-slate-400 font-medium ml-1">Confirmed</span></p>
                            <div className="mt-6 space-y-3">
                                <div className="flex justify-between items-center text-sm font-black">
                                    <span className="text-teal-900 uppercase tracking-tighter">Post-Dose 1</span>
                                    <span className="bg-teal-100 px-3 py-1 rounded-full text-teal-950">{s.after1stDose}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-black">
                                    <span className="text-amber-900 uppercase tracking-tighter">Post-Dose 2</span>
                                    <span className="bg-amber-100 px-3 py-1 rounded-full text-amber-950">{s.after2ndDose}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-black">
                                    <span className="text-rose-900 uppercase tracking-tighter">Post-30D</span>
                                    <span className="bg-rose-100 px-3 py-1 rounded-full text-rose-950">{s.after30Days2ndDose}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {data.strains.length === 0 && (
                    <div className="p-12 text-center text-slate-400 font-medium italic">Waiting for positive culture data points.</div>
                )}
            </div>
        </div>
    );
};
