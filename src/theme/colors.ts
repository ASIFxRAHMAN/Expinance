export const PREDEFINED_THEMES = [
    { name: 'Indigo', color: '#6366F1' },
    { name: 'Amethyst', color: '#9B59B6' },
    { name: 'Rose', color: '#F43F5E' },
    { name: 'Amber', color: '#F59E0B' },
    { name: 'Emerald', color: '#10B981' },
    { name: 'Ocean', color: '#0EA5E9' }
];

export const getContrastColor = (hexColor: string) => {
    let hex = hexColor.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    return luminance > 0.5 ? '#18181B' : '#FFFFFF';
};

export const getReadableColor = (hexColor: string, isDarkMode: boolean) => {
    let hex = hexColor.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    
    if (isDarkMode) {
        return luminance < 0.2 ? '#FFFFFF' : hexColor;
    } else {
        return luminance > 0.8 ? '#18181B' : hexColor;
    }
};

export const getColors = (isDark: boolean, themeColor: string = '#9B59B6') => {
    return isDark ? {
        background: '#000000',      // True Black background
        card: '#0F0F0F',            // Deep Charcoal for Bento cards
        text: '#FFFFFF',            // Pure white text
        subText: '#A1A1AA',         // Zinc-400 for metadata
        border: '#27272A',          // Zinc-800 for subtle borders
        primary: themeColor,        // Dynamic accent color
        success: '#00FF7F',         // Mint Green
        danger: '#FF3366',          // Red
        warning: '#FFA500',         // Orange
        cardAlt: '#18181B',         // Zinc-900 alternate cards
        tabBar: '#0F0F0F',          // Deep Charcoal dock
        tabBarInactive: '#52525B',  // Zinc-600 inactive
    } : {
        background: '#F4F4F5',      // Zinc-100 premium off-white
        card: '#FFFFFF',            // Pure white bento cards
        text: '#18181B',            // Zinc-900 deep text
        subText: '#71717A',         // Zinc-500 metadata
        border: '#E4E4E7',          // Zinc-200 subtle borders
        primary: themeColor,        // Dynamic accent color
        success: '#10B981',         // Emerald-500
        danger: '#EF4444',          // Red-500
        warning: '#F59E0B',         // Amber-500
        cardAlt: '#FAFAFA',         // Zinc-50 alternate cards
        tabBar: '#FFFFFF',          // Pure white dock
        tabBarInactive: '#A1A1AA',  // Zinc-400 inactive
    };
};
