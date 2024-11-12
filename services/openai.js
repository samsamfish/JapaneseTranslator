import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function improveText(text, prompt, style = 'general') {
    try {
        const userPrompt = prompt.user.replace('{{style}}', style);
        
        const completion = await openai.chat.completions.create({
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