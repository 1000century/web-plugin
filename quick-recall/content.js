// 복사 방지 해제
(function removeCopyProtection() {
  // 선택/드래그 차단 이벤트 무력화
  ['selectstart', 'dragstart'].forEach(ev => {
    document.addEventListener(ev, e => e.stopImmediatePropagation(), true);
  });

  // 우클릭 메뉴 허용 (사이트의 preventDefault 차단)
  document.addEventListener('contextmenu', e => {
    e.stopImmediatePropagation();
  }, true);

  // copy/cut: 사이트 핸들러가 preventDefault 못 하게 막음
  ['copy', 'cut'].forEach(ev => {
    document.addEventListener(ev, e => {
      e.stopImmediatePropagation();
      e.stopPropagation();
    }, true);
  });

  // keydown으로 Ctrl+C/X 막는 사이트 대응
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && ['c', 'x'].includes(e.key.toLowerCase())) {
      e.stopImmediatePropagation();
    }
  }, true);

  // CSS로 텍스트 선택 강제 허용
  const style = document.createElement('style');
  style.textContent = '* { user-select: text !important; -webkit-user-select: text !important; }';
  document.documentElement.appendChild(style);

  // 확장 UI는 선택 불가 (위 규칙보다 나중에 추가되어야 적용됨)
  const uiStyle = document.createElement('style');
  uiStyle.textContent = '#adhd-quiz-panel,#adhd-quiz-panel *,#adhd-toggle-btn,#adhd-float-btn,#adhd-mobile-nav,#adhd-mobile-nav *{ user-select:none!important; -webkit-user-select:none!important; }';
  document.documentElement.appendChild(uiStyle);
})();

// 패널 HTML 주입
const panel = document.createElement('div');
panel.id = 'adhd-quiz-panel';
panel.innerHTML = `
  <div id="adhd-resize-handle"></div>
  <div id="adhd-panel-header">
    <span>ADHD Quiz</span>
    <div id="adhd-font-controls">
      <button id="adhd-font-down">A-</button>
      <span id="adhd-font-size-label">13px</span>
      <button id="adhd-font-up">A+</button>
    </div>
    <button id="adhd-panel-close">✕</button>
  </div>
  <div id="adhd-api-key-section">
    <div id="adhd-api-key-label">Vertex AI API 키</div>
    <div id="adhd-api-key-row">
      <input type="text" id="adhd-api-key-input" placeholder="AQ.Ab8..." autocomplete="off" />
      <button id="adhd-api-key-save">저장</button>
    </div>
    <div id="adhd-api-key-status"></div>
  </div>
  <div id="adhd-selected-box" class="empty">텍스트를 드래그하거나 영역 선택으로 캡처하세요.</div>
  <div id="adhd-action-row">
    <button id="adhd-pick-btn">🎯 영역 선택</button>
    <button id="adhd-generate-btn" disabled>퀴즈 생성</button>
  </div>
  <button id="adhd-clear-btn" style="display:none">✕ 선택 초기화</button>
  <div id="adhd-status"></div>
  <div id="adhd-quiz-area"></div>
  <div id="adhd-text-modal">
    <div id="adhd-text-modal-box">
      <div id="adhd-text-modal-header">
        <span id="adhd-text-modal-title"></span>
        <div style="display:flex;gap:6px;align-items:center">
          <button id="adhd-text-modal-copy">📋 복사</button>
          <button id="adhd-text-modal-close">✕</button>
        </div>
      </div>
      <div id="adhd-text-modal-body"></div>
    </div>
  </div>
`;
document.documentElement.appendChild(panel);

const toggleBtn = document.createElement('button');
toggleBtn.id = 'adhd-toggle-btn';
toggleBtn.textContent = 'Q';
document.documentElement.appendChild(toggleBtn);

// 패널 토글
function updateToggleBtnPosition() {
  const w = parseInt(panel.style.width) || 340;
  toggleBtn.style.right = panel.classList.contains('open') ? w + 'px' : '0';
}
toggleBtn.addEventListener('click', () => {
  panel.classList.toggle('open');
  updateToggleBtnPosition();
});
document.getElementById('adhd-panel-close').addEventListener('click', () => {
  panel.classList.remove('open');
  updateToggleBtnPosition();
});

