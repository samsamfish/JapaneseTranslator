import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const getApiKey = () => {
    // 檢查不同來源的 API Key
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
        console.error('環境變數中找不到 OPENAI_API_KEY');
        throw new Error('請設置 OPENAI_API_KEY 環境變數');
    }
    
    return apiKey;
};

let openaiInstance = null;

try {
    openaiInstance = new OpenAI({
        apiKey: getApiKey(),
        dangerouslyAllowBrowser: true  // 允許在瀏覽器端使用
    });
} catch (error) {
    console.error('OpenAI 初始化錯誤:', error);
    throw new Error('OpenAI 服務初始化失敗');
}

export async function improveText(text, prompt, style = 'general') {
    if (!openaiInstance) {
        throw new Error('OpenAI 服務未正確初始化');
    }

    try {
        const userPrompt = prompt.user.replace('{{style}}', style);
        
        const completion = await openaiInstance.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: prompt.system },
                { role: "user", content: `${userPrompt}\n${text}` }
            ],
            temperature: 0.7,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API 錯誤:', error);
        throw new Error('翻譯服務暫時無法使用');
    }
} 