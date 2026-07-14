const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function callGeminiVision(imageUrls) {
    if (!GEMINI_API_KEY) throw new Error('Gemini API 키가 설정되지 않았습니다.');
    
    if (!Array.isArray(imageUrls)) {
        imageUrls = [imageUrls];
    }

    const inlineDataParts = [];
    for (const url of imageUrls) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`이미지를 서버에서 불러올 수 없습니다. (삭제되었거나 접근할 수 없는 파일입니다. 상태코드: ${response.status})`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Promise = new Promise(resolve => {
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;
        inlineDataParts.push({ inlineData: { mimeType: blob.type || 'image/jpeg', data: base64Data } });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `이 이미지는 수학 시험지와 학생이 푼 답안입니다. (이미지가 여러 장일 경우 순서대로 연결된 하나의 시험지입니다.) 1번 문제부터 마지막 문제까지 순서대로 판독해주세요.
1. 각 문제의 '정답'(AI가 스스로 푼 올바른 답)을 도출하세요.
2. '학생이 쓴 답'을 인식하세요.
결과는 반드시 순수한 JSON 배열 형태로만 반환해주세요. 다른 텍스트나 마크다운(\`\`\`json 등)은 절대 포함하지 마세요.
형식 예시: [{"q": 1, "correct": "3", "student": "3"}, {"q": 2, "correct": "5", "student": "2"}]`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                ...inlineDataParts
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
    if (data.error) {
        if (data.error.message && data.error.message.includes('Quota exceeded') || res.status === 429) {
            throw new Error('AI 가채점 사용량이 초과되었습니다. (무료 제공 한도 초과) 약 1분 후에 다시 시도해주세요.');
        }
        throw new Error(data.error.message);
    }
    
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

export async function callGeminiVocabOCR(base64Data, mimeType) {
    if (!GEMINI_API_KEY) throw new Error('Gemini API 키가 설정되지 않았습니다.');
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `이 이미지는 영어 단어장 또는 유인물 사진입니다. 
이미지 내의 모든 영어 단어와 그 뜻을 추출해주세요.
결과는 반드시 순수한 JSON 배열 형태로만 반환해주세요. 다른 텍스트나 마크다운(\`\`\`json 등)은 절대 포함하지 마세요.
형식 예시: [{"word": "apple", "meaning": "사과"}, {"word": "book", "meaning": "책"}]`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } }
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
    if (data.error) {
        if (data.error.message && data.error.message.includes('Quota exceeded') || res.status === 429) {
            throw new Error('AI 스캔 사용량이 초과되었습니다. (무료 제공 한도 초과) 약 1분 후에 다시 시도해주세요.');
        }
        throw new Error(data.error.message);
    }
    
    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
}

export async function callGeminiMathSolver(question, base64Data, mimeType) {
    if (!GEMINI_API_KEY) throw new Error('Gemini API 키가 설정되지 않았습니다.');
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    let prompt = `당신은 친절하고 똑똑한 수학 선생님입니다. 
학생이 질문한 수학 문제나 개념에 대해 단계별로 상세히 풀이와 설명을 제공해주세요.
수식은 반드시 마크다운 및 LaTeX 형식으로 작성해주세요. (인라인 수식은 \\( ... \\), 블록 수식은 \\[ ... \\] 또는 $$ ... $$ 사용)
학생이 첨부한 이미지가 있다면 해당 이미지를 분석하여 문제를 풀이해주세요.`;

    if (question) {
        prompt += `\n\n학생 질문: ${question}`;
    }

    const parts = [{ text: prompt }];
    if (base64Data) {
        parts.push({ inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } });
    }

    const payload = {
        contents: [{ parts }],
        generationConfig: {
            temperature: 0.3
        }
    };

    const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error) {
        if (data.error.message && data.error.message.includes('Quota exceeded') || res.status === 429) {
            throw new Error('AI 선생님 답변 사용량이 초과되었습니다. (무료 제공 한도 초과) 약 1분 후에 다시 시도해주세요.');
        }
        throw new Error(data.error.message);
    }
    
    return data.candidates[0].content.parts[0].text;
}

