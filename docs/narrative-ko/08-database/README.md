# 데이터베이스 레이어 (Database Layer)

> **최종 업데이트**: 2026-01-07
> **원본 위치**: `src/main/db/`
> **상태**: Active

---

**이전**: [07-ipc](../07-ipc/) | **다음**: [09-config-build](../09-config-build/)

---

## 개요

LOGOS의 데이터베이스 레이어는 사용자 학습 데이터, 목표, 숙달도, 세션, 연어(Collocation), 오류 분석 정보를 영속적으로 저장한다. Electron 데스크톱 앱의 특성상 SQLite를 사용하며, Prisma ORM을 통해 타입 안전한 데이터 접근을 제공한다.

### 핵심 가치

- **학습 진행 추적**: 영속 저장소 없이는 앱 종료 시 모든 데이터 손실
- **적응형 알고리즘**: IRT, FSRS 알고리즘은 과거 데이터 필요
- **목표 관리**: 세션 간 학습 목표 유지
- **연어 분석**: PMI 계산을 위한 빈도 데이터

---

## 아키텍처

LOGOS는 3계층 아키텍처를 채택하며, 이 모듈은 **데이터 접근 계층(Data Access Layer)**에 해당한다:

```
+---------------------------------------------------+
|  계층 1: 렌더러 (React UI)                        |
+---------------------------------------------------+
            |  IPC 브릿지 (contextBridge)
            v
+---------------------------------------------------+
|  계층 2: 메인 프로세스 (Electron)                 |
|  - IPC 핸들러                                     |
|  - 비즈니스 로직 (FSRS, IRT, 우선순위 알고리즘)   |
+---------------------------------------------------+
            |
            v
+---------------------------------------------------+
|  계층 3: 데이터 접근 계층                         |
|  - prisma.ts, client.ts (이 모듈)                 |
|  - 리포지토리 패턴                                |
+---------------------------------------------------+
            |
            v
+---------------------------------------------------+
|  계층 4: 스토리지 (SQLite via better-sqlite3)     |
|  - User, GoalSpec, LanguageObject, MasteryState   |
|  - Session, Response, ThetaSnapshot, CachedTask   |
+---------------------------------------------------+
```

### 데이터 흐름

```
앱 시작
    |
    v
main/index.ts에서 { initDatabase } 임포트
    |
    v
initDatabase()로 SQLite 연결 (Prisma)
    |
    v
IPC 핸들러에서 리포지토리 임포트
    |
    v
렌더러 프로세스가 IPC로 요청
    |
    v
IPC 핸들러가 리포지토리로 데이터 조회/수정
    |
    v
렌더러에 응답 반환
```

---

## 1. Prisma 클라이언트

### 1.1 싱글톤 모듈 (prisma.ts)

> **코드 위치**: `src/main/db/prisma.ts`

LOGOS용 **싱글톤 PrismaClient** 제공. Electron 앱에서 DB 생명주기 관리가 중요하다.

**주요 익스포트**:
- `initDatabase()`: 앱 시작 시 `createWindow()`에서 호출
- `getPrisma()`: DB 접근 필요 시
- `closeDatabase()`: 앱 종료 시
- `withTransaction()`: 여러 작업의 원자적 실행

**의존 관계**:
| 의존성 | 설명 |
|--------|------|
| `@prisma/client` | 스키마 기반 자동 생성 클라이언트 |
| `prisma/schema.prisma` | 스키마 정의 (빌드 타임) |

**의존자**:
- `src/main/index.ts`: `initDatabase()` 호출
- `src/main/ipc/session.ipc.ts`: 세션, 응답, 분석
- `src/main/ipc/learning.ipc.ts`: 언어 객체 CRUD
- `src/main/ipc/goal.ipc.ts`: 목표 관리

### 1.2 직접 클라이언트 모듈 (client.ts)

> **코드 위치**: `src/main/db/client.ts`

LOGOS Electron 앱 전체의 **싱글톤 데이터베이스 연결** 제공. 두 가지 인프라 문제 해결:

1. **연결 풀링**: 싱글톤 없이는 각 파일이 자체 연결 생성하여 풀 고갈
2. **HMR 누수 방지**: 파일 저장 시 리로드마다 새 연결 생성하면 메모리 누수

### 1.3 두 개의 DB 모듈 설계 결정

- `client.ts`: 직접 익스포트 싱글톤, IPC 핸들러에서 사용
- `prisma.ts`: 트랜잭션 헬퍼 포함, 리포지토리 패턴에서 사용

