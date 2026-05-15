const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 환경변수 확인
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
  console.error('ERROR: OPENAI_API_KEY가 설정되지 않았거나 잘못되었습니다.');
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_URL === 'your_supabase_url_here') {
  console.error('ERROR: SUPABASE 환경변수가 설정되지 않았거나 잘못되었습니다. supabaseKey is required');
}

// 미들웨어
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// OpenAI 및 Supabase 클라이언트 초기화 (키가 없으면 초기화 오류가 발생할 수 있으므로 try-catch로 감싸거나 환경변수 체크 후 초기화)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

const envSupabaseUrl = process.env.SUPABASE_URL;
const supabaseUrl = (!envSupabaseUrl || envSupabaseUrl === 'your_supabase_url_here') ? 'https://dummy.supabase.co' : envSupabaseUrl;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// API 엔드포인트
app.post('/api/analyze', async (req, res) => {
  try {
    const { text } = req.body;

    // 검증
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: '유효한 텍스트를 입력해주세요.' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: '입력 텍스트는 1000자를 초과할 수 없습니다.' });
    }

    // OpenAI 요청
    const systemPrompt = `너는 한국어 텍스트 감성 분석기다.
사용자 텍스트를 positive, negative, neutral 중 하나로 분류한다.
confidence는 0부터 100 사이의 정수로 작성한다.
reason은 한국어로 한 문장만 작성한다.
과장하지 말고 텍스트 근거만 사용한다.
반드시 아래 JSON 형식으로 응답해라:
{
  "sentiment": "positive | negative | neutral",
  "confidence": 0,
  "reason": "string"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const responseContent = completion.choices[0].message.content;
    const result = JSON.parse(responseContent);

    // 정규화 검증
    const validSentiments = ['positive', 'negative', 'neutral'];
    if (!validSentiments.includes(result.sentiment)) {
      result.sentiment = 'neutral';
    }
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 100) {
      result.confidence = 0;
    }

    // Supabase 저장 (실패해도 응답은 성공으로 처리)
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_url_here') {
        const { error } = await supabase
          .from('sentiment_logs')
          .insert([
            {
              input_text: text,
              sentiment: result.sentiment,
              confidence: result.confidence,
              reason: result.reason
            }
          ]);

        if (error) {
          console.error('Supabase insert error:', error);
        }
      }
    } catch (dbError) {
      console.error('Supabase DB operation failed:', dbError);
    }

    res.json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: '분석 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
