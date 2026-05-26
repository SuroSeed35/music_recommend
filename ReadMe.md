# 오노추 (오늘의 노래 추천)

> 하루 한 곡, 친구들과 나누는 음악 일기
> 매일 자신만의 노래를 기록하고, 친구·그룹과 함께 음악 취향을 공유하는 소셜 음악 기록 웹 플랫폼

---

## 프로젝트 소개

**오노추(Music Recommend)** 는 매일 한 곡씩 자신의 노래를 기록하고, 친구 및 그룹과 함께 음악 취향을 공유할 수 있는 **소셜 음악 기록 웹 플랫폼**입니다.

유튜브 URL을 통해 손쉽게 노래를 등록하고, 캘린더로 나의 음악 기록을 한눈에 모아볼 수 있으며, 친구·그룹 기능과 댓글·푸시 알림을 통해 사용자 간 실시간 소통이 가능합니다.

---

## 주요 기능

### 회원 관리 & 이메일 인증
- **Resend API 기반** 이메일 인증 회원가입 (6자리 코드, 5분 유효, 60초 재전송 쿨다운)
- 영문/숫자/특수문자 포함 8자 이상 비밀번호 정책
- 아이디는 영문·숫자·언더바·점만 허용
- 자동 로그인 (1년간 쿠키 유지)

### 오늘의 노래 기록
- 유튜브 URL 입력만으로 썸네일·제목 자동 추출 (YouTube Data API v3)
- 오늘의 한마디 작성 (50자 제한, 실시간 카운팅)
- **하루 한 곡** 등록 정책 (이미 등록 시 자동으로 리스트 페이지 이동)

### 음악 캘린더
- 월별 노래 등록 기록을 클로버 아이콘으로 시각화
- 날짜 선택 시 해당 날의 추천 곡 카드 표시
- 카테고리 드롭다운으로 **개인 / 그룹별** 필터링 가능

### 소셜 및 그룹 기능
- 친구 검색·신청·수락 (스와이프 제스처 지원)
- 비공개 계정 설정 (`is_private` 토글)
- 그룹(클럽) 생성·멤버 초대 및 권한(admin/member) 관리
- 메인 그룹 설정으로 피드 필터링

### 소통 기능
- 노래별 댓글 작성/삭제 (그룹 컨텍스트 분리)
- 당일 추천 곡에만 댓글 작성 가능
- 썸네일 위 **롤링 댓글** 자동 노출

### 미디어 플레이어
- **YouTube IFrame API** 기반 인앱 재생
- 전체 재생 / 미니 플레이어 / 풀스크린 확장 모드
- 큐 리스트로 곡 순서 조작 및 점프 재생

### 푸시 알림 (FCM v1)
- 친구 요청·수락, 그룹 초대, 새 노래 추천 시 실시간 알림
- 웹 푸시 & 안드로이드 네이티브 모두 지원
- Firebase Service Worker로 백그라운드 알림 처리

### 마이페이지
- 프로필(닉네임·아이디·소개글·비공개 여부) 수정
- D-Day 카운터 / GitHub 스타일 잔디 출석 그리드
- 주간 캘린더로 과거 추천 곡 조회

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | PHP 7+ |
| **Database** | MySQL |
| **Email** | Resend API (HTTPS 기반, SMTP 차단 환경 대응) |
| **Push** | Firebase Cloud Messaging (FCM HTTP v1) |
| **External API** | YouTube Data API v3, YouTube IFrame Player API |
| **Library** | PHPMailer (레거시 보존용) |

---

## 프로젝트 폴더 구조

```
music_recommend/
├── index.php              # 진입점 (로그인/추천 여부에 따라 라우팅)
├── firebase-messaging-sw.js  # 웹 푸시 서비스 워커
│
├── html/                  # UI 페이지
│   ├── login.html         # 로그인
│   ├── signup.html        # 회원가입 (이메일 인증 포함)
│   ├── main.html          # 오늘의 노래 추천
│   ├── music_list.html    # 피드 + 미니 플레이어
│   ├── calendar.html      # 음악 캘린더
│   ├── friend_list.html   # 친구/그룹 관리
│   └── mypage.html        # 마이페이지
│
├── css/                   # 페이지별 스타일시트
│   ├── login.css
│   ├── signup.css
│   ├── main.css
│   ├── music_list.css
│   ├── calendar.css
│   ├── friend_list.css
│   └── mypage.css
│
├── js/                    # 프론트엔드 스크립트
│   ├── script.js          # 로그인/회원가입 공통
│   ├── main.js            # 노래 등록 + FCM 토큰 발급
│   ├── music_list.js      # 피드 + 미디어 플레이어 + 댓글
│   ├── calendar.js
│   ├── friend_list.js
│   └── mypage.js
│
├── php/                   # 백엔드 API
│   ├── db_config.php      # DB 연결 + 자동 로그인 복구
│   ├── api.php            # 통합 API 엔드포인트 (CRUD)
│   ├── login.php
│   ├── signup.php
│   ├── logout.php
│   ├── save_song.php      # 노래 저장 + 친구 알림 발송
│   ├── send_verification.php  # 이메일 인증 코드 발송
│   ├── verify_code.php    # 인증 코드 검증
│   ├── mail_config.php    # Resend API 키 (Git 제외)
│   ├── fcm_v1_send.php    # FCM HTTP v1 발송 모듈
│   ├── firebase_key.json  # FCM 서비스 계정 키 (Git 제외)
│   ├── mypage_api.php
│   ├── mypage_update.php
│   ├── update_comment.php
│   ├── update_token.php   # FCM 토큰 DB 저장
│   ├── fetch_calendar.php
│   ├── fetch_my_groups.php
│   ├── .htaccess          # 민감 파일 직접 접근 차단
│   └── libs/PHPMailer/    # 외부 라이브러리
│
└── img/                   # 아이콘 및 이미지 자원
    ├── logo.png
    ├── clover.png         # 출석 아이콘
    ├── user-profile.jpg
    ├── group-profile.jpg
    └── ...
```

