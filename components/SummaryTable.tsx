
import React from 'react';
import type { SummaryData, SiteSummary, StrainSummary, PcrSummary, AgeSummary } from '../types';
import { formatPercent } from '../utils/formatter';

// Helper for row styles
const rowBaseClass = "border-b border-slate-100 hover:bg-slate-50 transition-colors";
const totalRowClass = "bg-slate-200 font-bold border-t-2 border-slate-300 text-slate-900";
const cellClass = "px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-center tabular-nums";
const firstCellClass = "px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 text-left";

const TableRow: React.FC<{ item: SiteSummary, isTotal?: boolean }> = ({ item, isTotal = false }) => (
    <tr className={isTotal ? totalRowClass : rowBaseClass}>
        <td className={firstCellClass}>{item.siteName}</td>
        <td className={cellClass}>{item.enrollment}</td>
        <td className={cellClass}>
            {item.totalDiarrhealEvents} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.totalDiarrhealEvents, item.enrollment)})</span>
        </td>
        <td className={cellClass}>{item.after1stDoseEvents}</td>
        <td className={cellClass}>
            {item.after1stDoseCulturePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after1stDoseCulturePositive, item.after1stDoseEvents)})</span>
        </td>
        <td className={cellClass}>{item.after2ndDoseEvents}</td>
        <td className={cellClass}>
            {item.after2ndDoseCulturePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after2ndDoseCulturePositive, item.after2ndDoseEvents)})</span>
        </td>
        <td className={cellClass}>{item.after30Days2ndDoseEvents}</td>
        <td className={cellClass}>
            {item.after30Days2ndDoseCulturePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after30Days2ndDoseCulturePositive, item.after30Days2ndDoseEvents)})</span>
        </td>
    </tr>
);

const PcrRow: React.FC<{ item: PcrSummary, isTotal?: boolean }> = ({ item, isTotal = false }) => (
    <tr className={isTotal ? totalRowClass : rowBaseClass}>
        <td className={firstCellClass}>{item.siteName}</td>
        <td className={cellClass}>{item.totalTests}</td>
        <td className={cellClass}>
             {item.totalPositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.totalPositive, item.totalTests)})</span>
        </td>
        <td className={cellClass}>{item.after1stDoseTests}</td>
        <td className={cellClass}>
            {item.after1stDosePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after1stDosePositive, item.after1stDoseTests)})</span>
        </td>
        <td className={cellClass}>{item.after2ndDoseTests}</td>
        <td className={cellClass}>
            {item.after2ndDosePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after2ndDosePositive, item.after2ndDoseTests)})</span>
        </td>
        <td className={cellClass}>{item.after30DaysTests}</td>
        <td className={cellClass}>
            {item.after30DaysPositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after30DaysPositive, item.after30DaysTests)})</span>
        </td>
    </tr>
);

const AgeRow: React.FC<{ item: AgeSummary }> = ({ item }) => (
    <tr className={rowBaseClass}>
        <td className={firstCellClass}>{item.ageGroup}</td>
        <td className={cellClass}>
            {item.totalEvents}
        </td>
        <td className={cellClass}>
             {item.culturePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.culturePositive, item.totalEvents)})</span>
        </td>
        <td className={cellClass}>{item.after1stDoseEvents}</td>
        <td className={cellClass}>
            {item.after1stDoseCulturePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after1stDoseCulturePositive, item.after1stDoseEvents)})</span>
        </td>
        <td className={cellClass}>{item.after2ndDoseEvents}</td>
        <td className={cellClass}>
            {item.after2ndDoseCulturePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after2ndDoseCulturePositive, item.after2ndDoseEvents)})</span>
        </td>
        <td className={cellClass}>{item.after30Days2ndDoseEvents}</td>
        <td className={cellClass}>
            {item.after30Days2ndDoseCulturePositive} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after30Days2ndDoseCulturePositive, item.after30Days2ndDoseEvents)})</span>
        </td>
    </tr>
);

interface StrainTotals {
    total: number;
    after1: number;
    after2: number;
    after30: number;
}

const StrainRow: React.FC<{ item: StrainSummary, totals: StrainTotals }> = ({ item, totals }) => (
    <tr className={rowBaseClass}>
        <td className={firstCellClass}>{item.strainName}</td>
        <td className={cellClass}>
            {item.total} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.total, totals.total)})</span>
        </td>
        <td className={cellClass}>
            {item.after1stDose} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after1stDose, totals.after1)})</span>
        </td>
        <td className={cellClass}>
            {item.after2ndDose} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after2ndDose, totals.after2)})</span>
        </td>
        <td className={cellClass}>
            {item.after30Days2ndDose} <span className="text-slate-500 text-xs ml-1">({formatPercent(item.after30Days2ndDose, totals.after30)})</span>
        </td>
    </tr>
);

