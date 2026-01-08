# LOGOS 네러티브 쉐도우 문서 - 마스터 인덱스 (한국어)

> **최종 업데이트**: 2026-01-07
> **문서 버전**: 2.0
> **원본**: `docs/narrative/` (영어)

---
[text](vscode-webview://08qasfc58sh2o8072cqi181ua0qn14k4u7up8lvtsfecbpcm6627/docs/narrative-ko/MASTER-INDEX.md)
## 개요

이 문서는 LOGOS 언어 학습 애플리케이션의 **네러티브 쉐도우 문서(Narrative Shadow Documentation)**입니다. 코드의 "무엇(what)"이 아닌 **"왜(why)"**를 설명하며, 코드베이스의 각 모듈이 존재하는 이유, 설계 결정의 배경, 그리고 모듈 간의 인과관계적 의존성을 서술합니다.

---

## 위계구조적 네비게이션

LOGOS 아키텍처는 **인과관계적 의존성(Causal Dependencies)**에 따라 계층화되어 있습니다:

```
┌─────────────────────────────────────────────────────────────────┐
│                     LOGOS 아키텍처 계층도                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 09-config-build     설정 및 빌드 시스템                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 08-database         데이터 영속화 계층                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 07-ipc              프로세스 간 통신                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 06-services         비즈니스 로직 조율                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 05-tasks            과제 생성 및 제약 해결                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 04-content          콘텐츠 생성 시스템                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 03-learning-engine  학습 최적화 엔진                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 02-linguistic       언어학적 분석 모듈                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 01-psychometric     심리측정학적 기반                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↑                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 00-foundation       타입 시스템 기반 (의존성 없음)        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 폴더 구조 (위계구조적 네비게이션)

### [00-foundation](./00-foundation/README.md) - 기반 모듈
> **의존성**: 없음 (최하위 계층)

LOGOS의 타입 시스템 기반. 모든 도메인 개념의 권위 있는 정의 제공.

**핵심 파일**: `src/core/types.ts`, `src/core/index.ts`

---

### [01-psychometric](./01-rrpsychometric/README.md) - 심리측정 모듈
> **의존**: 00-foundation

적응형 학습의 심리측정학적 핵심. 학습자 능력 추정과 문항 선택.

**핵심 모듈**: IRT (문항반응이론), Quadrature (구적법), FSRS (간격 반복)

---

### [02-linguistic](./02-linguistic/README.md) - 언어학 모듈
> **의존**: 00-foundation, 01-psychometric

언어 학습 콘텐츠의 언어학적 분석.

**하위 영역**: 형태론, 통사론, 음운론, 의미론, 화용론

---

### [03-learning-engine](./03-learning-engine/README.md) - 학습 엔진
> **의존**: 00-foundation, 01-psychometric, 02-linguistic

학습 최적화의 핵심 알고리즘.

**핵심 시스템**: Priority (우선순위), Transfer (전이), Bottleneck (병목), PMI

---

### [04-content](./04-content/README.md) - 콘텐츠 생성
> **의존**: 02-linguistic, 03-learning-engine

학습 콘텐츠 생성 및 검증 시스템.

**핵심 컴포넌트**: ContentGenerator, ContentValidator, PedagogicalIntent

---

### [05-tasks](./05-tasks/README.md) - 과제 시스템
> **의존**: 04-content, 02-linguistic

학습 과제 생성 및 제약 해결 시스템.

**핵심 모듈**: TaskTypes (30개 과제 유형), ConstraintSolver, DistractorGenerator

---

### [06-services](./06-services/README.md) - 서비스 레이어
> **의존**: 모든 Core 모듈

비즈니스 로직을 조율하는 서비스 계층.

**서비스 카테고리**: 핵심 서비스, 유틸리티 서비스, 고급 서비스

---

### [07-ipc](./07-ipc/README.md) - IPC 레이어
> **의존**: 06-services

Electron 메인-렌더러 프로세스 간 통신.

**도메인 핸들러**: session, learning, agent, claude, goal, onboarding, sync

---

### [08-database](./08-database/README.md) - 데이터베이스 레이어
> **의존**: Prisma ORM

데이터 영속화 계층.

**리포지토리**: Mastery, Session, Collocation, ErrorAnalysis, Goal

---

### [09-config-build](./09-config-build/README.md) - 설정 및 빌드
> **의존**: 외부 도구 (Vite, Electron, Playwright)

빌드 시스템 및 개발 환경 설정.

---

## 읽기 순서 가이드

### 신규 개발자
1. [00-foundation](./00-foundation/README.md) → 타입 시스템 이해
2. [01-psychometric](./01-psychometric/README.md) → IRT/FSRS 개념
3. [06-services](./06-services/README.md) → 비즈니스 로직 흐름

### 언어학 연구자
1. [02-linguistic](./02-linguistic/README.md) → 언어 분석 모듈
2. [03-learning-engine](./03-learning-engine/README.md) → 학습 최적화 알고리즘
3. [04-content](./04-content/README.md) → 콘텐츠 생성 시스템

### 백엔드 개발자
1. [06-services](./06-services/README.md) → 서비스 아키텍처
2. [07-ipc](./07-ipc/README.md) → IPC 패턴
3. [08-database](./08-database/README.md) → 데이터 모델

---

## 코드 의존성 그래프

```
                    ┌──────────────┐
                    │ 09-config    │
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │ 08-database  │
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │ 07-ipc       │
                    └──────────────┘
                           │
                    ┌──────────────┐
                    │ 06-services  │
                    └──────┬───────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────────────┐ ┌──────────────┐        │
   │ 05-tasks     │ │ 04-content   │        │
   └──────┬───────┘ └──────┬───────┘        │
          └────────────────┼────────────────┘
                           │
                    ┌──────────────┐
                    │ 03-learning  │
                    └──────┬───────┘
                           │
                    ┌──────────────┐
                    │ 02-linguistic│
                    └──────┬───────┘
                           │
                    ┌──────────────┐
                    │ 01-psycho    │
                    └──────┬───────┘
                           │
                    ┌──────────────┐
                    │ 00-foundation│
                    └──────────────┘
```

---

## 개별 파일 문서 (레거시)

기존 개별 파일 문서들:

### 핵심 알고리즘 (`src/core/`)

| 파일 | 문서 | 설명 |
|------|------|------|
| `types.ts` | [types.md](src/core/types.md) | 핵심 타입 정의 |
| `irt.ts` | [irt.md](src/core/irt.md) | 문항반응이론 |
| `fsrs.ts` | [fsrs.md](core/fsrs.md) | 간격반복 스케줄러 |
| `pmi.ts` | [pmi.md](core/pmi.md) | 점별 상호정보량 |
| `priority.ts` | [priority.md](core/priority.md) | 우선순위 계산 |
| `bottleneck.ts` | [bottleneck.md](core/bottleneck.md) | 병목 탐지 |
| `semantic-network.ts` | [semantic-network.md](src/core/semantic-network.md) | 의미 네트워크 |
| `morphology.ts` | [morphology.md](src/core/morphology.md) | 형태론 분석 |
| `syntactic.ts` | [syntactic.md](src/core/syntactic.md) | 통사적 복잡성 |
| `g2p.ts` | [g2p.md](src/core/g2p.md) | 자소-음소 대응 |
| `transfer.ts` | [transfer.md](src/core/transfer.md) | L1 전이 계산 |
| `pragmatics.ts` | [pragmatics.md](src/core/pragmatics.md) | 화용론 |

### 번역 섹션 원본 (`sections/`)

| 섹션 | 설명 |
|------|------|
| [core-foundation.md](sections/core-foundation.md) | 핵심 기반 모듈 |
| [core-psychometric.md](sections/core-psychometric.md) | 심리측정 모듈 |
| [core-linguistic-1.md](sections/core-linguistic-1.md) | 언어학 모듈 1부 |
| [core-linguistic-2.md](sections/core-linguistic-2.md) | 언어학 모듈 2부 |
| [core-grammar.md](sections/core-grammar.md) | 문법 모듈 |
| [core-dynamic.md](sections/core-dynamic.md) | 동적 모듈 |
| [core-optimization.md](sections/core-optimization.md) | 최적화 모듈 |
| [core-mastery.md](sections/core-mastery.md) | 숙달 모듈 |
| [core-content.md](sections/core-content.md) | 콘텐츠 모듈 |
| [core-tasks.md](sections/core-tasks.md) | 과제 모듈 |
| [core-register-state.md](sections/core-register-state.md) | 레지스터/상태 모듈 |
| [services-1.md](sections/services-1.md) | 서비스 레이어 1 |
| [services-core.md](sections/services-core.md) | 핵심 서비스 |
| [services-utility.md](sections/services-utility.md) | 유틸리티 서비스 |
| [services-advanced.md](sections/services-advanced.md) | 고급 서비스 |
| [ipc-layer.md](sections/ipc-layer.md) | IPC 레이어 |
| [db-layer.md](sections/db-layer.md) | 데이터베이스 레이어 |
| [config-build.md](sections/config-build.md) | 설정/빌드 |

---

## 학술적 배경

LOGOS는 다음 언어 습득 이론에 기반합니다:

### 1. 처리가능성 이론 (Pienemann, 1998)
- 구성요소 선수조건 체인: PHON → MORPH → LEX → SYNT → PRAG

### 2. 전이 학습 (Perkins & Salomon, 1992)
- "동일 요소" 전이 vs "원리 기반" 전이

### 3. FSRS-4 (Free Spaced Repetition Scheduler)
- 망각 곡선 기반 복습 스케줄링

### 4. IRT (문항반응이론)
- 1PL/2PL/3PL 모델, 개인별 능력(theta) 추정

### 5. FRE 우선순위 공식
- Frequency, Relational density, Domain relevance

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-01-07 | 2.0 | 위계구조적 폴더 구조로 재구성 |
| 2026-01-06 | 1.0 | 초기 한국어 번역 완료 |

---

## 관련 문서

- [영어 원본](../narrative/INDEX.md)
- [LOGOS README](../../README.md)