둘 다 싱글톤 문제를 해결하며, 코드베이스 진화 과정에서 두 가지 접근법이 공존한다.

### 1.4 핵심 기술 개념

#### 연결 풀링 (Connection Pooling)
**기술 정의**: 쿼리마다 연결 생성/파괴 대신 재사용하는 기법
**쉬운 설명**: 매번 새 도구를 사는 대신 도구 상자에서 꺼내 쓰고 다시 넣는 것. Prisma가 내부적으로 관리한다.

#### 지연 초기화 (Lazy Initialization)
**기술 정의**: 필요한 시점까지 리소스 할당을 미루는 패턴
**쉬운 설명**: `getPrisma()`는 첫 호출 시에만 클라이언트를 생성한다. 필요할 때까지 연결하지 않음.

#### 정상 종료 (Graceful Shutdown)
**기술 정의**: SIGINT/SIGTERM 핸들러로 종료 전 리소스 정리
**쉬운 설명**: 앱을 갑자기 끄면 데이터가 손상될 수 있다. 정상 종료는 "지금 하던 일 마무리하고 문 잠그기"와 같다.

#### HMR 고려 (Hot Module Replacement)
**기술 정의**: 개발 중 모듈 리로드 시 고아 연결 방지를 위해 `globalThis`에 클라이언트 저장
**쉬운 설명**: 개발 중 코드 수정 시 이전 연결이 떠돌아다니지 않도록 "안전한 방"에 보관.

### 1.5 SQLite 선택 이유

LOGOS는 데스크톱 Electron 앱:
- **서버 불필요**: 단일 파일 DB
- **설정 불필요**: 설치 즉시 작동
- **이식성**: 파일 복사로 백업/복원
- **단일 사용자에 빠름**: 네트워크 지연 없음

### 1.6 실패 모드

| 실패 모드 | 영향 |
|-----------|------|
| 시작 시 연결 실패 | 앱 시작 불가 |
| 세션 중 연결 끊김 | 진행 상황 손실, 앱 충돌 |
| 다중 인스턴스 생성 | 메모리 고갈, DB 잠금 |
| 정상 종료 없음 | 데이터 손상 |

---

## 2. 리포지토리 패턴

리포지토리 패턴은 데이터 접근 로직을 캡슐화하여 DB 변경 시 리포지토리 내부만 수정하면 된다.

### 2.1 배럴 익스포트 (index.ts)

> **코드 위치**: `src/main/db/index.ts`

데이터베이스 모듈의 **배럴 익스포트(Barrel Export)** 파일. 단일 위치에서 모든 기능을 임포트할 수 있게 한다.

```typescript
// 기존 방식
import { getPrisma } from './db/prisma';
import { GoalRepository } from './db/repositories/goal.repository';

// 배럴 익스포트 방식
import { getPrisma, GoalRepository } from './db';
```

**재익스포트 항목**:

| 카테고리 | 항목 |
|----------|------|
| 연결 유틸리티 | `getPrisma()`, `initDatabase()`, `closeDatabase()`, `withTransaction()` |
| 리포지토리 | `goal.repository`, `mastery.repository`, `session.repository`, `collocation.repository`, `error-analysis.repository` |

---

## 3. 숙달도 리포지토리 (Mastery)

> **코드 위치**: `src/main/db/repositories/mastery.repository.ts`
> **Phase**: 2.2 - Mastery State Tracking

### 3.1 목적

언어 학습은 "처음 본다"에서 "자동으로 사용할 수 있다"까지의 변화이다. 이 변환은 단계적으로 진행되며, 각 단계는 다른 유형의 연습과 복습 일정이 필요하다.

숙달도 리포지토리는 **사용자가 만나는 모든 언어 객체의 학습 상태를 영속화하고 조회**한다.

**사용 시점**:
- 사용자가 연습 문제에 답할 때마다 (노출 기록)
- 세션 시작 시 복습 큐 구축 (복습 예정 항목 조회)
- 각 응답 후 FSRS 스케줄링 파라미터 업데이트
- 분석 대시보드 생성 (숙달도 통계 집계)
- 항목이 다음 숙달 단계로 진행해야 하는지 결정

### 3.2 5단계 숙달 모델

