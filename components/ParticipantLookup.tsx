import React, { useMemo, useState } from 'react';
import type { SummaryData } from '../types';

const normalizeSearchKey = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, ' ');

const getStageBadge = (stage: string) => {
    const isAfter30 = stage.toLowerCase().includes('30');
    const isAfter2 = stage.toLowerCase().includes('2nd');
    const isAfter1 = stage.toLowerCase().includes('1st');
    const base = 'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold';
    if (isAfter30) return `${base} bg-rose-100 text-rose-700 border border-rose-200`;
    if (isAfter2) return `${base} bg-amber-100 text-amber-800 border border-amber-200`;
    if (isAfter1) return `${base} bg-teal-100 text-teal-800 border border-teal-200`;
    return `${base} bg-slate-100 text-slate-700 border border-slate-200`;
};

export const ParticipantLookup: React.FC<{ data: SummaryData }> = ({ data }) => {
    const [query, setQuery] = useState('');
    const [submitted, setSubmitted] = useState('');

    const normalizedQuery = normalizeSearchKey(submitted);

    const participantMeta = useMemo(() => {
        if (!normalizedQuery) return undefined;
        return data.participants.find(participant => normalizeSearchKey(participant.participant_id) === normalizedQuery);
    }, [data.participants, normalizedQuery]);

    const participantDoseCount = participantMeta ? Number(Boolean(participantMeta.dose1_date)) + Number(Boolean(participantMeta.dose2_date)) : 0;

    const participantEvents = useMemo(() => {
        if (!normalizedQuery) return [];
        return data.detailedEvents
            .filter(event => normalizeSearchKey(event.participantId) === normalizedQuery)
            .sort((a, b) => {
                const da = new Date(a.collectionDate).getTime() || 0;
                const db = new Date(b.collectionDate).getTime() || 0;
                return da - db;
            });
    }, [data.detailedEvents, normalizedQuery]);

    const eventCounts = useMemo(() => {
        const counts = { total: 0, culturePositive: 0, pcrPositive: 0, pcrTested: 0, after1: 0, after2: 0, after30: 0 };
        const strains = new Set<string>();
        participantEvents.forEach(event => {
            counts.total += 1;
            if (event.cultureResult === 'Positive') counts.culturePositive += 1;
            if (event.pcrResult !== 'Not Tested') {
                counts.pcrTested += 1;
                if (event.pcrResult === 'Positive') counts.pcrPositive += 1;
            }
            if (event.shigellaStrain && event.shigellaStrain !== 'N/A') strains.add(event.shigellaStrain);
            const lowerStage = event.doseCategory.toLowerCase();
            if (lowerStage.includes('30')) counts.after30 += 1;
            else if (lowerStage.includes('2nd')) counts.after2 += 1;
            else if (lowerStage.includes('1st')) counts.after1 += 1;
        });
        return { ...counts, strains: Array.from(strains).sort() };
    }, [participantEvents]);

    const hasResults = normalizedQuery && participantEvents.length > 0;

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900">Participant Lookup</h3>
                    <p className="mt-2 text-sm text-slate-500">Search by Randomization Number to view participant history and analytics.</p>
                </div>
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        setSubmitted(query);
                    }}
                    className="w-full max-w-2xl"
                >
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <label className="sr-only" htmlFor="participant-search">Randomization Number</label>
                        <input
                            id="participant-search"
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Enter Randomization ID (e.g. R1234)"
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
                        />
                        <button
                            type="submit"
                            className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-700 transition-all"
                        >
                            Search
                        </button>
                    </div>
                </form>
            </div>

            {submitted && !hasResults && (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
                    No participant history found for <strong>{submitted}</strong>. Check the ID and try again.
                </div>
            )}

            {hasResults && (
                <div className="mt-6 space-y-6">
                    <div className="grid gap-4 md:grid-cols-5">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Participant ID</p>
                            <p className="mt-2 text-lg font-black text-slate-900">{participantEvents[0].participantId}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Total Episodes</p>
                            <p className="mt-2 text-lg font-black text-slate-900">{eventCounts.total}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Vaccine Doses Completed</p>
                            <p className="mt-2 text-lg font-black text-slate-900">{participantDoseCount}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Culture Positive</p>
                            <p className="mt-2 text-lg font-black text-rose-700">{eventCounts.culturePositive}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">PCR Positive</p>
                            <p className="mt-2 text-lg font-black text-emerald-700">{eventCounts.pcrPositive}</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Site</p>
                            <p className="mt-2 text-lg font-black text-slate-900">{participantEvents[0].site}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Distinct Strains</p>
                            <p className="mt-2 text-lg font-black text-slate-900">{eventCounts.strains.length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400">Follow-up Window</p>
                            <p className="mt-2 text-lg font-black text-slate-900">
                                {participantEvents[0].collectionDate} – {participantEvents[participantEvents.length - 1].collectionDate}
                            </p>
                        </div>
                    </div>

                    {eventCounts.strains.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Identified Strains</p>
                            <div className="flex flex-wrap gap-2">
                                {eventCounts.strains.map(strain => (
                                    <span key={strain} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{strain}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-full border-collapse text-left text-sm text-slate-800">
                            <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-4">Date</th>
                                    <th className="px-4 py-4">Dose Category</th>
                                    <th className="px-4 py-4">Culture Result</th>
                                    <th className="px-4 py-4">RT-PCR</th>
                                    <th className="px-4 py-4">Strain</th>
                                    <th className="px-4 py-4">Episode Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {participantEvents.map(event => (
                                    <tr key={`${event.participantId}-${event.collectionDate}-${event.doseCategory}`} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 font-medium text-slate-900">{event.collectionDate}</td>
                                        <td className="px-4 py-4"><span className={getStageBadge(event.doseCategory)}>{event.doseCategory}</span></td>
                                        <td className="px-4 py-4">{event.cultureResult}</td>
                                        <td className="px-4 py-4">{event.pcrResult}</td>
                                        <td className="px-4 py-4">{event.shigellaStrain}</td>
                                        <td className="px-4 py-4">{event.participantTotalEvents}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
