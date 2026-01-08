# 설정 및 빌드 (Configuration & Build)

> **최종 업데이트**: 2026-01-07
> **상태**: 활성
> **네비게이션**: [이전: 데이터베이스](../08-database/) | [상위: 목차](../INDEX.md)

---

이 문서는 LOGOS 프로젝트의 설정 파일과 빌드 도구에 대한 종합적인 설명서입니다. 각 섹션은 개별 설정 파일의 목적, 구조, 그리고 시스템 내에서의 역할을 설명합니다.

---

## 목차

1. [Electron 빌드](#1-electron-빌드)
   - [Electron-Vite 설정](#11-electron-vite-빌드-설정)
   - [아이콘 생성](#12-아이콘-생성-스크립트)
   - [로고 변환](#13-로고-변환-스크립트)
2. [Vite 설정](#2-vite-설정)
   - [Vitest 설정](#21-vitest-설정)
3. [Playwright 테스트](#3-playwright-테스트)
   - [E2E 테스트 설정](#31-playwright-e2e-테스트-설정)
   - [Electron 테스트 헬퍼](#32-electron-테스트-헬퍼-모듈)
4. [스크립트](#4-스크립트)
   - [Prisma 시드 스크립트](#41-prisma-데이터베이스-시드-스크립트)
   - [IPC 스키마](#42-ipc-요청응답-스키마)
   - [공유 타입 정의](#43-공유-ipc-타입-정의)

---

## 1. Electron 빌드

### 1.1 Electron-Vite 빌드 설정

> **코드 위치**: `electron.vite.config.ts`

#### 컨텍스트 및 목적

이 설정 파일은 전체 LOGOS 데스크톱 애플리케이션의 **빌드 오케스트레이터(build orchestrator)** 입니다. 이것은 electron-vite에게 함께 작동해야 하는 근본적으로 다른 세 가지 유형의 코드를 어떻게 컴파일하고 번들링할지 알려줍니다: 메인 프로세스(백엔드), 프리로드 스크립트(보안 브릿지), 그리고 렌더러(프론트엔드 UI).

**비즈니스 요구사항**: LOGOS는 Electron으로 구축된 언어 학습 데스크톱 애플리케이션입니다. Electron을 사용하는 데스크톱 앱은 고유한 도전에 직면합니다 - Node.js 백엔드 코드와 브라우저 기반 React UI를 동시에 실행해야 하며, 이들 사이에 보안 브릿지가 필요합니다.

**사용 시점**: 개발자가 `npm run dev`(개발 모드), `npm run build`(프로덕션 빌드), 또는 `npm run preview`(프로덕션 빌드 미리보기)를 실행할 때마다.

#### 아키텍처 역할

```
애플리케이션 아키텍처:
==========================
[Build Layer]     <-- electron.vite.config.ts (현재 위치)
      |
      v
[Main Process]    <-- src/main/index.ts (Node.js/Electron)
      |
      v (IPC Bridge)
[Preload Script]  <-- src/main/preload.ts (보안 샌드박스)
      |
      v (contextBridge)
[Renderer]        <-- src/renderer/ (React/Browser)
```

#### 3-프로세스 아키텍처

LOGOS는 모든 Electron 앱처럼 이 설정이 오케스트레이션하는 세 개의 별개 JavaScript 컨텍스트를 실행합니다:

1. **메인 프로세스** (Node.js 환경)
   - Node.js API, 파일 시스템, 네이티브 모듈에 대한 전체 액세스
   - 윈도우, 메뉴, 시스템 트레이, 앱 수명주기 관리
   - Prisma/better-sqlite3를 통한 데이터베이스 작업 처리

2. **프리로드 스크립트** (샌드박스화된 브릿지)
   - 렌더러 로드 전에 격리된 컨텍스트에서 실행
   - 메인 프로세스 기능을 렌더러에 안전하게 노출하는 유일한 방법
   - `contextBridge.exposeInMainWorld()`를 사용하여 `window.logos` API 생성

3. **렌더러 프로세스** (브라우저 환경)
   - 표준 웹 환경 - Node.js 액세스 없음 (보안을 위해)
   - UI를 위한 React 애플리케이션 실행
   - 프리로드 API를 통해서만 메인 프로세스와 통신

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **externalizeDepsPlugin()** | node_modules의 모든 의존성을 외부로 표시하여 번들링 방지 | 호텔 가구를 가방에 넣지 않는 것 - 도착하면 거기 있음 |
| **resolve.alias** | 빌드 시간에 임포트 경로를 변환하는 경로 매핑 | 전화에 바로가기 설정 - `@core`는 항상 `src/core` |
| **프리로드 스크립트** | 격리된 컨텍스트에서 실행되는 보안 브릿지 | 두 국가 사이의 안전한 대사관 |

---

### 1.2 아이콘 생성 스크립트

> **코드 위치**: `scripts/generate-icons.js`

#### 컨텍스트 및 목적

이 스크립트는 일반적인 개발 마찰점을 해결합니다: Electron 애플리케이션은 각 운영 체제(Windows, macOS, Linux)에 대해 특정 형식과 크기의 아이콘 파일을 필요로 하지만, 개발자들은 종종 초기 개발 단계에서 이러한 자산을 준비하지 않습니다.

**비즈니스 요구사항**: LOGOS 데스크톱 애플리케이션은 Windows, macOS, Linux 전반에 배포를 위해 패키징되어야 합니다. electron-builder 도구는 패키징이 성공하기 전에 유효한 아이콘 자산이 존재해야 합니다.

#### 데이터 흐름

```
스크립트 실행
    |
    v
resources/icons/ 디렉토리 생성 (없는 경우)
    |
    v
각 크기 [16, 32, 48, 64, 128, 256, 512]에 대해:
    |
    +---> PNG 바이너리 데이터 생성 (보라색 사각형)
    |
    +---> resources/icons/{size}x{size}.png에 작성
    |
    v
256x256 메인 아이콘 생성
    |
    v
resources/icon.png에 작성
```

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **PNG 파일 형식** | DEFLATE 압축을 사용하고 투명도를 지원하는 무손실 압축 래스터 이미지 형식 | 신중하게 포장된 배송 컨테이너 |
| **CRC32 체크섬** | 데이터 무결성을 확인하기 위한 오류 감지 코드 | 영수증 합계로 올바르게 스캔되었음을 증명 |
| **플레이스홀더 아이콘** | 최종 브랜딩을 나타내지 않으면서 도구 요구사항을 충족하는 임시 자산 | "lorem ipsum" 더미 텍스트 |

---

### 1.3 로고 변환 스크립트

> **코드 위치**: `scripts/convert-logo.js`

#### 컨텍스트 및 목적

이 스크립트는 디자인과 배포 사이의 간극을 메웁니다. SVG 형식은 소스 로고에 이상적이지만(무한히 확장 가능하고, 편집하기 쉬움), Electron과 운영 체제는 애플리케이션 아이콘을 위해 특정 형식과 크기의 래스터화된 이미지를 필요로 합니다.

#### 데이터 흐름

```
logo.svg (소스)
    |
    v
[sharp 라이브러리가 SVG 버퍼 읽기]
    |
    v
[8개 PNG 크기 생성: 16, 32, 48, 64, 128, 256, 512, 1024]
    |
    +---> resources/icons/{size}x{size}.png (개별 파일)
    |
    +---> resources/icon.png (256x256 메인 아이콘)
    |
    v
[png-to-ico가 16, 32, 48, 64, 128, 256 크기 결합]
    |
    v
resources/icon.ico (Windows 다중 해상도 아이콘)
```

#### 플랫폼별 아이콘 요구사항

| 플랫폼 | 형식 | 사용처 |
|--------|------|--------|
| **Windows** | ICO (다중 해상도) | 작업 표시줄, 시작 메뉴, 데스크톱 바로가기, 인스톨러 UI |
| **macOS** | ICNS 또는 PNG | 독, Finder, Spotlight, DMG 인스톨러 배경 |
| **Linux** | PNG 디렉토리 | 애플리케이션 메뉴, 파일 관리자, 작업 표시줄 |

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **SVG** | 픽셀이 아닌 수학적으로 도형을 설명하는 XML 기반 벡터 이미지 형식 | 사진이 아닌 그리기 레시피 |
| **래스터화** | 벡터 그래픽을 특정 해상도의 비트맵으로 변환 | "레시피"를 고정 크기의 "사진"으로 요리 |
| **ICO 형식** | 다른 해상도의 여러 PNG 이미지를 단일 파일에 번들 | 러시아 중첩 인형 |

---

## 2. Vite 설정

### 2.1 Vitest 설정

> **코드 위치**: `vitest.config.ts`

#### 컨텍스트 및 목적

이 설정 파일은 Vitest(테스팅 프레임워크)가 LOGOS 애플리케이션 전반에 걸쳐 자동화된 테스트를 실행하는 방법을 정의합니다. 이것은 핵심 알고리즘과 비즈니스 로직이 올바르게 작동하는지 검증하는 신뢰할 수 있고, 빠르고, 일관된 테스트 실행에 대한 중요한 필요성을 해결합니다.

**비즈니스 요구사항**: LOGOS는 수학적으로 정확한 결과를 생성해야 하는 정교한 적응형 학습 알고리즘(IRT, FSRS, PMI)을 사용합니다. 자동화된 테스트 없이는 어떤 코드 변경이든 학습 알고리즘을 조용히 망가뜨릴 수 있습니다.

#### 테스트 대상 파일

- `src/core/__tests__/irt.test.ts` - 문항반응이론 알고리즘 테스트
- `src/core/__tests__/fsrs.test.ts` - 자유 간격 반복 스케줄러 테스트
- `src/core/__tests__/pmi.test.ts` - 점별 상호정보량 테스트
- `src/core/__tests__/priority.test.ts` - 우선순위 계산 테스트
- `src/core/__tests__/bottleneck.test.ts` - 병목 감지 테스트
- `src/core/__tests__/g2p.test.ts` - 자소-음소 변환 테스트
- `src/core/__tests__/morphology.test.ts` - 형태소 분석 테스트

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **globals: true** | 테스트 함수를 명시적 임포트 없이 전역 범위에 주입 | `console.log`처럼 어디서나 자동 사용 가능 |
| **environment: 'node'** | Node.js 환경에서 테스트 실행 | 브라우저가 아닌 서버에서 실행 |
| **coverage.provider: 'v8'** | V8 엔진의 내장 코드 커버리지 기능 사용 | 테스트가 실행하는 모든 코드 라인에 형광펜 |
| **경로 별칭** | 단축 경로를 절대 디렉토리에 매핑 | 전화의 단축 다이얼 설정 |

---

## 3. Playwright 테스트

### 3.1 Playwright E2E 테스트 설정

> **코드 위치**: `playwright.config.ts`

#### 컨텍스트 및 목적

이 설정 파일은 Playwright(엔드 투 엔드 테스팅 프레임워크)가 LOGOS Electron 데스크톱 애플리케이션에 대해 자동화된 테스트를 실행하는 방법을 정의합니다. 단위 테스트가 개별 함수가 격리되어 올바르게 작동하는지 확인하는 반면, E2E 테스트는 사용자 관점에서 전체 애플리케이션이 올바르게 작동하는지 확인합니다.

#### 테스팅 피라미드

```
테스팅 피라미드 (LOGOS):
========================

        /\
       /  \
      /E2E \    <-- playwright.config.ts (E2E 테스트)
     /------\       전체 애플리케이션 테스트
    /        \
   /  Integ.  \     서비스 수준 통합 테스트
  /------------\
 /              \
/   Unit Tests   \  <-- vitest.config.ts (단위 테스트)
/________________\      핵심 알고리즘 테스트
```

#### 단위 테스트 vs E2E 테스트

| 측면 | 단위 테스트 (Vitest) | E2E 테스트 (Playwright) |
|------|---------------------|------------------------|
| 테스트 대상 | 개별 함수 | 완전한 사용자 여정 |
| 속도 | 테스트당 밀리초 | 테스트당 초 |
| 의존성 | 없음 (순수 로직) | 빌드된 애플리케이션, OS |
| 병렬성 | 예 (격리됨) | 아니오 (공유 앱 상태) |
| 위치 | `src/**/*.test.ts` | `e2e/**/*.e2e.ts` |

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **fullyParallel: false** | 병렬 테스트 실행 비활성화 | 상점의 단일 계산대 - 느리지만 질서정연 |
| **forbidOnly: !!process.env.CI** | CI에서 `.only()` 사용 방지 | `.only()` 커밋 실수 방지 안전망 |
| **retries: CI ? 2 : 0** | CI에서 실패한 테스트 자동 재시도 | 불안정한 테스트에 두 번째 기회 |
| **trace: 'on-first-retry'** | 테스트 실패 시 상세 트레이스 기록 | 비행기 블랙박스 녹음기 |

---

### 3.2 Electron 테스트 헬퍼 모듈

> **코드 위치**: `e2e/electron.helper.ts`

#### 컨텍스트 및 목적

이 모듈은 Playwright(브라우저 자동화 프레임워크)와 Electron(데스크톱 애플리케이션 프레임워크) 사이의 간극을 메웁니다. 표준 Playwright는 브라우저에서 웹 애플리케이션을 테스트하도록 설계되었지만, LOGOS는 Electron 데스크톱 애플리케이션입니다.

#### 데이터 흐름

```
테스트 스위트 시작
       |
       v
launchApp() 호출
       |
       v
electron.launch()가 테스트 환경 변수와 함께 LOGOS 앱 생성
       |
       v
앱이 첫 번째 윈도우 열기
       |
       v
waitForLoadState('domcontentloaded')가 UI 준비 확인
       |
       v
Page 객체를 사용하여 UI와 상호작용하며 테스트 실행
       |
       v
cleanupTestData()가 데이터베이스에서 테스트 아티팩트 제거
       |
       v
closeApp()가 Electron 프로세스 종료
```

#### 주요 함수

| 함수 | 목적 |
|------|------|
| `launchApp()` | 테스트 스위트를 위해 LOGOS 애플리케이션을 새로 시작 |
| `closeApp(context)` | 테스트 완료 후 Electron 애플리케이션을 우아하게 종료 |
| `waitForAppReady(window)` | React가 마운트되고 애플리케이션이 완전히 상호작용 가능할 때까지 대기 |
| `navigateTo(window, route)` | 앱의 다른 페이지/경로로 프로그래밍 방식으로 탐색 |
| `createTestGoal(...)` | 테스트 사용자가 하듯이 UI를 통해 학습 목표 생성 |
| `cleanupTestData(window)` | 테스트 간 깨끗한 상태를 보장하기 위해 데이터베이스에서 모든 테스트 데이터 삭제 |

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **테스트 데이터베이스 격리** | `DATABASE_URL: 'file:./test.db'` 설정 | 연습용 화이트보드 - 실제 데이터에 영향 없음 |
| **Data-TestId 셀렉터** | `[data-testid="app-root"]` 사용 | UI 변경에도 변하지 않는 영구적인 이름표 |
| **환경 변수 주입** | `NODE_ENV: 'test'` 전달 | 애플리케이션에 "테스트 모드" 스티커 |

---

## 4. 스크립트

### 4.1 Prisma 데이터베이스 시드 스크립트

> **코드 위치**: `prisma/seed.ts`
> **실행 명령어**: `npm run db:seed`

#### 컨텍스트 및 목적

이 시드 스크립트는 **완전한 사용자 학습 여정을 나타내는 현실적인 테스트 데이터로 LOGOS 데이터베이스를 초기화** 하기 위해 존재합니다. 개발이나 테스트 중에 빈 데이터베이스로 시작하는 대신, 이 스크립트는 시스템의 모든 주요 데이터 관계를 실행하는 일관된 데이터셋을 생성합니다.

**페르소나**: 시드 데이터는 **CELBAN 시험을 준비하는 브라질 간호사**를 나타냅니다. CELBAN은 국제적으로 교육받은 간호사가 캐나다에서 일하기 위해 통과해야 하는 표준화된 시험입니다.

#### 생성되는 데이터

| 모델 | 개수 | 목적 |
|------|------|------|
| User | 1 | CELBAN을 준비하는 브라질 간호사 |
| GoalSpec | 1 | 4개월 기한의 CELBAN 자격증 |
| LanguageObject | 20 | IRT 매개변수가 있는 의료 어휘 |
| MasteryState | 20 | 각 단어에 대한 초기 숙달 추적 |
| Collocation | 9 | PMI 가중치가 적용된 단어 쌍 |
| Session | 1 | 빈 학습 세션 |
| ThetaSnapshot | 1 | 초기 능력 추정치 |

#### 시드된 어휘 (20개 의료 용어)

난이도 범위: -0.8 ~ +1.2

**쉬운 용어 (음수 난이도):**
- *symptom* (-0.7), *monitor* (-0.8), *vital signs* (-0.6)

**중간 용어 (난이도 0 근처):**
- *diagnosis* (-0.4), *acute* (0.0), *prognosis* (0.2)

**도전적 용어 (양수 난이도):**
- *auscultate* (0.9), *anaphylaxis* (1.2), *contraindication* (0.8)

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **Upsert 패턴** | 레코드가 존재하지 않으면 삽입, 존재하면 업데이트 | 호텔 체크인 - 새 손님이면 예약, 이미 있으면 조회 |
| **PMI** | 두 사건이 독립적인 경우보다 얼마나 더 동시에 발생하는지 정량화 | 두 학생이 항상 함께 앉는 것을 알아채기 |
| **IRT 난이도 척도** | -3에서 +3 범위의 로짓 척도로 측정 | 스키 슬로프 등급 |
| **Theta (능력 추정치)** | 학습자의 기저 능숙도를 나타내는 잠재 특성 매개변수 | 의료 영어에서의 "진정한 실력" |
| **멱등 연산** | 몇 번을 실행해도 같은 결과를 생성하는 연산 | 엘리베이터 버튼 여러 번 누르기 |

---

### 4.2 IPC 요청/응답 스키마

> **코드 위치**: `src/shared/schemas/ipc-schemas.ts`

#### 컨텍스트 및 목적

이 모듈은 Electron 렌더러 프로세스와 메인 프로세스 사이의 모든 통신에 대한 **런타임 유효성 검사 레이어**입니다. TypeScript가 컴파일 타임 타입 검사를 제공하지만, 런타임에 잘못된 데이터를 잡을 수 없습니다.

#### 아키텍처 역할

```
아키텍처 레이어:
-----------------------------------------
Layer 1: UI (React 컴포넌트)
    |
    v [IPC 호출]
-----------------------------------------
Layer 2: IPC 경계 (contextBridge + preload)
    |
    v [직렬화된 데이터]
-----------------------------------------
>>> Layer 3: 스키마 유효성 검사 (이 모듈) <<<
    |
    +--[유효하지 않음]--> 오류 응답
    |
    v [유효성 검사된 데이터]
-----------------------------------------
Layer 4: IPC 핸들러 (비즈니스 로직)
    |
    v [데이터베이스 작업]
-----------------------------------------
Layer 5: 데이터베이스 (Prisma + SQLite)
-----------------------------------------
```

#### 스키마 카테고리

| 카테고리 | 스키마 |
|----------|--------|
| **공통 유효성 검사기** | uuidSchema, positiveInt, nonNegativeInt, percentageSchema, ratioSchema, nonEmptyString |
| **학습 IPC** | QueueGetSchema, ObjectCreateSchema, ObjectUpdateSchema, ObjectListSchema, ObjectImportSchema, ObjectSearchSchema |
| **세션 IPC** | SessionStartSchema, SessionEndSchema, RecordResponseSchema, SessionSummarySchema |
| **목표 IPC** | GoalCreateSchema, GoalUpdateSchema |
| **온보딩 IPC** | OnboardingCompleteSchema |
| **Claude IPC** | ClaudeGenerateTaskSchema, ClaudeAnalyzeErrorSchema, ClaudeGetHintSchema |

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **Zod 스키마** | 런타임 타입 검사를 제공하는 TypeScript 우선 스키마 라이브러리 | 공항 보안 검문소 - 실제 티켓 확인 |
| **UUID 유효성 검사** | UUID v4 형식 검사 | 주민등록번호 형식 확인 |
| **비율 스키마** | [0, 1] 간격 내 숫자 유효성 검사 | 볼륨 슬라이더 - 0~100%만 가능 |
| **스키마에서 타입 추론** | `z.infer<typeof Schema>` 사용 | 같은 규칙을 두 번 작성하지 않음 |

---

### 4.3 공유 IPC 타입 정의

> **코드 위치**: `src/shared/types.ts`

#### 컨텍스트 및 목적

이 파일은 LOGOS의 **크로스 프로세스 타입 브릿지**입니다. Electron 애플리케이션에서 렌더러 프로세스(React UI)와 메인 프로세스(Node.js 백엔드)는 완전히 분리되어 있습니다. 이 파일은 양측이 참조하는 "계약"으로, 프로세스 경계를 넘어 타입 안전성을 보장합니다.

#### 파일 구성

1. **핵심 타입 재내보내기**: `core/types`에서 모든 타입 재내보내기
2. **IPC 채널 상수**: 채널 이름에 대한 단일 진실 소스
3. **IPC 요청/응답 타입**: 각 IPC 작업에 대한 요청 및 응답 형태
4. **IPCHandlerMap**: 채널을 요청/응답 타입에 연결하는 마스터 타입 맵
5. **타입 헬퍼**: 맵에서 타입을 추출하기 위한 유틸리티
6. **프리로드 API 인터페이스**: `window.logos` API 구조
7. **전역 Window 확장**: TypeScript의 전역 Window 인터페이스 확장
8. **이벤트 타입**: 메인에서 렌더러로의 푸시 알림용

#### API 구조

```typescript
export interface LogosAPI {
  goal: GoalAPI;
  object: ObjectAPI;
  session: SessionAPI;
  queue: QueueAPI;
  mastery: MasteryAPI;
  analytics: AnalyticsAPI;
  profile: ProfileAPI;
  claude: ClaudeAPI;
  corpus: CorpusAPI;
  sync: SyncAPI;
  onboarding: OnboardingAPI;
  app: AppAPI;
}
```

#### 기술 개념

| 개념 | 기술적 설명 | 평이한 설명 |
|------|-------------|-------------|
| **타입 맵** | 채널 이름을 기반으로 타입의 컴파일 타임 조회 | 채널 이름으로 조회하는 "사전" |
| **매핑된 타입 헬퍼** | `keyof`, `extends`, 조건부 타입을 사용하여 타입 추출 | "이 채널의 요청 타입이 뭐야?"에 답하는 헬퍼 |
| **전역 선언** | `declare global { }` 사용 | TypeScript에게 "런타임에 이 속성이 존재할 것"이라고 알림 |
| **Const 어설션** | `as const`로 리터럴 타입 생성 | 채널 이름으로 타입 추론이 올바르게 작동 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-01-07 | 통합 README.md 문서 생성 |
| 2026-01-06 | 공유 타입 및 IPC 스키마 문서화 |
| 2026-01-05 | Electron-Vite, Playwright, 테스트 헬퍼 문서화 |
| 2026-01-04 | Prisma 시드, Vitest, 아이콘 생성기 문서화 |

---

*이 문서는 LOGOS 프로젝트의 설정 및 빌드 관련 파일들을 통합적으로 설명합니다.*