| 단계 | 이름 | 설명 | 쉬운 설명 |
|------|------|------|-----------|
| 0 | Unknown | 만난 적 없음 | "이 단어를 본 적 없다" |
| 1 | Recognition | 단서와 함께 인식 가능 | "선택지를 보면 본 적 있다고 안다" |
| 2 | Recall | 단서 없이 ~60% 회상 | "보통 혼자서 기억할 수 있다" |
| 3 | Controlled | 75%+ 정확도, 주 단위 안정성 | "생각하면 확실히 안다" |
| 4 | Automatic | 90%+ 정확도, 월 단위 안정성 | "노력 없이 자연스럽게 나온다" |

### 3.3 핵심 기술 개념

#### 지수 이동 평균 (EMA)
**기술 정의**: 최근 관측치에 지수적으로 높은 가중치를 부여하는 정확도 추적 방법 (alpha = 0.2)
**쉬운 설명**: 성적 계산에서 최근 시험에 더 높은 비중을 두는 것. 오늘 100% 맞고 지난달 50%였다면, "정확도"는 75%보다 100%에 가깝다.
**공식**: `new_accuracy = old_accuracy * 0.8 + new_result * 0.2`

#### 스캐폴딩 갭 (Scaffolding Gap)
**기술 정의**: 단서 지원 정확도와 단서 없는 정확도의 차이
**쉬운 설명**: 힌트에 얼마나 의존하는지 측정. 힌트 있을 때 90%, 없을 때 60%면 갭은 30%. 높은 갭은 인식은 하지만 독립적으로 회상하지 못함을 의미.
**사용 이유**: Stage 4는 갭 < 10% 필요 - 진정한 숙달은 보조 도구가 필요 없음

#### FSRS (Free Spaced Repetition Scheduler)
**기술 정의**: 안정성(S)과 난이도(D) 파라미터를 사용하여 최적 복습 간격을 예측하는 2변수 기억 모델
**쉬운 설명**: 언제 무언가를 잊을지 아는 스마트 캘린더. 각 단어를 얼마나 잘 기억하는지 관찰하고 퀴즈 최적 시점 계산 - 너무 빨리(시간 낭비)도 너무 늦게(이미 잊음)도 아닌 때.
**공식**: `R = e^(-t/S)` (망각 곡선)

#### 평가 시스템 (1-4)
| 등급 | 의미 | 효과 |
|------|------|------|
| 1 (Again) | 오답 | 안정성 급격히 감소, 곧 다시 봄 |
| 2 (Hard) | 정답이지만 힌트 필요 | 중간 안정성 증가 |
| 3 (Good) | 힌트 없이 정답, 약간 생각 | 정상 안정성 증가 |
| 4 (Easy) | 노력 없이 즉시 정답 | 큰 안정성 증가, 복습까지 오래 |

#### 실패 추적 (Lapse)
**기술 정의**: 이전에 학습한 항목이 등급 1 또는 2를 받을 때마다 카운터 증가
**쉬운 설명**: "실패"는 알던 것을 잊은 것. 의사가 재발을 추적하는 것처럼 시스템이 추적.
**사용 이유**: 실패가 많은 항목은 특별한 주의나 다른 학습 접근이 필요한 "거머리"

### 3.4 함수 참조

| 카테고리 | 함수 | 목적 |
|----------|------|------|
| CRUD | `createMasteryState()` | 새 언어 객체에 대한 숙달도 초기화 |
| CRUD | `getMasteryState()` | objectId로 현재 숙달도 조회 |
| CRUD | `getMasteryWithObject()` | 숙달도 + 부모 LanguageObject 조회 |
| 노출 | `recordExposure()` | 연습 후 EMA로 정확도 업데이트 |
| 노출 | `getScaffoldingGap()` | 단서 의존도 측정 계산 |
| 스케줄링 | `getReviewQueue()` | 복습 예정 항목 조회 |
| 스케줄링 | `updateFSRSParameters()` | 복습 후 FSRS 스케줄링 업데이트 |
| 단계 | `transitionStage()` | 새 숙달 단계로 이동 |
| 단계 | `getItemsByStage()` | 특정 단계의 항목 조회 |
| 분석 | `getMasteryStatistics()` | 목표에 대한 숙달도 데이터 집계 |

---

## 4. 세션 리포지토리 (Session)

> **코드 위치**: `src/main/db/repositories/session.repository.ts`
> **Phase**: 2.3 - Session Recording

### 4.1 목적

