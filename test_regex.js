const normalizeEventNoSite = (val) => {
    if (!val) return '';
    return val.replace(/,?\s*\(?Day[- ]?\d+\)?\s*/gi, '').trim();
};

const testCases = [
    "Korail 248, Day-01",
    "Korail 248, Day-02",  
    "Mirpur-01, Day-1",
    "(Day-01) Tongi 345",
    "Korail 248",
    "Day-01",
    "Korail 248, Day 01",
    "Korail 248,Day-02"
];

console.log("Event No Normalization Tests:");
testCases.forEach(test => {
    console.log(`"${test}" → "${normalizeEventNoSite(test)}"`);
});