// Shared Header Component
const TableHeader: React.FC<{ 
    title: string, 
    firstCol: string, 
    secondCol: string, 
    thirdCol: string 
}> = ({ title, firstCol, secondCol, thirdCol }) => (
    <thead className="bg-slate-800 text-white">
        <tr>
            <th rowSpan={2} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider align-middle border-r border-slate-700">{firstCol}</th>
            <th rowSpan={2} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider align-middle border-r border-slate-700">{secondCol}</th>
            <th rowSpan={2} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider align-middle border-r border-slate-700">{thirdCol}</th>
            <th colSpan={2} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-r border-slate-700 bg-slate-900/50">After 1<sup>st</sup> dose</th>
            <th colSpan={2} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-r border-slate-700 bg-slate-900/50">After 2<sup>nd</sup> dose</th>
            <th colSpan={2} className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-slate-700 bg-slate-900/50">After 30 days of 2<sup>nd</sup> dose</th>
        </tr>
        <tr>
            <th className="px-6 py-2 text-center text-xs font-medium uppercase tracking-wider border-r border-slate-700 text-slate-300">Events/Tested</th>
            <th className="px-6 py-2 text-center text-xs font-medium uppercase tracking-wider border-r border-slate-700 text-slate-300">Positive</th>
            <th className="px-6 py-2 text-center text-xs font-medium uppercase tracking-wider border-r border-slate-700 text-slate-300">Events/Tested</th>
            <th className="px-6 py-2 text-center text-xs font-medium uppercase tracking-wider border-r border-slate-700 text-slate-300">Positive</th>
            <th className="px-6 py-2 text-center text-xs font-medium uppercase tracking-wider border-r border-slate-700 text-slate-300">Events/Tested</th>
            <th className="px-6 py-2 text-center text-xs font-medium uppercase tracking-wider text-slate-300">Positive</th>
        </tr>
    </thead>
);

export const SummaryTable: React.FC<{ data: SummaryData }> = ({ data }) => {
    const strainTotals: StrainTotals = data.strains.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        after1: acc.after1 + curr.after1stDose,
        after2: acc.after2 + curr.after2ndDose,
        after30: acc.after30 + curr.after30Days2ndDose
    }), { total: 0, after1: 0, after2: 0, after30: 0 });

    return (
        <div className="flex flex-col space-y-16">
            {/* Site Summary Table */}
            <div>
                 <div className="mb-4 flex items-center">
                    <div className="h-6 w-1 bg-teal-500 rounded mr-3"></div>
                    <h3 className="text-xl font-bold text-slate-800">Site Enrollment & Events</h3>
                 </div>
                <div className="overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
                    <table className="min-w-full divide-y divide-slate-200">
                        <TableHeader 
                            title="Site Summary" 
                            firstCol="Site Name" 
                            secondCol="Enrollment" 
                            thirdCol="Total Diarrhoeal Events" 
                        />
                        <tbody className="bg-white divide-y divide-slate-200">
                            {data.sites.map(site => <TableRow key={site.siteName} item={site} />)}
                            <TableRow item={data.totals} isTotal={true} />
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Age wise diarrheal events Table */}
             <div>
                 <div className="mb-4 flex items-center">
                    <div className="h-6 w-1 bg-teal-500 rounded mr-3"></div>
                    <h3 className="text-xl font-bold text-slate-800">Age Distribution Analysis</h3>
                 </div>
                 <div className="overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
                    <table className="min-w-full divide-y divide-slate-200">
                        <TableHeader 
                            title="Age Distribution" 
                            firstCol="Age Group" 
                            secondCol="Total Events" 
                            thirdCol="Total Culture Positive" 
                        />
                        <tbody className="bg-white divide-y divide-slate-200">
                            {data.ageDistribution.map(item => <AgeRow key={item.ageGroup} item={item} />)}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RT-PCR Results Table */}
            <div>
                 <div className="mb-4 flex items-center">
                    <div className="h-6 w-1 bg-teal-500 rounded mr-3"></div>
                    <h3 className="text-xl font-bold text-slate-800">RT-PCR Results</h3>
                 </div>
                 <div className="overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
                    <table className="min-w-full divide-y divide-slate-200">
                        <TableHeader 
                            title="RT-PCR" 
                            firstCol="Site Name" 
                            secondCol="Total Tests" 
                            thirdCol="Total Positive" 
                        />
                        <tbody className="bg-white divide-y divide-slate-200">
                            {data.pcrSites.map(site => <PcrRow key={site.siteName} item={site} />)}
                            <PcrRow item={data.pcrTotals} isTotal={true} />
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Serotype/Serogroup Distribution Table */}
            <div>
                <div className="mb-4 flex items-center">
                    <div className="h-6 w-1 bg-teal-500 rounded mr-3"></div>
                    <h3 className="text-xl font-bold text-slate-800">Serotype/Serogroup Distribution <span className="text-slate-500 font-normal text-base">(Culture Positive Cases)</span></h3>
                </div>
                <div className="overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-800 text-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider border-r border-slate-700">Serotype/Serogroup</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider border-r border-slate-700">Total Positive Cases</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider border-r border-slate-700">After 1<sup>st</sup> dose</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider border-r border-slate-700">After 2<sup>nd</sup> dose</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">After 30 days of 2<sup>nd</sup> dose</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {data.strains.length > 0 ? (
                                data.strains.map(strain => <StrainRow key={strain.strainName} item={strain} totals={strainTotals} />)
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500 italic">No culture positive cases with strain information found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