**학습 세션의 데이터 접근 계층**으로, 사용자의 언어 학습 시스템과의 모든 상호작용을 추적한다.

**비즈니스 요구**: 언어 학습 효과는 시간에 따른 패턴 이해에 달려있다. 세션 추적 없이는 LOGOS가 모든 학습 순간을 처음인 것처럼 취급하여 사용자의 강점과 약점에 적응할 수 없다.

**사용자 요구**: 학습자는 진행 상황을 알고 싶어 한다 - 연습한 항목 수, 정확도, 학습 시간, 향상 여부.

**사용 시점**:
- **세션 시작**: SessionPage에서 "Start Session" 클릭
- **연습 중**: 학습 과제에 응답할 때마다
- **세션 종료**: 세션 완료 또는 종료 시
- **분석**: 대시보드에서 통계 표시
- **알고리즘 업데이트**: IRT 시스템이 세타 능력 추정 업데이트

### 4.2 세션 모드

| 모드 | 세타 업데이트 | 목적 |
|------|---------------|------|
| Learning | 동결 (업데이트 없음) | 교육 중 실수에 페널티 없이 안전한 탐색 |
| Training | 소프트 트랙 (50% 가중치) | 능력 추정에 부분 반영되는 연습 |
| Evaluation | 전체 IRT 업데이트 (100% 가중치) | 실제 능력 수준의 정확한 측정 |

**설계 이유**: 학습자는 새 자료 탐색과 숙달 증명 시 다르게 수행한다. 새 개념으로 어려움을 겪는다고 능력 추정이 불공정하게 낮아져서는 안 된다.

### 4.3 핵심 기술 개념

#### 세션 생명주기 관리
**기술 정의**: `createSession`, `getSessionById`, `endSession` 함수로 세션 엔티티 완전 생명주기 관리
**쉬운 설명**: 직장에서 출퇴근 기록과 같다. 학습 시작 시 "출근" (시작 시간 설정), 학습 중 모든 활동 추적, 완료 시 "퇴근" (종료 시간 설정).

#### 응답 기록
**기술 정의**: `recordResponse` 함수로 정확성, 응답 시간(ms), 사용된 단서 수준, 선택적 IRT 세타 기여값 등 메타데이터와 함께 개별 과제 응답 영속화
**쉬운 설명**: 질문에 답할 때마다 상세 일지에 기록 - 정답 여부, 소요 시간, 힌트 필요 여부, 능력 추정 영향.

#### 세타 스냅샷
**기술 정의**: `saveThetaSnapshot` 함수로 세션 중 특정 시점의 세타 능력 추정(전역 및 구성요소별)과 표준 오차 영속화
**쉬운 설명**: 특정 순간의 기술 수준 사진. 시스템이 세션 중 주기적으로 "사진"을 찍어 능력이 어떻게 발전했는지 볼 수 있음.

### 4.4 함수 참조

| 카테고리 | 함수 | 목적 |
|----------|------|------|
| 생명주기 | `createSession` | 사용자가 특정 목표 작업할 새 세션 시작 |
| 생명주기 | `getSessionById` | ID로 세션 조회 |
| 생명주기 | `getSessionWithResponses` | 모든 응답과 세타 스냅샷 포함 세션 조회 |
| 생명주기 | `endSession` | 종료 타임스탬프로 세션 완료 표시 |
| 응답 | `recordResponse` | 모든 메타데이터와 개별 과제 응답 기록 |
| 응답 | `recordStageTransition` | 숙달 단계 진행 시 카운터 증가 |
| 응답 | `recordTaskType` | 유창성 vs 다양성 과제 분포 추적 |
| 세타 | `saveThetaSnapshot` | 세션 중 특정 시점 세타 상태 영속화 |
| 세타 | `getThetaProgression` | 시간에 따른 사용자의 모든 세타 스냅샷 조회 |
| 세타 | `applyThetaRules` | 세션 모드와 기여에 따라 사용자 세타 업데이트 |
| 분석 | `getSessionHistory` | 사용자의 최근 세션 조회 |
| 분석 | `getSessionsByGoal` | 특정 목표 관련 세션 조회 |
| 분석 | `getSessionSummary` | 세션의 집계 통계 계산 |
| 분석 | `getUserStatistics` | 모든 세션의 평생 학습 통계 조회 |

---

## 5. 연어 리포지토리 (Collocation)

> **코드 위치**: `src/main/db/repositories/collocation.repository.ts`
> **Phase**: 2.4 - Collocation Storage

