const normalizeEventNoSite = (val) => {
    if (!val) return '';
    let result = val.replace(/,?\s*\(?Day[- ]?\d+\)?\s*/gi, '').trim();
    result = result.replace(/[-\s]+$/, '').trim();
    return result;
};

const testCases = [
    // Original formats
    "Korail 248, Day-01",
    "Korail 248, Day-02",
    // Parentheses formats
    "Mirpur-70",
    "Mirpur-70 (Day-01)",
    "Mirpur-70 (Day-02)",
    // No space before paren (PROBLEMATIC)
    "Mirpur-8-(Day-01)",
    "Mirpur-8-(Day-02)",
    "Mirpur-14-(Day-01)",
    // Tongi variations
    "Tongi 77 (Day-01)",
    "Tongi 77 (Day-02)",
    "Tongi 2 (Day-01)",
    "Tongi 2 (Day-02)",
    // Single digit days
    "Korail-14 (Day-1)",
    "Korail-14 (Day-2)",
    // Multiple digit days
    "Mirzapur-251 (Day-01)",
    "Mirzapur-251 (Day-02)",
    "Mirzapur-251 (Day-03)",
    // Edge cases
    "Only Stool for PCR",
    "#N/A",
    "Tongi 2",
];

console.log("IMPROVED Event No Normalization Tests:\n");
testCases.forEach(test => {
    const normalized = normalizeEventNoSite(test);
    console.log(`"${test.padEnd(35)}" → "${normalized}"`);
});

// Group tests to verify they normalize to same value
console.log("\n\nGrouping Check (samples from same event should normalize to same value):");
const groups = {
    "Mirpur-70": ["Mirpur-70", "Mirpur-70 (Day-01)", "Mirpur-70 (Day-02)"],
    "Mirpur-8": ["Mirpur-8-(Day-01)", "Mirpur-8-(Day-02)"],
    "Tongi 77": ["Tongi 77 (Day-01)", "Tongi 77 (Day-02)"],
    "Korail-14": ["Korail-14 (Day-1)", "Korail-14 (Day-2)"],
    "Korail 248": ["Korail 248, Day-01", "Korail 248, Day-02"],
};

Object.entries(groups).forEach(([expectedBase, samples]) => {
    const normalized = samples.map(normalizeEventNoSite);
    const allSame = normalized.every(n => n === normalized[0]);
    const status = allSame ? "✓ PASS" : "✗ FAIL";
    console.log(`\n${status} - Expected: "${expectedBase}"`);
    samples.forEach((sample, idx) => {
        console.log(`    ${sample.padEnd(35)} → ${normalized[idx]}`);
    });
});
