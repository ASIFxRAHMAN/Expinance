export const getColors = (isDark: boolean) => ({
    // For the redesigned system, we use an exclusively OLED-optimized dark theme.
    // Parameters like `isDark` are preserved for backward compatibility in code, but always return the dark tokens.
    background: '#000000',      // True Black background
    card: '#0F0F0F',            // Deep Charcoal for Bento cards
    text: '#FFFFFF',            // Pure white text
    subText: '#A1A1AA',         // Zinc-400 for metadata
    border: '#27272A',          // Zinc-800 for subtle borders
    primary: '#8A2BE2',         // Electric Violet accent
    success: '#00FF7F',         // Mint Green
    danger: '#FF3366',          // Red
    warning: '#FFA500',         // Orange
    cardAlt: '#18181B',         // Zinc-900 alternate cards
    tabBar: '#0F0F0F',          // Deep Charcoal dock
    tabBarInactive: '#52525B',  // Zinc-600 inactive
});