### 5.1 목적

언어 유창성은 개별 단어 지식만이 아니라 어떤 단어가 *함께 어울리는지* 아는 것이다. 영어 원어민은 "make a decision"이라 하지 "do a decision"이라 하지 않고, "heavy rain"이라 하지 "strong rain"이라 하지 않는다.

연어 리포지토리는 **PMI(점별 상호 정보량) 분석을 통해 발견된 단어 쌍 간의 통계적 관계를 영속화하고 조회**한다.

**비즈니스 요구**: 언어 학습자는 개별 어휘 암기에 많은 시간을 쓰지만 말할 때 부자연스럽다. 연어를 저장하고 표면화함으로써 LOGOS는:
1. "함께 어울리는" 단어를 같은 세션에서 가르침
2. 실제 언어 사용을 반영하는 문맥적 연습 생성
3. 많은 구문을 해제하는 "허브 단어"(높은 관계 밀도) 식별
4. 강하게 연관된 쌍으로 유창성 구축 과제 생성
5. 약하게 연관된 쌍으로 다양성 구축 과제 생성

### 5.2 핵심 기술 개념

#### PMI (점별 상호 정보량)
**기술 정의**: `PMI(x,y) = log2[P(x,y) / (P(x)P(y))]` - 결합 확률과 주변 확률 곱의 로그 비율
**쉬운 설명**: "이 두 단어가 함께 있으면 얼마나 놀라야 하나?"에 답한다. "heavy"와 "rain"이 우연보다 훨씬 자주 함께 나타나면 높은 PMI. "heavy"와 "mathematics"가 거의 함께 나타나지 않으면(우연보다 적게) 음수 PMI.

#### NPMI (정규화된 PMI)
**기술 정의**: `NPMI = PMI / -log2[P(x,y)]` - PMI를 [-1, +1] 범위로 정규화
**쉬운 설명**: 일반 PMI는 희귀 단어 쌍이 드물다는 이유만으로 천문학적으로 높을 수 있다. NPMI는 모든 것을 일관된 -1 ~ +1 범위로 스케일링:
- +1 = 완벽한 연관 (항상 함께 나타남)
- 0 = 관계 없음
- -1 = 완벽한 배제 (절대 함께 나타나지 않음)

#### 관계 밀도 (Hub Score)
**기술 정의**: 단어가 가진 유의미한 연어 수와 연결 강도(PMI)를 결합한 정규화 측정치
**쉬운 설명**: 어휘를 소셜 네트워크로 생각하면 단어는 사람이다. 어떤 단어는 "인기"가 높아 많은 다른 단어와 강한 연어로 연결된다. "take"는 수백 개 구문과 연결 (take medication, take time, take action). 관계 밀도가 높다. "take"를 배우면 많은 구문에 접근; "pneumatic"을 배우면 적은 구문만.

**공식**:
```
connectionFactor = log(connectionCount + 1)
pmiNormalized = min(avgPMI / 10, 1)
relationalDensity = min(connectionFactor * pmiNormalized, 1)
```

### 5.3 유창성 vs 다양성 과제

#### 유창성 과제 (High PMI)
**함수**: `getTopCollocations(goalId, limit)`
**목적**: 자연스러운 언어 패턴으로 자동성 구축
**예시**: "The patient should ___ the medication as prescribed."
- 정답: "take" (medication과 높은 PMI)
- 연어가 회상을 촉진하므로 쉬움

#### 다양성 과제 (Low PMI)
**함수**: `getLowPMIPairs(goalId, maxPMI, limit)`
**목적**: 상투적 표현을 넘어 유연한 어휘 사용 구축
**예시**: "The committee will ___ the proposal tomorrow."
- 여러 유효 답: "discuss," "review," "consider," "reject"
- 강한 연어가 특정 답을 촉진하지 않으므로 어려움

### 5.4 FRE 우선순위와 통합

연어 리포지토리는 우선순위 계산의 "R" 구성요소에 직접 기여:

```
Priority = (w_F * F + w_R * R + w_E * E) / Cost
```

여기서 **R = relationalDensity** (이 리포지토리에서 계산)

높은 R 점수의 단어가 우선되는 이유:
- 많은 다른 단어와 연결 (어휘 네트워크의 허브 노드)
- 배우면 "힘 배수" 생성 - "take" 이해가 수십 개 구문 이해 도움
- 미래 학습을 위한 더 많은 문맥적 앵커 제공

