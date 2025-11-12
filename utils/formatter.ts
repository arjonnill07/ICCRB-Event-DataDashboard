
export const formatPercent = (numerator: number, denominator: number): string => {
    if (denominator === 0) return '0.00%';
    const value = (numerator / denominator) * 100;
    return `${value.toFixed(2)}%`;
}
