import React from 'react';
import type { SummaryData, SiteSummary } from '../types';
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

export const SummaryTable: React.FC<{ data: SummaryData }> = ({ data }) => {
    return (
        <div className="flex flex-col">
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
        </div>
    );
};