# Vertex AI Express Mode 설정 기록

## GCP 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 프로젝트 ID | `your-project-id` |
| 프로젝트 번호 | `123456789012` |
| 프로젝트 이름 | `your-project-name` |
| 조직 ID | `123456789012` |
| 계정 | `your-account@gmail.com` |

---

## Service Account

| 항목 | 값 |
|------|-----|
| 이름 | `your-sa-name` |
| 이메일 | `your-sa-name@your-project-id.iam.gserviceaccount.com` |
| 역할 | `roles/aiplatform.user`, `roles/aiplatform.expressUser` |

---

## API 키

| 항목 | 값 |
|------|-----|
| 이름 | `your-api-key-name` |
| 키 값 | ⚠️ 기밀 — GCP 콘솔 > Vertex AI > API 키에서 확인 (코드에 하드코딩 안 함, 사용자가 패널에서 직접 입력) |
| Bound SA | `your-sa-name@your-project-id.iam.gserviceaccount.com` |
| 제한 | `aiplatform.googleapis.com` |

---

## 비활성화한 Org Policy

키 생성이 조직 정책으로 막혀있어서 아래 3개 비활성화함.

```bash
cat > /tmp/policy.json << 'EOF'
{
  "name": "organizations/YOUR_ORG_ID/policies/iam.managed.disableServiceAccountApiKeyCreation",
  "spec": {"rules": [{"enforce": false}]}
}
EOF
gcloud org-policies set-policy /tmp/policy.json
```

| 정책 | 상태 |
|------|------|
| `iam.managed.disableServiceAccountApiKeyCreation` | enforce: false |
| `iam.disableServiceAccountKeyCreation` | enforce: false |
| `iam.managed.disableServiceAccountKeyCreation` | enforce: false |

---

## API 엔드포인트

```
POST https://aiplatform.googleapis.com/v1/publishers/google/models/{MODEL}:generateContent?key={API_KEY}
```

- 프로젝트/리전 경로 없음 (Express Mode 전용 형식)
- 모델: `gemini-3-flash-preview`

---

## 설정 순서 (재현 시)

1. GCP 프로젝트에 `aiplatform.googleapis.com` 활성화
2. Service Account 생성 + `roles/aiplatform.expressUser` 부여
3. Org Policy 3개 비활성화 (조직 관리자 권한 필요)
4. Vertex AI 콘솔 → API 키 메뉴에서 SA bound API 키 생성
5. 확장 패널에서 API 키 직접 입력 → `chrome.storage.local`에 저장 (코드에 하드코딩 없음)

```bash
gcloud services api-keys create \
  --project=your-project-id \
  --display-name="your-api-key-name" \
  --service-account=your-sa-name@your-project-id.iam.gserviceaccount.com \
  --api-target=service=aiplatform.googleapis.com
```
