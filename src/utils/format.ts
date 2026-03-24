export const formatCurrency = (
    value: number,
    isCompact: boolean = false,
    isPrivacyEnabled: boolean = false,
    isPrivacyMaskRevealed: boolean = false
): string => {
    // 1. Privacy Check
    if (isPrivacyEnabled && !isPrivacyMaskRevealed) {
        return '***';
    }

    // 2. Formatting Check
    if (isCompact) { // Changed from isCompact to compact
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 1
        }).format(value);
    }

    // Default long-form format
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};