// 글자 크기 조절
let fontSize = 13;
chrome.storage.local.get('adhdFontSize', (r) => {
  if (r.adhdFontSize) {
    fontSize = r.adhdFontSize;
    applyFontSize();
  }
});
function applyFontSize() {
  panel.style.fontSize = fontSize + 'px';
  document.getElementById('adhd-font-size-label').textContent = fontSize + 'px';
  chrome.storage.local.set({ adhdFontSize: fontSize });
}
document.getElementById('adhd-font-up').addEventListener('click', () => {
  if (fontSize < 22) { fontSize++; applyFontSize(); }
});
document.getElementById('adhd-font-down').addEventListener('click', () => {
  if (fontSize > 9) { fontSize--; applyFontSize(); }
});

// 리사이즈 핸들 (좌측 드래그로 너비 조절)
const resizeHandle = document.getElementById('adhd-resize-handle');
let isResizing = false;
let startX, startWidth;

chrome.storage.local.get('adhdPanelWidth', (r) => {
  if (r.adhdPanelWidth) {
    panel.style.width = r.adhdPanelWidth + 'px';
    updateToggleBtnPosition();
  }
});

resizeHandle.addEventListener('mousedown', (e) => {
  isResizing = true;
  startX = e.clientX;
  startWidth = panel.offsetWidth;
  document.body.style.userSelect = 'none';
  e.preventDefault();
});
resizeHandle.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  isResizing = true;
  startX = touch.clientX;
  startWidth = panel.offsetWidth;
  e.preventDefault();
}, { passive: false });
document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newWidth = Math.min(700, Math.max(240, startWidth - (e.clientX - startX)));
  panel.style.width = newWidth + 'px';
  updateToggleBtnPosition();
});
document.addEventListener('touchmove', (e) => {
  if (!isResizing) return;
  const touch = e.touches[0];
  const newWidth = Math.min(700, Math.max(240, startWidth - (touch.clientX - startX)));
  panel.style.width = newWidth + 'px';
  updateToggleBtnPosition();
}, { passive: false });
document.addEventListener('mouseup', () => {
  if (!isResizing) return;
  isResizing = false;
  document.body.style.userSelect = '';
  chrome.storage.local.set({ adhdPanelWidth: panel.offsetWidth });
});
document.addEventListener('touchend', () => {
  if (!isResizing) return;
  isResizing = false;
  chrome.storage.local.set({ adhdPanelWidth: panel.offsetWidth });
});

document.getElementById('adhd-clear-btn').addEventListener('click', clearSelection);

// API 키 저장/불러오기

// 플로팅 퀴즈 버튼 생성
const floatBtn = document.createElement('button');
floatBtn.id = 'adhd-float-btn';
floatBtn.textContent = '퀴즈 ▶';
floatBtn.style.cssText = `
  position: fixed; z-index: 2147483647; display: none;
  padding: 4px 10px; background: #5c35ff; color: white;
  border: none; border-radius: 5px; font-size: 12px; font-weight: 600;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  pointer-events: auto;
`;
document.documentElement.appendChild(floatBtn);

let currentText = '';
let selectedBlocks = [];
let selectedEls = [];

function tableToMarkdown(table) {
  const rows = [...table.querySelectorAll('tr')];
  // rowspan/colspan 처리를 위한 2D 그리드
  const grid = [];
  const spans = {}; // {row_col: {rowspan, colspan, text}}

  rows.forEach((tr, ri) => {
    if (!grid[ri]) grid[ri] = [];
    let ci = 0;
    [...tr.querySelectorAll('th,td')].forEach(cell => {
      // 이미 채워진 칸 건너뜀
      while (grid[ri][ci] !== undefined) ci++;
      const text = cell.innerText.trim().replace(/\n+/g, ' ');
      const rowspan = parseInt(cell.getAttribute('rowspan') || '1');
      const colspan = parseInt(cell.getAttribute('colspan') || '1');
      // 스팬 범위에 모두 채움
      for (let r = 0; r < rowspan; r++) {
        for (let c = 0; c < colspan; c++) {
          if (!grid[ri + r]) grid[ri + r] = [];
          grid[ri + r][ci + c] = r === 0 && c === 0 ? text : `↑${text}`;
        }
      }
      ci += colspan;
    });
  });

  // 빈 칸 채우기
  const colCount = Math.max(...grid.map(r => r.length));
  grid.forEach(row => {
    for (let c = 0; c < colCount; c++) {
      if (row[c] === undefined) row[c] = '';
    }
  });

  return grid.map((row, i) => {
    const line = '| ' + row.join(' | ') + ' |';
    if (i === 0) return line + '\n|' + row.map(() => '---|').join('');
    return line;
  }).join('\n');
}

