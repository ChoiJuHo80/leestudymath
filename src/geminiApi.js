const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function callGeminiVision(imageUrl) {
    if (!GEMINI_API_KEY) throw new Error('Gemini API 키가 설정되지 않았습니다.');
    
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const reader = new FileReader();
    const base64Promise = new Promise(resolve => {
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
    });
    reader.readAsDataURL(blob);
    const base64Data = await base64Promise;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `이 이미지는 수학 시험지와 학생이 푼 답안입니다. 1번 문제부터 마지막 문제까지 순서대로 판독해주세요.
1. 각 문제의 '정답'(AI가 스스로 푼 올바른 답)을 도출하세요.
2. '학생이 쓴 답'을 인식하세요.
결과는 반드시 순수한 JSON 배열 형태로만 반환해주세요. 다른 텍스트나 마크다운(\`\`\`json 등)은 절대 포함하지 마세요.
형식 예시: [{"q": 1, "correct": "3", "student": "3"}, {"q": 2, "correct": "5", "student": "2"}]`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: blob.type || 'image/jpeg', data: base64Data } }
            ]
        }],
        generationConfig: {
            temperature: 0.1
        }
    };

    const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}