### 5.5 함수 참조

| 카테고리 | 함수 | 목적 |
|----------|------|------|
| CRUD | `createCollocation()` | 단일 단어 쌍 관계 저장 |
| CRUD | `getCollocation()` | 단어 쌍으로 연어 조회 |
| CRUD | `bulkCreateCollocations()` | 많은 연어 배치 삽입 |
| 조회 | `getCollocationsForWord()` | 특정 단어의 모든 연어 조회 |
| 조회 | `getTopCollocations()` | 목표의 최고 PMI 쌍 조회 |
| 조회 | `getLowPMIPairs()` | 목표의 낮은 PMI 쌍 조회 |
| 분석 | `calculateRelationalDensity()` | 단어의 허브 점수 계산 |
| 분석 | `recalculateRelationalDensities()` | 모든 객체의 허브 점수 배치 업데이트 |
| 시각화 | `getCollocationNetwork()` | 시각화용 노드-엣지 그래프 구축 |

---

## 6. 오류 분석 리포지토리 (Error Analysis)

> **코드 위치**: `src/main/db/repositories/error-analysis.repository.ts`
> **Phase**: Gap 1.1 - Threshold Detection Algorithm

### 6.1 목적

언어 학습자가 실수할 때, **실수의 성격을 이해하는 것이 단순히 틀렸다고 표시하는 것보다 더 가치있다**. 과거 시제 "-ed" 어미로 지속적으로 어려움을 겪는 학생은 비슷하게 들리는 단어를 혼동하는 학생과 근본적으로 다른 학습 요구가 있다.

오류 분석 리포지토리는 **학습 세션 전반의 오류 패턴을 영속화, 조회, 분석**한다.

**비즈니스 요구**: 적응형 튜터링은 학습자가 어려움을 겪는다는 것뿐만 아니라 *왜* 그런지 알아야 한다. "어휘 더 연습하세요" 같은 일반적 피드백은 "형태론 오류(동사 어미)가 하류 어휘 실수를 유발하고 있습니다" 같은 구체적 안내보다 훨씬 덜 유용하다.

### 6.2 구성요소 모델: 5가지 언어적 기둥

LOGOS는 모든 오류를 5가지 언어 구성요소로 분류하며, 캐스케이드 계층을 형성:

| 구성요소 | 코드 | 설명 | 쉬운 설명 |
|----------|------|------|-----------|
| 음운론 | PHON | 소리 체계 | "단어 소리" |
| 형태론 | MORPH | 단어 형성 | "단어 구축 방법 (접두사, 접미사, 어근)" |
| 어휘 | LEX | 어휘 | "어떤 단어를 사용할지" |
| 통사론 | SYNT | 문장 구조 | "단어가 문장에서 어떻게 맞는지" |
| 화용론 | PRAG | 맥락/레지스터 | "상황에 적절하게 말하는 방법" |

**핵심 통찰**: 이 구성요소들은 초기 구성요소가 하류 효과를 유발하는 **캐스케이드**를 형성:

```
PHON --> MORPH --> LEX --> SYNT --> PRAG
```

학습자가 형태론(동사 어미 "-ing", "-ed")으로 어려움을 겪으면, 어휘 문제(walked 대신 walk 사용)와 통사론 문제(잘못된 시제 일치)가 있는 것처럼 보인다.

### 6.3 핵심 기술 개념

#### 오류 패턴
**기술 정의**: 구성요소와 오류 유형별로 유사한 오류를 그룹화, 발생 횟수(전체 및 최근)와 최대 3개의 구체적 예시 포함
**쉬운 설명**: 같은 실수를 계속하면 시스템이 그룹화: "지난 2주간 이 실수를 7번 했고, 3가지 예시가 있습니다."

#### 동시 발생 오류
**기술 정의**: 같은 학습 세션 내에서 어떤 구성요소 오류 유형이 함께 나타나는 경향이 있는지 식별하는 상관관계 분석
**쉬운 설명**: 일부 오류는 무리 지어 다닌다. 어휘로 어려움 겪는 모든 세션에 형태론 오류도 있다면, 형태론이 근본 원인일 수 있다는 단서.

#### 병목 감지
**기술 정의**: 오류율이 임계값(기본 30%)을 초과하거나 추세가 0.5를 초과하는 구성요소를 식별하여 `isBottleneck: true`로 플래그
**쉬운 설명**: "병목"은 가장 많이 방해하는 것. 형태론 오류율이 30% 이상이면 병목으로 플래그 - 다른 기술보다 먼저 집중해야 할 것.