function extractText(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('table').forEach(table => {
    const md = tableToMarkdown(table);
    const placeholder = document.createElement('pre');
    placeholder.textContent = '\n' + md + '\n';
    table.replaceWith(placeholder);
  });
  return clone.innerText?.trim();
}

function clearSelection() {
  selectedEls.forEach(el => { el.style.outline = ''; el.style.backgroundColor = ''; });
  selectedBlocks = [];
  selectedEls = [];
  currentText = '';
  setStatus('');
  renderSelectedBox();
}

// ── DevTools 스타일 피커 ──────────────────────────────
let isPicking = false;
let pickerTarget = null; // 현재 하이라이트된 요소

// 하이라이트 오버레이
const hoverBox = document.createElement('div');
hoverBox.style.cssText = `
  position: absolute; pointer-events: none; z-index: 2147483645;
  border: 2px solid #5c35ff; background: rgba(92,53,255,0.1);
  display: none; box-sizing: border-box; transition: none;
`;
document.documentElement.appendChild(hoverBox);

// 하단 정보 바 (DevTools처럼)
const infoBar = document.createElement('div');
infoBar.style.cssText = `
  position: fixed; bottom: 0; left: 0; right: 0;
  z-index: 2147483647; pointer-events: none;
  background: #1a1a2e; border-top: 1px solid #3a3aff;
  color: #7c7cff; font-size: 12px; font-family: monospace;
  padding: 5px 14px; display: none; align-items: center; gap: 12px;
`;
infoBar.innerHTML = `
  <span id="adhd-info-tag" style="color:#ff7c7c"></span>
  <span id="adhd-info-cls" style="color:#7cffb4"></span>
  <span id="adhd-info-size" style="color:#aaa"></span>
  <span style="color:#555; margin-left:auto">↑↓ 부모/자식 &nbsp; 클릭/Enter 선택 &nbsp; ESC 종료</span>
`;
document.documentElement.appendChild(infoBar);

// 터치 기기 여부
const isMobile = window.matchMedia('(pointer: coarse)').matches;

// 모바일 피커 네비게이션 버튼
const mobileNav = document.createElement('div');
mobileNav.id = 'adhd-mobile-nav';
mobileNav.innerHTML = `
  <button id="adhd-nav-parent">↑ 부모</button>
  <button id="adhd-nav-prev">← 이전</button>
  <button id="adhd-nav-next">→ 다음</button>
  <button id="adhd-nav-child">↓ 자식</button>
  <button id="adhd-nav-confirm">✓ 선택</button>
  <button id="adhd-nav-cancel">✗ 종료</button>
`;
document.documentElement.appendChild(mobileNav);
mobileNav.addEventListener('selectstart', e => e.preventDefault());
mobileNav.addEventListener('mousedown', e => e.preventDefault());

