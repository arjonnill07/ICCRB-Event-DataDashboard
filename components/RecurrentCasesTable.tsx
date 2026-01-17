
import React, { useState, useMemo } from 'react';
import type { RecurrentCase } from '../types';

export const RecurrentCasesTable: React.FC<{ data: RecurrentCase[] }> = ({ data }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredData = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return data.filter(item => 
            item.participantId.toLowerCase().includes(lowerSearch) ||
            item.siteName.toLowerCase().includes(lowerSearch)
        );
    }, [data, searchTerm]);

    const getStageColor = (stage: string) => {
        if (stage.includes('1st')) return 'bg-teal-600 text-teal-50 border-teal-700';
        if (stage.includes('2nd')) return 'bg-amber-600 text-amber-50 border-amber-700';
        if (stage.includes('30 Days')) return 'bg-rose-600 text-rose-50 border-rose-700';
        return 'bg-slate-500 text-white border-slate-600';
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden">
            <div className="bg-slate-900 px-6 py-6 border-b border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-8 bg-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]"></div>
                        <div>
                            <h3 className="font-black text-white uppercase tracking-tight text-xl">Recurrent Episode Analytics</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Participants with multiple diarrheal events</p>
                        </div>
                    </div>
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Filter by ID or Site..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 sm:text-sm font-bold transition-all"
                        />
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Participant Info</th>
                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">Episodes</th>
                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 text-center">Infection Load</th>
                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500">Clinical Timeline & Strains</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.map((item) => (
                            <tr key={item.participantId} className="hover:bg-slate-50/80 transition-all group">
                                <td className="px-6 py-5">
                                    <div className="font-black text-slate-900 text-base">{item.participantId}</div>
                                    <div className="text-slate-500 font-bold text-xs uppercase tracking-tighter">{item.siteName}</div>
                                    {item.hasPersistentPathogen && (
                                        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-700 border border-rose-200 shadow-sm">
                                            Persistent Pathogen Detected
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-lg border-2 
                                        ${item.totalEpisodes >= 3 
                                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                                            : 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'}`}>
                                        {item.totalEpisodes}
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className={`text-xs font-black uppercase tracking-tight ${item.culturePositives > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                            {item.culturePositives} Culture Positives
                                        </span>
                                        <div className="w-24 h-2 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-200 shadow-inner">
                                            <div 
                                                className="h-full bg-rose-500 transition-all duration-1000 ease-out shadow-sm" 
                                                style={{ width: `${(item.culturePositives / item.totalEpisodes) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-3">
                                        {item.history.map((h, i) => (
                                            <div 
                                                key={i} 
                                                className="relative group/badge"
                                            >
                                                <div className={`flex flex-col items-start px-3 py-2 rounded-xl border-b-4 shadow-sm transition-transform hover:-translate-y-1 cursor-help
                                                    ${getStageColor(h.stage)}`}>
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{h.stage.split(' ')[1]}</span>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded bg-white/20 font-black`}>
                                                            {h.result === 'Positive' ? 'POS' : 'NEG'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] font-bold mt-1 opacity-90 truncate max-w-[100px]">
                                                        {h.strain || (h.result === 'Positive' ? 'Unspecified' : 'N/A')}
                                                    </div>
                                                </div>
                                                {/* Tooltip on Hover */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-lg text-[10px] shadow-2xl invisible group-hover/badge:visible z-50 pointer-events-none">
                                                    <div className="font-black border-b border-slate-700 pb-1 mb-1 uppercase tracking-widest">Episode Details</div>
                                                    <p><span className="text-slate-500">Date:</span> {h.date}</p>
                                                    <p><span className="text-slate-500">Stage:</span> {h.stage}</p>
                                                    <p><span className="text-slate-500">Result:</span> {h.result}</p>
                                                    {h.strain && <p><span className="text-amber-400">Strain:</span> {h.strain}</p>}
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredData.length === 0 && (
                    <div className="py-20 text-center text-slate-400 font-bold bg-slate-50/50">
                        No participants match your current search criteria.
                    </div>
                )}
            </div>
            <div className="bg-slate-900 px-6 py-3 flex items-center justify-between border-t border-slate-800">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                    Showing {filteredData.length} of {data.length} participants
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Post-D1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Post-D2</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Post-30D</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
