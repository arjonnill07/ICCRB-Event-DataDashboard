import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { SummaryData } from '../types';

const normalizeSearchKey = (value: string): string =>
    value ? value.trim().toUpperCase().replace(/[\s-_]+/g, '') : '';

const getStageBadge = (stage: string) => {
    const isAfter30 = stage.toLowerCase().includes('30');
    const isAfter2 = stage.toLowerCase().includes('2nd');
    const isAfter1 = stage.toLowerCase().includes('1st');
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold shadow-sm';
    if (isAfter30) return `${base} bg-rose-100 text-rose-800 border border-rose-200`;
    if (isAfter2) return `${base} bg-amber-100 text-amber-900 border border-amber-200`;
    if (isAfter1) return `${base} bg-teal-100 text-teal-900 border border-teal-200`;
    return `${base} bg-slate-100 text-slate-700 border border-slate-200`;
};

export const ParticipantLookup: React.FC<{ data: SummaryData }> = ({ data }) => {
    const [query, setQuery] = useState('');
    const [submitted, setSubmitted] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionBoxRef = useRef<HTMLDivElement>(null);

    // Collect all unique participant IDs from enrollment + detailed events
    const allParticipantIds = useMemo(() => {
        const set = new Set<string>();
        data.participants.forEach(p => {
            if (p.participant_id) set.add(p.participant_id);
        });
        data.detailedEvents.forEach(e => {
            if (e.participantId) set.add(e.participantId);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }, [data.participants, data.detailedEvents]);

    // Matching suggestions based on current typed query
    const suggestions = useMemo(() => {
        const q = normalizeSearchKey(query);
        if (!q || q.length < 1) return [];
        return allParticipantIds
            .filter(id => normalizeSearchKey(id).includes(q))
            .slice(0, 8);
    }, [query, allParticipantIds]);

    // Close suggestions dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (idToSearch: string) => {
        setQuery(idToSearch);
        setSubmitted(idToSearch);
        setShowSuggestions(false);
    };

    const normalizedQuery = normalizeSearchKey(submitted);

    // Find participant enrollment metadata
    const participantMeta = useMemo(() => {
        if (!normalizedQuery) return undefined;
        return data.participants.find(participant => normalizeSearchKey(participant.participant_id) === normalizedQuery);
    }, [data.participants, normalizedQuery]);

    // Find all episodes for this participant
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

    const participantDoseCount = participantMeta 
        ? Number(Boolean(participantMeta.dose1_date)) + Number(Boolean(participantMeta.dose2_date)) 
        : 0;

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
            if (event.shigellaStrain && event.shigellaStrain !== 'N/A' && event.shigellaStrain !== 'None') {
                strains.add(event.shigellaStrain);
            }
            const lowerStage = event.doseCategory.toLowerCase();
            if (lowerStage.includes('30')) counts.after30 += 1;
            else if (lowerStage.includes('2nd')) counts.after2 += 1;
            else if (lowerStage.includes('1st')) counts.after1 += 1;
        });
        return { ...counts, strains: Array.from(strains).sort() };
    }, [participantEvents]);

    const hasResults = Boolean(normalizedQuery && (participantMeta !== undefined || participantEvents.length > 0));

    const participantDisplayId = participantMeta?.participant_id || participantEvents[0]?.participantId || submitted;
    const participantSite = participantMeta?.site_name || participantEvents[0]?.site || 'Unknown Site';
    const participantAge = participantMeta?.age_months !== undefined
        ? `${participantMeta.age_months.toFixed(1)} Months`
        : participantEvents[0]?.ageMonths
            ? `${participantEvents[0].ageMonths} Months`
            : 'N/A';

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-6 bg-teal-600 rounded-full"></div>
                        <h3 className="text-xl font-black text-slate-900">Participant Lookup</h3>
                    </div>
                    <p className="text-sm text-slate-500">
                        Search by Participant / Randomization Number to inspect clinical episodes, vaccination dates, and culture results.
                    </p>
                </div>
                
                {/* Search Form with Auto-Suggest */}
                <div className="relative w-full max-w-xl" ref={suggestionBoxRef}>
                    <form
                        onSubmit={e => {
                            e.preventDefault();
                            if (query.trim()) handleSearch(query.trim());
                        }}
                        className="flex gap-2"
                    >
                        <div className="relative flex-1">
                            <input
                                id="participant-search"
                                type="text"
                                value={query}
                                onChange={e => {
                                    setQuery(e.target.value);
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="Enter Participant / Randomization ID..."
                                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-200 transition-all placeholder:text-slate-400"
                            />
                            {query && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setQuery('');
                                        setSubmitted('');
                                        setShowSuggestions(false);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm p-1"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-black text-white hover:bg-teal-700 active:scale-95 transition-all shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Search
                        </button>
                    </form>

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 max-h-60 overflow-y-auto">
                            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                Matching Participants ({suggestions.length})
                            </div>
                            {suggestions.map(id => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => handleSearch(id)}
                                    className="w-full text-left px-4 py-2 text-sm font-bold text-slate-800 hover:bg-teal-50 hover:text-teal-900 transition-colors flex items-center justify-between"
                                >
                                    <span>{id}</span>
                                    <span className="text-[11px] font-medium text-slate-400">Click to inspect</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* No Match Found Warning */}
            {submitted && !hasResults && (
                <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-sm font-medium text-rose-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">!</div>
                    <div>
                        <p className="font-bold">No participant record found for &ldquo;{submitted}&rdquo;.</p>
                        <p className="text-xs text-rose-600 mt-0.5">Please check the participant ID spelling or select from the search suggestions.</p>
                    </div>
                </div>
            )}

            {/* Results Card */}
            {hasResults && (
                <div className="mt-6 space-y-6 animate-fade-in">
                    {/* Header Profile Summary */}
                    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-800">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h4 className="text-2xl font-black text-white tracking-tight">{participantDisplayId}</h4>
                                    {participantMeta ? (
                                        <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                            Enrolled Participant
                                        </span>
                                    ) : (
                                        <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                            Event Logged (Unmapped Enrollment)
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-400 text-xs mt-1 font-medium">
                                    Clinical Site: <strong className="text-slate-200">{participantSite}</strong> &bull; Age at Enrollment: <strong className="text-slate-200">{participantAge}</strong>
                                </p>
                            </div>

                            {/* Vaccine Schedule Details */}
                            <div className="flex flex-wrap gap-4 text-xs">
                                <div className="bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700">
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Dose 1 Date</span>
                                    <span className="text-slate-100 font-bold">{participantMeta?.dose1_date || 'Not recorded'}</span>
                                </div>
                                <div className="bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700">
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Dose 2 Date</span>
                                    <span className="text-slate-100 font-bold">{participantMeta?.dose2_date || 'Not recorded'}</span>
                                </div>
                                <div className="bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700">
                                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Doses Completed</span>
                                    <span className="text-teal-400 font-bold">{participantDoseCount} of 2</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Level Metric Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-2">
                            <div className="bg-slate-800/70 p-3 rounded-xl">
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Episodes</p>
                                <p className="text-xl font-black text-white mt-1">{eventCounts.total}</p>
                            </div>
                            <div className="bg-slate-800/70 p-3 rounded-xl">
                                <p className="text-[10px] uppercase font-black tracking-widest text-rose-400">Culture Positives</p>
                                <p className="text-xl font-black text-rose-400 mt-1">{eventCounts.culturePositive}</p>
                            </div>
                            <div className="bg-slate-800/70 p-3 rounded-xl">
                                <p className="text-[10px] uppercase font-black tracking-widest text-emerald-400">RT-PCR Positives</p>
                                <p className="text-xl font-black text-emerald-400 mt-1">{eventCounts.pcrPositive}</p>
                            </div>
                            <div className="bg-slate-800/70 p-3 rounded-xl">
                                <p className="text-[10px] uppercase font-black tracking-widest text-teal-400">Isolated Strains</p>
                                <p className="text-xl font-black text-teal-400 mt-1">{eventCounts.strains.length}</p>
                            </div>
                        </div>
                    </div>

                    {/* Strains Tag List */}
                    {eventCounts.strains.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Identified Shigella Strains / Serotypes</p>
                            <div className="flex flex-wrap gap-2">
                                {eventCounts.strains.map(strain => (
                                    <span key={strain} className="rounded-lg bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-black text-teal-900 shadow-sm">
                                        {strain}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Case 1: Enrolled Participant with 0 Diarrheal Episodes */}
                    {participantEvents.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                                ✓
                            </div>
                            <h4 className="text-base font-black text-emerald-950">No Diarrheal Episodes Reported</h4>
                            <p className="text-sm text-emerald-800 mt-1 max-w-md mx-auto">
                                This participant is actively registered in the clinical trial registry with no verified diarrheal episodes or stool culture events logged in the data file.
                            </p>
                        </div>
                    ) : (
                        /* Case 2: Episodes Log Table */
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="bg-slate-100 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Diarrheal Episode History ({participantEvents.length})
                                </h4>
                                <span className="text-xs text-slate-500 font-medium">
                                    Window: {participantEvents[0].collectionDate} &ndash; {participantEvents[participantEvents.length - 1].collectionDate}
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border-collapse text-left text-sm text-slate-800">
                                    <thead className="bg-slate-900 text-white text-[11px] uppercase tracking-widest font-black">
                                        <tr>
                                            <th className="px-4 py-3.5">Episode Date</th>
                                            <th className="px-4 py-3.5">Clinical Stage</th>
                                            <th className="px-4 py-3.5 text-center">Culture Result</th>
                                            <th className="px-4 py-3.5 text-center">RT-PCR Result</th>
                                            <th className="px-4 py-3.5">Shigella Strain</th>
                                            <th className="px-4 py-3.5 text-center">Specimens</th>
                                            <th className="px-4 py-3.5 text-center">Age (Months)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {participantEvents.map((event, idx) => (
                                            <tr key={`${event.participantId}-${event.collectionDate}-${event.doseCategory}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3.5 font-bold text-slate-950">{event.collectionDate}</td>
                                                <td className="px-4 py-3.5">
                                                    <span className={getStageBadge(event.doseCategory)}>{event.doseCategory}</span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {event.cultureResult === 'Positive' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                                                            Positive
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                                            Negative
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center">
                                                    {event.pcrResult === 'Positive' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            Positive
                                                        </span>
                                                    ) : event.pcrResult === 'Negative' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                                            Negative
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-medium">Not Tested</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    {event.shigellaStrain && event.shigellaStrain !== 'N/A' && event.shigellaStrain !== 'None' ? (
                                                        <span className="font-black text-slate-900">{event.shigellaStrain}</span>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs font-medium">&mdash;</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 text-center text-xs text-slate-700 font-semibold">
                                                    <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                                        {event.stoolsCollected} Stool, {event.rectalSwabsCollected} Swab
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                                                    {event.ageMonths || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