function setPickerTarget(el) {
  if (!el || el === document.documentElement || el === document.body) return;
  if (panel.contains(el) || toggleBtn.contains(el) || mobileNav.contains(el)) return;

  pickerTarget = el;
  const r = el.getBoundingClientRect();

  hoverBox.style.display = 'block';
  hoverBox.style.top    = (r.top + window.scrollY) + 'px';
  hoverBox.style.left   = r.left + 'px';
  hoverBox.style.width  = r.width + 'px';
  hoverBox.style.height = r.height + 'px';

  const tag = el.tagName.toLowerCase();
  const id  = el.id ? `#${el.id}` : '';
  const cls = typeof el.className === 'string'
    ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${c}`).join('')
    : '';
  if (!isMobile) {
    infoBar.style.display = 'flex';
    document.getElementById('adhd-info-tag').textContent  = `<${tag}>`;
    document.getElementById('adhd-info-cls').textContent  = id + cls;
    document.getElementById('adhd-info-size').textContent =
      `${Math.round(r.width)} × ${Math.round(r.height)}`;
  }
}

function startPicker() {
  isPicking = true;
  document.body.style.cursor = 'crosshair';
  document.getElementById('adhd-pick-btn').textContent = '❌ 취소 (ESC)';
  document.getElementById('adhd-pick-btn').style.background = '#ff3a3a';
}

function stopPicker() {
  isPicking = false;
  pickerTarget = null;
  document.body.style.cursor = '';
  hoverBox.style.display = 'none';
  infoBar.style.display = 'none';
  mobileNav.style.display = 'none';
  document.getElementById('adhd-pick-btn').textContent = '🎯 영역 선택';
  document.getElementById('adhd-pick-btn').style.background = '';
}

function removeBlock(index) {
  const el = selectedEls[index];
  if (el) {
    el.style.outline = '';
    el.style.backgroundColor = '';
  }
  selectedBlocks.splice(index, 1);
  selectedEls.splice(index, 1);
  currentText = selectedBlocks.join('\n\n---\n\n');
  renderSelectedBox();
}

function renderSelectedBox() {
  const box = document.getElementById('adhd-selected-box');
  const generateBtn = document.getElementById('adhd-generate-btn');
  const clearBtn = document.getElementById('adhd-clear-btn');

  if (selectedBlocks.length === 0) {
    box.innerHTML = '';
    box.textContent = '텍스트를 드래그하거나 영역 선택으로 캡처하세요.';
    box.classList.add('empty');
    generateBtn.disabled = true;
    clearBtn.style.display = 'none';
    return;
  }

  box.classList.remove('empty');
  box.innerHTML = '';
  generateBtn.disabled = false;
  clearBtn.style.display = 'block';

  selectedBlocks.forEach((text, i) => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex; align-items: flex-start; gap: 6px;
      padding: 5px 0; border-bottom: 1px solid #1e1e2e;
    `;
    const preview = document.createElement('span');
    preview.style.cssText = 'flex:1; font-size:11px; color:#aaa; line-height:1.4; word-break:break-all; cursor:pointer;';
    preview.textContent = `${i + 1}. ` + text.slice(0, 60).replace(/\n/g, ' ') + (text.length > 60 ? '…' : '');
    preview.title = '클릭해서 전체 내용 보기';
    preview.addEventListener('click', () => openTextModal(text, i + 1));

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.style.cssText = `
      background: none; border: none; color: #ff6b6b;
      cursor: pointer; font-size: 12px; padding: 0 2px; flex-shrink: 0;
    `;
    removeBtn.addEventListener('click', () => removeBlock(i));

    item.appendChild(preview);
    item.appendChild(removeBtn);
    box.appendChild(item);
  });
}

function confirmSelection() {
  if (!pickerTarget) return;
  if (mobileNav.contains(pickerTarget)) return; // 안전장치: nav 버튼이 target이면 무시
  const el = pickerTarget;
  const text = extractText(el);
  const existingIdx = selectedBlocks.indexOf(text);

  if (existingIdx !== -1) {
    // 이미 선택된 요소 → 취소
    removeBlock(existingIdx);
    setStatus(`${selectedBlocks.length}개 선택됨`);
    return;
  }

  if (text && text.length > 0) {
    selectedBlocks.push(text);
    el.style.outline = '2px solid #5c35ff';
    el.style.backgroundColor = 'rgba(92,53,255,0.08)';
    selectedEls.push(el);
    currentText = selectedBlocks.join('\n\n---\n\n');
    renderSelectedBox();
    setStatus(`${selectedBlocks.length}개 선택됨 — ${isMobile ? '탭으로 계속 선택' : '계속 클릭하거나 ESC로 종료'}`);
    if (isMobile) mobileNav.style.display = 'none';
    else { panel.classList.add('open'); updateToggleBtnPosition(); }
  }
}

document.getElementById('adhd-pick-btn').addEventListener('click', () => {
  isPicking ? stopPicker() : startPicker();
});

// 모바일 네비게이션 버튼
document.getElementById('adhd-nav-parent').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!pickerTarget) return;
  const parent = pickerTarget.parentElement;
  if (parent && parent !== document.body && parent !== document.documentElement) setPickerTarget(parent);
});
document.getElementById('adhd-nav-child').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!pickerTarget) return;
  const child = [...pickerTarget.children].find(c => c.offsetWidth > 0);
  if (child) setPickerTarget(child);
});
document.getElementById('adhd-nav-prev').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!pickerTarget) return;
  const prev = pickerTarget.previousElementSibling;
  if (prev) setPickerTarget(prev);
});
document.getElementById('adhd-nav-next').addEventListener('click', (e) => {
  e.stopPropagation();
  if (!pickerTarget) return;
  const next = pickerTarget.nextElementSibling;
  if (next) setPickerTarget(next);
});
document.getElementById('adhd-nav-confirm').addEventListener('click', (e) => {
  e.stopPropagation();
  confirmSelection();
});
document.getElementById('adhd-nav-cancel').addEventListener('click', (e) => {
  e.stopPropagation();
  stopPicker();
});

