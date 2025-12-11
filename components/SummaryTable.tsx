
import React from 'react';
import type { SummaryData, SiteSummary, StrainSummary, PcrSummary, AgeSummary } from '../types';
import { formatPercent } from '../utils/formatter';

const TableRow: React.FC<{ item: SiteSummary, isTotal?: boolean }> = ({ item, isTotal = false }) => (
    <tr className={isTotal ? "bg-gray-200 font-bold" : "even:bg-gray-50"}>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.siteName}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.enrollment}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.totalDiarrhealEvents} ({formatPercent(item.totalDiarrhealEvents, item.enrollment)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after1stDoseEvents}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after1stDoseCulturePositive} ({formatPercent(item.after1stDoseCulturePositive, item.after1stDoseEvents)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after2ndDoseEvents}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after2ndDoseCulturePositive} ({formatPercent(item.after2ndDoseCulturePositive, item.after2ndDoseEvents)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after30Days2ndDoseEvents}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after30Days2ndDoseCulturePositive} ({formatPercent(item.after30Days2ndDoseCulturePositive, item.after30Days2ndDoseEvents)})
        </td>
    </tr>
);

const PcrRow: React.FC<{ item: PcrSummary, isTotal?: boolean }> = ({ item, isTotal = false }) => (
    <tr className={isTotal ? "bg-gray-200 font-bold" : "even:bg-gray-50"}>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.siteName}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.totalTests}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
             {item.totalPositive} ({formatPercent(item.totalPositive, item.totalTests)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after1stDoseTests}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after1stDosePositive} ({formatPercent(item.after1stDosePositive, item.after1stDoseTests)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after2ndDoseTests}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after2ndDosePositive} ({formatPercent(item.after2ndDosePositive, item.after2ndDoseTests)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after30DaysTests}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after30DaysPositive} ({formatPercent(item.after30DaysPositive, item.after30DaysTests)})
        </td>
    </tr>
);

const AgeRow: React.FC<{ item: AgeSummary }> = ({ item }) => (
    <tr className="even:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.ageGroup}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.totalEvents}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
             {item.culturePositive} ({formatPercent(item.culturePositive, item.totalEvents)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after1stDoseEvents}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after1stDoseCulturePositive} ({formatPercent(item.after1stDoseCulturePositive, item.after1stDoseEvents)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after2ndDoseEvents}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after2ndDoseCulturePositive} ({formatPercent(item.after2ndDoseCulturePositive, item.after2ndDoseEvents)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{item.after30Days2ndDoseEvents}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after30Days2ndDoseCulturePositive} ({formatPercent(item.after30Days2ndDoseCulturePositive, item.after30Days2ndDoseEvents)})
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
    <tr className="even:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.strainName}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.total} ({formatPercent(item.total, totals.total)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after1stDose} ({formatPercent(item.after1stDose, totals.after1)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after2ndDose} ({formatPercent(item.after2ndDose, totals.after2)})
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
            {item.after30Days2ndDose} ({formatPercent(item.after30Days2ndDose, totals.after30)})
        </td>
    </tr>
);

export const SummaryTable: React.FC<{ data: SummaryData }> = ({ data }) => {
    // Calculate totals for strain columns to compute percentages
    const strainTotals: StrainTotals = data.strains.reduce((acc, curr) => ({
        total: acc.total + curr.total,
        after1: acc.after1 + curr.after1stDose,
        after2: acc.after2 + curr.after2ndDose,
        after30: acc.after30 + curr.after30Days2ndDose
    }), { total: 0, after1: 0, after2: 0, after30: 0 });

    return (
        <div className="flex flex-col space-y-12">
            {/* Site Summary Table */}
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow-lg overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Site Name</th>
                                    <th rowSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Enrollment</th>
                                    <th rowSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Number of Diarrhoeal Events</th>
                                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">After 1<sup>st</sup> dose</th>
                                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">After 2<sup>nd</sup> dose</th>
                                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">After 30 days of the 2<sup>nd</sup> dose</th>
                                </tr>
                                <tr>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Diarrheal events</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Culture positive</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Diarrheal events</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Culture positive</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Diarrheal events</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Culture positive</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data.sites.map(site => <TableRow key={site.siteName} item={site} />)}
                                <TableRow item={data.totals} isTotal={true} />
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Age wise diarrheal events Table */}
             <div>
                 <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">Age wise diarrheal events</h3>
                 <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow-lg overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Age Distribution</th>
                                        <th rowSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Total Events</th>
                                        <th rowSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Culture Positive</th>
                                        <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">After 1<sup>st</sup> dose</th>
                                        <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">After 2<sup>nd</sup> dose</th>
                                        <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">After 30 days of the 2<sup>nd</sup> dose</th>
                                    </tr>
                                    <tr>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Diarrheal events</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Culture positive</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Diarrheal events</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Culture positive</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Diarrheal events</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Culture positive</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.ageDistribution.map(item => <AgeRow key={item.ageGroup} item={item} />)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* RT-PCR Results Table */}
            <div>
                 <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">RT-PCR Result</h3>
                 <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow-lg overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th rowSpan={2} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Site Name</th>
                                        <th rowSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Total Tests</th>
                                        <th rowSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider align-middle border-r">Total Positive</th>
                                        <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">After 1<sup>st</sup> dose</th>
                                        <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-r">After 2<sup>nd</sup> dose</th>
                                        <th colSpan={2} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">After 30 days of the 2<sup>nd</sup> dose</th>
                                    </tr>
                                    <tr>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Tested</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Positive</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Tested</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Positive</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Tested</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Positive</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.pcrSites.map(site => <PcrRow key={site.siteName} item={site} />)}
                                    <PcrRow item={data.pcrTotals} isTotal={true} />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Serotype/Serogroup Distribution Table */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4 px-2">Serotype/Serogroup Distribution of Culture Positive Cases</h3>
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow-lg overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Serotype/Serogroup</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Total Positive Cases</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">After 1<sup>st</sup> dose</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r">After 2<sup>nd</sup> dose</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">After 30 days of the 2<sup>nd</sup> dose</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.strains.length > 0 ? (
                                        data.strains.map(strain => <StrainRow key={strain.strainName} item={strain} totals={strainTotals} />)
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No culture positive cases with strain information found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
