# 데이터베이스 레이어 (Database Layer)

> **최종 업데이트**: 2026-01-07
> **원본 위치**: `docs/narrative/src/main/db/`

---

## 데이터베이스 모듈 인덱스 (index.ts)

> **코드 위치**: `src/main/db/index.ts`

### 목적

데이터베이스 모듈의 **배럴 익스포트(Barrel Export)** 파일. 데이터베이스 관련 모든 기능을 단일 위치에서 임포트할 수 있게 한다.

**비즈니스 요구**: LOGOS는 사용자 학습 데이터, 목표, 숙달도, 세션, 연어(Collocation) 정보를 저장해야 한다.

### 재익스포트 항목

**연결 유틸리티** (`./prisma.ts`):
- `getPrisma()` - 싱글톤 Prisma 클라이언트 인스턴스
- `initDatabase()` - 앱 시작 시 DB 연결
- `closeDatabase()` - 앱 종료 시 연결 해제
- `withTransaction()` - ACID 트랜잭션 래퍼

**리포지토리 클래스** (`./repositories/`):
- `goal.repository` - 학습 목표 관리
- `mastery.repository` - 숙달도 추적
- `session.repository` - 세션 기록
- `collocation.repository` - 연어 패턴 저장

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

### 아키텍처 계층

LOGOS 3계층 아키텍처의 **데이터 접근 계층(Data Access Layer)**:

- **계층 1 (렌더러)**: React UI 컴포넌트
- **계층 2 (메인 프로세스)**: IPC 핸들러, 비즈니스 로직
- **계층 3 (데이터 접근)**: 이 모듈 - DB 연결, 리포지토리 패턴

### 핵심 영향

- **학습 진행 추적**: 영속 저장소 없이는 앱 종료 시 모든 데이터 손실
- **적응형 알고리즘**: IRT, FSRS 알고리즘은 과거 데이터 필요
- **목표 관리**: 세션 간 학습 목표 유지
- **연어 분석**: PMI 계산을 위한 빈도 데이터

### 핵심 패턴

**배럴 익스포트(Barrel Export)**
단일 `index.ts`에서 모든 공개 API 재익스포트. 소비자가 내부 구조를 몰라도 된다.

```typescript
// 기존
import { getPrisma } from './db/prisma';
import { GoalRepository } from './db/repositories/goal.repository';

// 배럴 익스포트
import { getPrisma, GoalRepository } from './db';
```

**싱글톤 패턴(Singleton)**
클래스 인스턴스를 하나로 제한. DB 연결은 비용이 크므로 공유.

**리포지토리 패턴(Repository)**
데이터 접근 로직 캡슐화. DB 변경 시 리포지토리 내부만 수정.

**ACID 트랜잭션**
원자성, 일관성, 격리성, 지속성 보장. 여러 테이블 업데이트 시 전부 성공하거나 전부 실패.

### 중요도: Critical

실패 시 전체 앱 작동 불가. 학습 알고리즘은 과거 데이터 없이 작동 불가.

---

## Prisma 클라이언트 싱글톤 (prisma.ts)

> **코드 위치**: `src/main/db/prisma.ts`

### 목적

LOGOS용 **싱글톤 PrismaClient** 제공. Electron 앱은 DB 생명주기 관리가 중요하다.

**사용 시점**:
- `initDatabase()`: 앱 시작 시 `createWindow()`에서 호출
- `getPrisma()`: DB 접근 필요 시
- `closeDatabase()`: 앱 종료 시
- `withTransaction()`: 여러 작업의 원자적 실행

### 의존 관계

**의존성**:
- `@prisma/client`: 스키마 기반 자동 생성 클라이언트
- `prisma/schema.prisma`: 스키마 정의 (빌드 타임)

**의존자**:
- `src/main/index.ts`: `initDatabase()` 호출
- `src/main/ipc/session.ipc.ts`: 세션, 응답, 분석
- `src/main/ipc/learning.ipc.ts`: 언어 객체 CRUD
- `src/main/ipc/goal.ipc.ts`: 목표 관리

### 데이터 흐름

```
앱 시작
    |
    v
index.ts: createWindow()
    |
    v
initDatabase() --> getPrisma() --> new PrismaClient() --> $connect()
    |                                     |
    |                                     v
    |                            SQLite 데이터베이스 파일
    |
    v
IPC 핸들러 등록
    |
    v
[앱 실행 중 - 핸들러가 getPrisma()로 쿼리]
    |
    v
앱 종료
    |
    v
closeDatabase() --> $disconnect() --> prisma = null
```

### 아키텍처 다이어그램

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
|  --> prisma.ts (이 모듈) <--                      |
+---------------------------------------------------+
            |
            v