// 키보드 네비게이션
document.addEventListener('keydown', (e) => {
  if (!isPicking) return;

  if (e.key === 'Escape') {
    stopPicker();
    return;
  }
  if (!pickerTarget) return;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const parent = pickerTarget.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      setPickerTarget(parent);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const child = [...pickerTarget.children].find(c => c.offsetWidth > 0);
    if (child) setPickerTarget(child);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const prev = pickerTarget.previousElementSibling;
    if (prev) setPickerTarget(prev);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    const next = pickerTarget.nextElementSibling;
    if (next) setPickerTarget(next);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    confirmSelection();
  }
}, true);

// 마우스 이동 → e.target 그대로 하이라이트 (elementFromPoint 동작과 동일)
document.addEventListener('mousemove', (e) => {
  if (!isPicking) return;
  if (panel.contains(e.target) || toggleBtn.contains(e.target) || mobileNav.contains(e.target)) return;
  setPickerTarget(e.target);
}, true);

// 터치 이동 → 데스크탑 터치 전용 (모바일은 탭 방식 사용)
document.addEventListener('touchmove', (e) => {
  if (!isPicking || isMobile) return;
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (!target || panel.contains(target) || toggleBtn.contains(target)) return;
  setPickerTarget(target);
  e.preventDefault();
}, { passive: false, capture: true });

// 클릭 → 선택 확정
document.addEventListener('click', (e) => {
  if (!isPicking) return;
  if (panel.contains(e.target) || toggleBtn.contains(e.target) || mobileNav.contains(e.target)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  confirmSelection();
}, true);

// 터치 시작 좌표 기록 (스크롤 vs 탭 구분용)
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', (e) => {
  if (!isPicking) return;
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true, capture: true });

// 터치탭 → 모바일: 미리보기 + 네비 버튼 표시 / 데스크탑: 바로 선택 확정
document.addEventListener('touchend', (e) => {
  if (!isPicking) return;
  if (isResizing) return;
  if (panel.contains(e.target) || toggleBtn.contains(e.target)) return;
  if (mobileNav.contains(e.target)) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if (isMobile) {
    const touch = e.changedTouches[0];
    // 10px 이상 이동했으면 스크롤로 판단 → 무시
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    if (dx > 10 || dy > 10) return;
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && !panel.contains(target) && !toggleBtn.contains(target) && !mobileNav.contains(target)) {
      setPickerTarget(target);
      mobileNav.style.display = 'flex';
    }
  } else {
    confirmSelection();
  }
}, { capture: true });
// ─────────────────────────────────────────────────────

function showFloatBtnForSelection() {
  setTimeout(() => {
    const selected = window.getSelection()?.toString().trim();
    if (selected && selected.length > 1) {
      const sel = window.getSelection();
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      floatBtn.style.left = Math.min(rect.left + rect.width / 2 - 30, window.innerWidth - 100) + 'px';
      floatBtn.style.top = (rect.top - 36 + window.scrollY) + 'px';
      floatBtn.style.position = 'absolute';
      floatBtn.style.display = 'block';
      floatBtn._pendingText = selected;
    }
  }, 100);
}

document.addEventListener('mouseup', (e) => {
  if (isPicking) return;
  if (panel.contains(e.target) || toggleBtn.contains(e.target) || floatBtn.contains(e.target)) return;
  floatBtn.style.display = 'none';
  showFloatBtnForSelection();
});

// 터치로 텍스트 선택 후 플로팅 버튼 표시
document.addEventListener('touchend', (e) => {
  if (isPicking) return;
  if (isResizing) return;
  if (panel.contains(e.target) || toggleBtn.contains(e.target) || floatBtn.contains(e.target)) return;
  floatBtn.style.display = 'none';
  showFloatBtnForSelection();
});