#### 교정 계획
**기술 정의**: 병목 분석과 오류 패턴 데이터를 결합하여 생성된 구성요소 코드, 우선순위 수준(high/medium/low), 권장 텍스트, 제안 과제 유형을 포함한 우선순위 권장 목록
**쉬운 설명**: 오류 분석 후 시스템이 "처방전" 생성 - 각 영역에 대한 구체적 운동 유형과 함께 작업할 것의 우선순위 목록.

### 6.4 구성요소별 과제 유형 매핑

| 구성요소 | 권장 과제 유형 |
|----------|---------------|
| 음운론 (PHON) | 받아쓰기, 듣기 이해 |
| 형태론 (MORPH) | 제약 조건 있는 빈칸 채우기, 단어 형성 분석 |
| 어휘 (LEX) | 클로즈 삭제, 매칭, 워드 뱅크 |
| 통사론 (SYNT) | 문장 결합/분리, 오류 수정 |
| 화용론 (PRAG) | 레지스터 전환, 대화 완성 |

### 6.5 구성 및 임계값

| 파라미터 | 기본값 | 목적 |
|----------|--------|------|
| `windowDays` | 14 | 패턴 분석 시간 창 |
| `recentDays` | 7 | 추세 계산을 위한 "최근" 정의 |
| `threshold` | 0.3 (30%) | 병목으로 플래그되는 오류율 |
| `trendThreshold` | 0.5 | 병목으로 플래그되는 추세 값 |
| `confidence` | 0.8 | 새 오류 분석의 기본 신뢰도 |

### 6.6 함수 참조

| 카테고리 | 함수 | 목적 |
|----------|------|------|
| CRUD | `createErrorAnalysis()` | 전체 분류로 새 오류 기록 |
| CRUD | `getErrorAnalysisForResponse()` | responseId로 오류 기록 조회 |
| 패턴 | `identifyErrorPatterns()` | 예시와 함께 구성요소/유형별 오류 그룹화 |
| 패턴 | `findCooccurringErrors()` | 함께 실패하는 구성요소 쌍 감지 |
| 통계 | `getUserComponentStats()` | 사용자의 모든 구성요소 통계 조회 |
| 통계 | `recalculateComponentStats()` | 원시 오류 데이터에서 모든 통계 재계산 |
| 병목 | `detectBottlenecks()` | 임계값 이상의 모든 구성요소 식별 |
| 병목 | `getPrimaryBottleneck()` | 가장 차단하는 단일 구성요소 찾기 |
| 병목 | `generateRemediationPlan()` | 우선순위 개선 권장 생성 |

---

## 7. 목표 리포지토리 (Goal)

> **코드 위치**: `src/main/db/repositories/goal.repository.ts`
> **상태**: Active

### 7.1 목적

**학습 목표**는 LOGOS의 중심 조직 개념이다. 사용자는 단순히 "어휘를 배우는" 것이 아니라 특정 목적을 위해 어휘를 배운다: IELTS 통과, 의료 분야 취업, 학술 논문 작성.

목표 리포지토리는 **목표와 관련 언어 객체의 데이터 접근 계층**을 제공한다.

**비즈니스 영향**: 모든 학습 세션, 모든 어휘 항목, 모든 진행 지표는 목표를 중심으로 조직된다. 이 리포지토리는 LOGOS가 개인화된, 목표 지향적 학습을 제공하는 기반.

### 7.2 핵심 개념

#### GoalSpec 엔티티
**기술 정의**: 사용자의 학습 목표를 나타내는 DB 레코드. domain, modality (JSON 배열), genre, purpose, benchmark, deadline, completionPercent, active 상태 포함.
**쉬운 설명**: 목표는 강의 계획서와 같다 - 무엇을 배울지(domain), 어떻게 배울지(modalities), 어떤 유형의 콘텐츠(genre), 왜 배우는지(purpose), 선택적으로 준비하는 시험(benchmark).

#### 자동 점수 계산
**기술 정의**: 언어 객체 추가 시 `morphologicalScore`(어미 복잡성)와 `phonologicalDifficulty`(발음 복잡성) 자동 계산
**쉬운 설명**: 단어 추가 시 시스템이 자동으로 철자와 발음 난이도 파악. 학습 알고리즘이 쉬운 단어를 먼저 선택하도록 도움.