+---------------------------------------------------+
|  계층 4: 스토리지 (SQLite via better-sqlite3)     |
|  - User, GoalSpec, LanguageObject, MasteryState   |
|  - Session, Response, ThetaSnapshot, CachedTask   |
+---------------------------------------------------+
```

### 핵심 개념

**연결 풀링(Connection Pooling)**
쿼리마다 연결 생성/파괴 대신 재사용. Prisma가 내부적으로 관리.

**지연 초기화(Lazy Initialization)**
`getPrisma()`는 첫 호출 시에만 클라이언트 생성.

**데이터베이스 트랜잭션(Database Transaction)**
전부 성공 또는 전부 롤백. `withTransaction()` 헬퍼가 관련 작업의 원자성 보장.

**HMR(Hot Module Replacement) 고려**
개발 중 모듈 리로드 시 고아 연결 방지.

### 중요도: Critical (5/5)

실패 시:
- 완전한 데이터 접근 불가
- 세션 실패로 진행 상황 손실
- IRT/FSRS 알고리즘 작동 불가

---

## Prisma 데이터베이스 클라이언트 (client.ts)

> **코드 위치**: `src/main/db/client.ts`

### 목적

LOGOS Electron 앱 전체의 **싱글톤 데이터베이스 연결** 제공. 두 가지 인프라 문제 해결:

1. **연결 풀링**: 싱글톤 없이는 각 파일이 자체 연결 생성하여 풀 고갈
2. **HMR 누수 방지**: 파일 저장 시 리로드마다 새 연결 생성하면 메모리 누수

**사용 시점**:
- 앱 시작: `initDatabase()`
- DB 읽기/쓰기: `prisma` 클라이언트
- 앱 종료: 자동 정상 종료 핸들러

### 의존자

**메인 엔트리**:
- `src/main/index.ts`: `initDatabase()` 호출

**IPC 핸들러**:
- `src/main/ipc/claude.ipc.ts`: AI 관련 데이터
- `src/main/ipc/goal.ipc.ts`: 학습 목표 CRUD
- `src/main/ipc/learning.ipc.ts`: 학습 세션 데이터
- `src/main/ipc/onboarding.ipc.ts`: 사용자 설정
- `src/main/ipc/session.ipc.ts`: 연습 세션 추적

### 데이터 흐름

```
앱 시작
    |
    v
index.ts에서 initDatabase() 호출
    |
    v
PrismaClient.$connect()
    |
    v
prisma 클라이언트가 싱글톤으로 전역 사용 가능
    |
    v
IPC 핸들러가 prisma로 쿼리
    |
    v
앱 종료 시 SIGINT/SIGTERM
    |
    v
gracefulShutdown()으로 연결 종료
```

### 아키텍처 계층

```
계층 1: 렌더러 프로세스 (React UI)
         |
         | IPC 메시지
         v
계층 2: 메인 프로세스 IPC 핸들러
         |
         | prisma 클라이언트 호출
         v
계층 3: 이 모듈 (데이터베이스 접근)
         |
         | SQL via Prisma
         v
계층 4: SQLite 데이터베이스 (logos.db)
```

### 활성화 기능

이 모듈은 앱 전체의 **단일 DB 접근 지점**:

- **사용자 프로필**: 사용자 데이터, 설정, 세타 능력 점수
- **학습 목표**: 목표 생성, 추적, 완료 상태
- **세션 기록**: 연습 세션, 개별 응답
- **숙달도 추적**: FSRS 스케줄링 상태
- **연어 학습**: PMI 점수화된 구문 패턴
- **오류 분석**: AI 생성 오류 설명
- **진행 분석**: 차트/통계용 과거 데이터

### 핵심 개념

**전역 객체 저장(globalThis)**
`globalThis`에 클라이언트 저장하면 HMR 시에도 유지. 리로드 프로세스가 건드리지 않는 "안전한 방".

**널 병합 연산자(??)**
`기존연결 ?? 새연결` - 있으면 기존 사용, 없으면 새로 생성.

**정상 종료(Graceful Shutdown)**
SIGINT/SIGTERM 핸들러로 종료 전 연결 정상 종료. 갑자기 끊으면 데이터 손상 위험.

**환경 인식 로깅**
`NODE_ENV`에 따라 로그 레벨 변경. 개발에서는 상세 쿼리, 프로덕션에서는 오류만.

### 실패 모드

| 실패 모드 | 영향 |
|-----------|------|
| 시작 시 연결 실패 | 앱 시작 불가 |
| 세션 중 연결 끊김 | 진행 상황 손실, 앱 충돌 |
| 다중 인스턴스 생성 | 메모리 고갈, DB 잠금 |
| 정상 종료 없음 | 데이터 손상 |

### 설계 결정

**두 개의 DB 모듈 (client.ts vs prisma.ts)**

- `client.ts`: 직접 익스포트 싱글톤, IPC 핸들러에서 사용
- `prisma.ts`: 트랜잭션 헬퍼 포함, 리포지토리 패턴에서 사용

둘 다 싱글톤 문제 해결. 코드베이스 진화 과정에서 두 가지 접근법 공존.

**SQLite 선택 이유**

LOGOS는 데스크톱 Electron 앱:
- **서버 불필요**: 단일 파일 DB
- **설정 불필요**: 설치 즉시 작동
- **이식성**: 파일 복사로 백업/복원
- **단일 사용자에 빠름**: 네트워크 지연 없음

---

## 변경 이력

### 2026-01-07 - 한국어 문서 통합
- **변경 내용**: 3개 데이터베이스 레이어 문서(index.md, prisma.md, client.md)를 한국어로 번역하여 단일 문서로 통합
- **이유**: 한국어 사용자를 위한 접근성 향상
- **영향**: 데이터베이스 레이어에 대한 포괄적인 한국어 참조 문서 제공