// 플로팅 버튼 클릭 시 퀴즈 패널로 전달
floatBtn.addEventListener('mousedown', (e) => {
  e.preventDefault(); // 선택 해제 방지
});
floatBtn.addEventListener('touchstart', (e) => {
  e.preventDefault(); // 터치 시 선택 해제 방지
}, { passive: false });
floatBtn.addEventListener('click', () => {
  const text = floatBtn._pendingText;
  floatBtn.style.display = 'none';
  if (!text || selectedBlocks.includes(text)) return;

  selectedBlocks.push(text);
  currentText = selectedBlocks.join('\n\n---\n\n');
  renderSelectedBox();
  setStatus(`${selectedBlocks.length}개 선택됨`);
  panel.classList.add('open');
  updateToggleBtnPosition();
});

// 다른 곳 클릭/터치 시 버튼 숨김
document.addEventListener('mousedown', (e) => {
  if (!floatBtn.contains(e.target)) floatBtn.style.display = 'none';
});
document.addEventListener('touchstart', (e) => {
  if (!floatBtn.contains(e.target)) floatBtn.style.display = 'none';
}, { passive: true });

// 퀴즈 생성
document.getElementById('adhd-generate-btn').addEventListener('click', async () => {
  if (!currentText) return;
  const btn = document.getElementById('adhd-generate-btn');
  btn.disabled = true;
  setStatus('생성 중...');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GENERATE_QUIZ',
      text: currentText,
    });
    if (!response?.ok) throw new Error(response?.error || '알 수 없는 오류');
    renderQuizzes(response.quizzes);
    setStatus('');
  } catch (err) {
    setStatus('오류: ' + err.message);
  } finally {
    btn.disabled = false;
  }
});

function renderQuizzes(quizzes) {
  const area = document.getElementById('adhd-quiz-area');
  area.innerHTML = '';
  quizzes.forEach((quiz, i) => {
    const card = document.createElement('div');
    card.className = 'adhd-quiz-card';
    card.innerHTML = `
      <span class="adhd-type-badge adhd-type-${quiz.type}">${quiz.type === 'OX' ? 'O/X' : '단답형'}</span>
      <div class="adhd-question">Q${i + 1}. ${quiz.question}</div>
      <button class="adhd-answer-btn">정답 보기</button>
      <div class="adhd-answer-reveal">정답: ${quiz.answer}</div>
    `;
    card.querySelector('.adhd-answer-btn').addEventListener('click', (e) => {
      card.querySelector('.adhd-answer-reveal').style.display = 'block';
      e.target.style.display = 'none';
    });
    area.appendChild(card);
  });
}

function setStatus(msg) {
  document.getElementById('adhd-status').textContent = msg;
}

// 텍스트 전체보기 모달
const textModal = document.getElementById('adhd-text-modal');

function openTextModal(text, index) {
  document.getElementById('adhd-text-modal-title').textContent = `선택 ${index}번 전체 내용`;
  document.getElementById('adhd-text-modal-body').textContent = text;
  textModal.style.display = 'flex';
}

document.getElementById('adhd-text-modal-close').addEventListener('click', () => {
  textModal.style.display = 'none';
});
textModal.addEventListener('click', (e) => {
  if (e.target === textModal) textModal.style.display = 'none';
});
document.getElementById('adhd-text-modal-copy').addEventListener('click', () => {
  const text = document.getElementById('adhd-text-modal-body').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('adhd-text-modal-copy');
    btn.textContent = '✓ 복사됨';
    setTimeout(() => { btn.textContent = '📋 복사'; }, 1500);
  });
});

// API 키 관리
const apiKeySection = document.getElementById('adhd-api-key-section');
const apiKeyInput   = document.getElementById('adhd-api-key-input');
const apiKeyStatus  = document.getElementById('adhd-api-key-status');

function updateApiKeySection(saved) {
  if (saved) {
    apiKeySection.classList.add('has-key');
    apiKeyStatus.textContent = '✓ 저장됨';
    apiKeyInput.value = '';
    apiKeyInput.placeholder = '변경하려면 새 키 입력';
  } else {
    apiKeySection.classList.remove('has-key');
    apiKeyStatus.textContent = '';
  }
}

chrome.storage.local.get('adhdApiKey', (r) => updateApiKeySection(!!r.adhdApiKey));

document.getElementById('adhd-api-key-save').addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  chrome.storage.local.set({ adhdApiKey: key }, () => {
    updateApiKeySection(true);
  });
});