### 7.3 설계 결정

#### JSON으로 Modality 직렬화하는 이유
`modality` 필드는 `["reading", "writing"]` 같은 배열을 저장하지만 SQLite는 배열을 지원하지 않는다. 리포지토리가 JSON 직렬화/역직렬화를 투명하게 처리.
**트레이드오프**: 쿼리 복잡성(SQL에서 modality로 쉽게 필터링 불가) vs 스키마 단순성(단일 컬럼)

#### 트랜잭션으로 대량 우선순위 업데이트하는 이유
`bulkUpdatePriorities()`는 모든 업데이트를 Prisma 트랜잭션으로 래핑.
**이유**: 우선순위 재계산은 수백 개 객체를 동시에 업데이트. 트랜잭션은 모두 성공하거나 모두 실패하여 스케줄링 알고리즘을 혼란스럽게 할 수 있는 부분 업데이트 상태 방지.

### 7.4 데이터 흐름: 목표 생성부터 학습까지

```
[사용자가 목표 생성]
        |
        v
[createGoal()] --> [GoalSpec 삽입]
        |
        v
[코퍼스 파이프라인이 어휘 채움]
        |
        v
[addLanguageObjectsToGoal()] --> [LanguageObjects 삽입]
        |                        |
        |                        v
        |                [형태론/음운론 점수 자동 계산]
        |                        |
        |                        v
        |                [MasteryState 레코드 생성]
        |
        v
[사용자가 세션 시작]
        |
        v
[getLanguageObjects()] --> [큐용 우선순위 정렬 항목]
        |
        v
[사용자가 항목 완료]
        |
        v
[calculateGoalProgress()] --> [completionPercent 업데이트]
```

### 7.5 함수 참조

| 함수 | 목적 | 반환 |
|------|------|------|
| `createGoal(input)` | 새 목표 생성 | `GoalSpec` |
| `getGoalById(goalId)` | 단일 목표 조회 | `GoalSpec \| null` |
| `getGoalWithObjects(goalId, limit?)` | 어휘 포함 목표 조회 | `GoalWithObjects \| null` |
| `getGoalsByUser(userId, activeOnly?)` | 사용자의 목표 목록 | `GoalSpec[]` |
| `updateGoal(goalId, input)` | 목표 수정 | `GoalSpec` |
| `deleteGoal(goalId)` | 목표 + 캐스케이드 제거 | `void` |
| `calculateGoalProgress(goalId)` | 완료 통계 계산 | `GoalProgress` |
| `addLanguageObjectsToGoal(goalId, objects, options?)` | 어휘 대량 삽입 | `number` (개수) |
| `getLanguageObjects(goalId, options?)` | 어휘 조회 | `LanguageObject[]` |
| `updateObjectPriority(objectId, priority)` | 단일 우선순위 업데이트 | `void` |
| `bulkUpdatePriorities(updates)` | 배치 우선순위 업데이트 | `void` |

---

## 핵심 설계 패턴

### 싱글톤 패턴 (Singleton)
클래스 인스턴스를 하나로 제한. DB 연결은 비용이 크므로 공유.

### 배럴 익스포트 (Barrel Export)
단일 `index.ts`에서 모든 공개 API 재익스포트. 소비자가 내부 구조를 몰라도 된다.

### 리포지토리 패턴 (Repository)
데이터 접근 로직 캡슐화. DB 변경 시 리포지토리 내부만 수정.

### ACID 트랜잭션
원자성, 일관성, 격리성, 지속성 보장. 여러 테이블 업데이트 시 전부 성공하거나 전부 실패.

---

## 중요도: Critical

**실패 시**:
- 완전한 데이터 접근 불가
- 세션 실패로 진행 상황 손실
- IRT/FSRS 알고리즘 작동 불가
- 전체 앱 작동 불가

---

## 변경 이력

| 날짜 | 변경 | 이유 | 영향 |
|------|------|------|------|
| 2026-01-07 | 통합 문서 생성 | 데이터베이스 레이어 문서 한국어 통합 | 포괄적인 한국어 참조 문서 제공 |
| 2026-01-04 | 리포지토리 문서 생성 | Phase 2.1-2.4 구현 | 숙달도, 세션, 연어, 오류 분석 추적 활성화 |

---

**이전**: [07-ipc](../07-ipc/) | **다음**: [09-config-build](../09-config-build/)
