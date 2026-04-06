const MODEL = "gemini-3-flash-preview";

async function generateQuiz(text) {
  const { adhdApiKey } = await chrome.storage.local.get('adhdApiKey');
  if (!adhdApiKey) throw new Error('API 키가 설정되지 않았습니다. 패널에서 키를 입력해주세요.');

  const prompt = `다음 학습 텍스트로 퀴즈 3~5개를 만들어줘. JSON만 응답해.
형식: [{"type":"OX","question":"질문","answer":"O"},{"type":"short","question":"질문","answer":"정답"}]
텍스트:\n${text}`;

  const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${MODEL}:generateContent?key=${adhdApiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Gemini API 오류");

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(raw);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GENERATE_QUIZ") {
    generateQuiz(message.text)
      .then(quizzes => sendResponse({ ok: true, quizzes }))
      .catch(err   => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
