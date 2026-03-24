import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ParsedReceipt {
    amount: number;
    date: string;
    title: string;
    categoryType: string;
}

export const parseReceiptWithGemini = async (base64Image: string, apiKey: string): Promise<ParsedReceipt> => {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
Analyze this receipt/invoice. Extract the total final amount, the date, a short title (merchant or business name), and guess the category (choose exactly from: Food, Utilities, Shopping, Transport, Entertainment, Personal, Health, Education, Transfer, Bills, Others). 
Return ONLY a raw JSON object with these exact keys: "amount" (number format), "date" (string YYYY-MM-DD format), "title" (string), "categoryType" (string). 
Do NOT include markdown formatting, backticks, or any other conversation text.
`;

        const imageParts = [
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg",
                },
            },
        ];

        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        let text = response.text();
        
        // Failsafe cleanup ensuring strict JSON isolation.
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        const parsed: ParsedReceipt = JSON.parse(text);
        
        // Safety Fallbacks
        if (isNaN(parsed.amount)) parsed.amount = 0;
        
        return parsed;
    } catch (error) {
        console.error("Gemini Parse Error:", error);
        throw new Error("Failed to parse receipt with AI. Ensure your API key is valid and the image is clear.");
    }
};
export interface ParsedVoiceCommand {
    action: 'ADD_TRANSACTION' | 'ADD_ACCOUNT' | 'ADD_SUBSCRIPTION' | 'UNKNOWN';
    amount?: number;
    title?: string;
    categoryType?: string;
    accountName?: string;
    toAccountName?: string;
    transactionType?: 'income' | 'expense' | 'transfer';
    date?: string; // YYYY-MM-DD
    cycle?: 'monthly' | 'yearly';
    tenureDays?: number;
}

export const parseVoiceCommandWithGemini = async (base64Audio: string, mimeType: string, apiKey: string, activeCategories: string[], activeAccounts: string[]): Promise<ParsedVoiceCommand> => {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
You are a strict financial AI router. Analyze this audio command.
Determine the intended action: 'ADD_TRANSACTION' (expenses, incomes, transfers), 'ADD_ACCOUNT' (creating a new wallet/bank), 'ADD_SUBSCRIPTION' (recurring bills), or 'UNKNOWN'.

User's active categories to match against: ${activeCategories.join(', ')}
User's active accounts to match against: ${activeAccounts.join(', ')}

Extract the data mapping precisely onto these explicit types:
- For ADD_TRANSACTION: "transactionType" ('income', 'expense', or 'transfer'), "amount" (number format), "title" (string, short merchant name), "categoryType" (best match string from list), "accountName" (best match from active accounts list acting as 'From' if transfer), "toAccountName" (best match from active accounts list acting as 'To' if transfer, omit otherwise), "date" (YYYY-MM-DD format if mentioned, otherwise omit).
- For ADD_ACCOUNT: "title" (string, account name), "amount" (number, starting balance).
- For ADD_SUBSCRIPTION: "title" (string, service name), "amount" (number), "tenureDays" (number, numeric exact billing cycle days, e.g. 30 for monthly, 365 for yearly, 14 for biweekly), "date" (YYYY-MM-DD next billing date).

Return ONLY a raw JSON object with the "action" key and extracted data keys. Do NOT include markdown blocks, backticks, or any conversational text.
`;

        const audioParts = [
            {
                inlineData: {
                    data: base64Audio,
                    mimeType: mimeType,
                },
            },
        ];

        const result = await model.generateContent([prompt, ...audioParts]);
        const response = await result.response;
        let text = response.text();
        
        // Failsafe cleanup ensuring strict JSON isolation.
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        const parsed: ParsedVoiceCommand = JSON.parse(text);
        
        return parsed;
    } catch (error) {
        console.error("Gemini Voice Parse Error:", error);
        throw new Error("Failed to process voice command with AI. Please try speaking clearly again.");
    }
};