---

## 데이터베이스 스키마 요약

| 테이블 | 역할 |
|--------|------|
| `users` | 사용자 정보, 프로필(bio·dday), `current_song_id`, `main_group_id`, `is_private`, `fcm_token` |
| `songs` | 등록 곡 정보(URL·제목·썸네일·한마디·log_date/log_time) |
| `friends` | 친구 관계 (`status`: pending / accepted) |
| `club_groups` | 그룹 채널 (`group_name`, `group_profile_img`) |
| `group_members` | 그룹 멤버 + 권한(admin / member) |
| `song_comments` | 곡별 댓글 (그룹 컨텍스트 `group_id` 포함, soft delete) |
| `email_verifications` | 이메일 인증 코드 해시 + 만료시간 + 시도횟수 |

전체 DDL은 `오노추 DB.txt` 파일을 참고하세요.

---

## 설치 및 실행

### 1. 사전 요구사항
- PHP 7.4 이상 (mysqli, curl, openssl 확장 필요)
- MySQL 5.7 이상
- 웹 서버 (Apache 권장, mod_rewrite 활성화)

### 2. 데이터베이스 준비
```sql
CREATE DATABASE music_recommend CHARACTER SET utf8mb4;
-- `오노추 DB.txt`의 최종 DDL 블록을 순서대로 실행
```

### 3. 설정 파일 작성
**`php/db_config.php`**
```php
$host = "localhost";
$user = "본인_DB_사용자";
$pass = "본인_DB_비밀번호";
$dbName = "music_recommend";
```

**`php/mail_config.php`** (Resend API)
```php
return [
    'api_key'     => 're_본인_RESEND_API_KEY',
    'from_email'  => 'onboarding@resend.dev',
    // ...
];
```

**`php/firebase_key.json`** — Firebase 콘솔에서 서비스 계정 키 다운로드 후 배치

**`js/main.js`** — YouTube Data API 키 및 Firebase Config 입력
```js
const API_KEY = '본인_YOUTUBE_API_KEY';
const firebaseConfig = { /* Firebase 콘솔 설정값 */ };
```

### 4. 보안 설정
- `php/.htaccess`로 `mail_config.php`, `db_config.php`, `firebase_key.json` 직접 접근 차단 (이미 설정됨)
- `.gitignore`에 민감 파일 반드시 추가

### 5. 실행
웹 서버 루트에 업로드 후 `http://yourdomain.com/index.php` 접속

---

## 보안 고려사항

- 비밀번호는 `password_hash()` (bcrypt) 단방향 암호화
- 인증 코드는 SHA-256 해시 저장 + `hash_equals()` 타이밍 공격 방지
- SQL Injection 방어: `mysqli_real_escape_string()` 및 prepared statement
- XSS 방어: 출력 시 `htmlspecialchars()` / JS `escapeHtml()` 적용
- 인증 시도 횟수 제한 (최대 5회) + 60초 재전송 쿨다운

---

## 주요 특징

- **모바일 우선 반응형 UI** (최대 너비 400px 기준)
- **터치 제스처 지원**: 스와이프, 드래그, 풀스크린 토글
- **오프라인 친화적**: 자동 로그인 쿠키 + 세션 복구
- **닷홈 호스팅 환경 최적화**: SMTP 포트 차단을 우회하기 위해 HTTPS 기반 Resend API 채택

---

## 라이선스

본 프로젝트는 학습 및 포트폴리오 목적으로 제작되었습니다.
사용된 외부 라이브러리(PHPMailer 등)는 각자의 라이선스를 따릅니다.

---

> *"오늘 당신의 하루를 한 곡으로 남겨보세요."*
