document.addEventListener('DOMContentLoaded', () => {
  const textInput = document.getElementById('text-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const errorBox = document.getElementById('error-box');
  const errorMessage = document.getElementById('error-message');
  const resultCard = document.getElementById('result-card');
  const sentimentLabel = document.getElementById('sentiment-label');
  const confidenceLabel = document.getElementById('confidence-label');
  const reasonText = document.getElementById('reason-text');

  const SENTIMENT_MAP = {
    'positive': { text: '긍정', class: 'sentiment-positive' },
    'negative': { text: '부정', class: 'sentiment-negative' },
    'neutral': { text: '중립', class: 'sentiment-neutral' }
  };

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove('hidden');
    resultCard.classList.add('hidden');
  }

  function hideError() {
    errorBox.classList.add('hidden');
  }

  function showResult(data) {
    const { sentiment, confidence, reason } = data;
    const mapping = SENTIMENT_MAP[sentiment] || { text: '알 수 없음', class: '' };

    sentimentLabel.textContent = mapping.text;
    sentimentLabel.className = `sentiment-badge ${mapping.class}`;
    confidenceLabel.textContent = `신뢰도 ${confidence}%`;
    reasonText.textContent = reason;

    resultCard.classList.remove('hidden');
  }

  function setLoading(isLoading) {
    if (isLoading) {
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = '분석 중...';
      hideError();
      resultCard.classList.add('hidden');
    } else {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = '분석하기';
    }
  }

  analyzeBtn.addEventListener('click', async () => {
    const text = textInput.value.trim();
    if (!text) {
      showError('분석할 문장을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '서버 응답 오류가 발생했습니다.');
      }

      showResult(data);
    } catch (err) {
      console.error(err);
      showError(err.message || '네트워크 또는 서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  });
});
