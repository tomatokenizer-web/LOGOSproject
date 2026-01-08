# 제13부: 렌더러 계층 - 컴포넌트 (Renderer Layer - Components)

---

## 13.1 index.ts - 중앙 컴포넌트 배럴 익스포트 (Central Components Barrel Export)

### 이 파일이 존재하는 이유

이 파일은 전체 렌더러 컴포넌트 라이브러리의 루트 배럴(barrel) 파일입니다. 모든 컴포넌트 카테고리(ui, layout, goal, session, analytics)를 집계하고 재익스포트(re-export)하여 애플리케이션의 모든 소비자가 단일 경로에서 임포트할 수 있게 합니다:

```typescript
import { GlassButton, AppShell, GoalCard, SessionView, ProgressDashboard } from '@/renderer/components';
```

이 중앙 인덱스가 없다면, 임포트가 수십 개의 경로에 흩어져 리팩토링이 고통스럽고 멘탈 모델(mental model)이 파편화됩니다.

### 핵심 개념

- **와일드카드 재익스포트(Wildcard Re-exports)**: 각 컴포넌트 카테고리에 대해 `export * from './submodule'` 패턴을 사용합니다. 이는 하위 인덱스 파일에 추가된 항목이 자동으로 루트로 전파됨을 의미합니다.

- **카테고리 모듈**:
  - `ui`: 디자인 시스템 프리미티브(버튼, 카드, 입력, 배지, 진행 표시기)
  - `layout`: 애플리케이션 셸, 사이드바, 네비게이션 크롬
  - `goal`: 목표 CRUD 컴포넌트
  - `session`: 학습 세션 경험(질문, 피드백, 진행)
  - `analytics`: 대시보드 및 데이터 시각화

### 설계 결정

1. **플랫 재익스포트 전략(Flat Re-export Strategy)**: 모든 하위 모듈은 네임스페이싱 없이 재익스포트됩니다. 이는 엄격한 분류보다 임포트 편의성(`{ GlassButton }`)을 우선시합니다. 트레이드오프는 두 모듈이 같은 이름을 익스포트할 경우 잠재적 이름 충돌인데, 현재는 컨벤션으로 회피하고 있습니다.

2. **의존성 순서(Order by Dependency)**: 임포트는 대략 의존성 수준에 따라 정렬됩니다(ui가 먼저, 그 다음 layout, 그 다음 도메인 컴포넌트). UI 프리미티브는 내부 의존성이 없으며, 도메인 컴포넌트는 UI에 의존할 수 있습니다.

3. **직접 컴포넌트 정의 없음**: 이 파일은 컴포넌트 코드를 전혀 포함하지 않으며, 재익스포트만 합니다. 순수하게 집계 지점으로만 존재하여 단일 책임 원칙(Single Responsibility Principle)을 유지합니다.

### 통합 지점

| 방향 | 모듈 | 관계 |
|------|------|------|
| 업스트림 | `renderer/pages/*` | 모든 페이지가 이 배럴에서 컴포넌트를 임포트 |
| 업스트림 | `renderer/App.tsx` | 레이아웃 컴포넌트를 직접 임포트할 수 있음 |
| 다운스트림 | `renderer/components/ui/index` | 디자인 시스템 프리미티브 제공 |
| 다운스트림 | `renderer/components/layout/index` | 앱 셸과 네비게이션 제공 |
| 다운스트림 | `renderer/components/goal/index` | 목표 도메인 컴포넌트 제공 |
| 다운스트림 | `renderer/components/session/index` | 세션 도메인 컴포넌트 제공 |
| 다운스트림 | `renderer/components/analytics/index` | 시각화 컴포넌트 제공 |

---

## 13.2 index.ts - 분석 컴포넌트 배럴 익스포트 (Analytics Components Barrel Export)

### 이 파일이 존재하는 이유

분석 인덱스 파일은 LOGOS의 모든 대시보드 및 데이터 시각화 컴포넌트의 단일 진입점 역할을 합니다. 이 배럴 익스포트가 없다면, 모든 소비자가 각 분석 컴포넌트의 정확한 파일 경로를 알아야 하며, 이는 코드베이스 전체에 흩어진 취약한 임포트로 이어집니다. 여기서 익스포트를 통합함으로써, 내부 파일 구조의 리팩토링이 소비자에게 투명해집니다.

이 모듈은 학습자가 진행 상황을 관찰하고, 병목 현상을 식별하며, 지식 관계를 이해할 수 있는 "인사이트 콕핏(Insights Cockpit)" 경험을 가능하게 합니다.

### 핵심 개념

- **ProgressDashboard**: 학습 지표(정확도, 연속 학습, 숙달 분포)를 소화하기 쉬운 요약으로 집계하는 메인 분석 뷰입니다. `ProgressData`와 `BottleneckData`를 소비하여 고수준 KPI를 렌더링합니다.

- **NetworkGraph / NetworkGraphCard**: 학습 객체 간의 관계를 보여주는 힘 기반 방향 그래프(force-directed graph) 시각화입니다. 두 개의 변환 헬퍼(`collocationsToGraph`, `morphologyToGraph`)가 원시 언어 데이터를 렌더러가 요구하는 `GraphNode` / `GraphEdge` 형식으로 변환합니다.

- **타입 재익스포트(Type Re-exports)**: `ProgressDashboardProps`, `NetworkGraphProps`, `NetworkGraphCardProps`를 노출하여 부모 컴포넌트가 구현 파일을 임포트하지 않고도 props를 타입 체크할 수 있습니다.

### 설계 결정

1. **공존 변환기(Co-located Converters)**: `collocationsToGraph`와 `morphologyToGraph` 함수는 별도의 `/utils` 폴더에 위치하지 않고 시각화 컴포넌트와 함께 익스포트됩니다. 이는 변환 로직을 유일한 소비자 가까이에 유지하여 인지 부하를 줄입니다.

2. **이중 컴포넌트 익스포트(Dual Component Export)**: `NetworkGraph`(원시 캔버스)와 `NetworkGraphCard`(스타일이 적용된 래퍼)가 모두 노출됩니다. 이를 통해 간단한 페이지는 원시 그래프를 임베드하고, 기능 페이지는 내장 컨트롤이 있는 카드 변형을 사용할 수 있습니다.

3. **명시적 타입 익스포트(Explicit Type Exports)**: 타입은 `export * from`을 사용하지 않고 명시적으로 재익스포트됩니다. 이는 퍼블릭 API 표면을 의도적으로 만들고 우발적인 내부 타입 누출을 방지합니다.

### 통합 지점

| 방향 | 모듈 | 관계 |
|------|------|------|
| 업스트림 | `renderer/pages/DashboardPage` | 메인 뷰를 렌더링하기 위해 `ProgressDashboard` 임포트 |
| 업스트림 | `renderer/pages/AnalyticsPage` | 관계 시각화를 위해 `NetworkGraphCard` 임포트 |
| 다운스트림 | `renderer/hooks/useLogos` | `useProgress`, `useBottlenecks`가 이 컴포넌트들이 소비하는 데이터 제공 |
| 다운스트림 | `main/ipc/analytics.ipc` | IPC 핸들러가 원시 분석 페이로드 공급 |
| 형제 | `renderer/components/charts/*` | ProgressDashboard 내부에서 구성될 수 있는 하위 수준 차트 프리미티브 |

---

## 13.3 NetworkGraph 컴포넌트 (NetworkGraph Component)

> **최종 업데이트**: 2026-01-04
> **코드 위치**: `src/renderer/components/analytics/NetworkGraph.tsx`
> **상태**: 활성
> **이론적 기반**: ALGORITHMIC-FOUNDATIONS.md Part 2 (PMI), THEORETICAL-FOUNDATIONS.md (Vocabulary Networks)

---

### 맥락과 목적 (Context & Purpose)

#### 이 컴포넌트가 존재하는 이유

NetworkGraph 컴포넌트는 언어 학습자들의 근본적인 질문에 답하기 위해 존재합니다: **"내가 배우고 있는 단어들이 서로 어떻게 연결되어 있는가?"**

언어는 고립된 어휘 항목의 목록이 아닙니다. 단어가 관계를 통해 의미를 파생하는 밀접하게 상호 연결된 웹입니다. "Run"은 "jog," "sprint," "marathon," "runner"와 연결됩니다. "Patient"는 "doctor," "hospital," "medication," "diagnosis"의 별자리 속에 존재합니다. 이러한 연결을 이해하면 학습이 가속화되는데, 뇌가 본질적으로 연상 네트워크를 통해 정보를 저장하고 검색하기 때문입니다.

LOGOS는 이러한 관계를 상호작용형 힘 기반 방향 그래프(force-directed graph)로 시각화합니다:
- **노드(Nodes)**: 언어 객체(단어, 구문, 어근, 연어)를 나타냄
- **엣지(Edges)**: 관계(PMI 가중치 연어, 형태론적 가족, 의미론적 클러스터)를 나타냄
- **시각적 속성**: 학습 상태(숙달 수준, 언어 구성 요소 유형)를 인코딩

이는 추상적인 통계적 관계(코퍼스 분석의 PMI 점수 등)를 학습자가 성장하는 어휘의 구조를 볼 수 있는 유형적이고 탐험 가능한 시각화로 변환합니다.

**비즈니스 필요**: 전통적인 어휘 앱은 단어를 언어의 네트워크 구조를 무시하고 플래시카드 목록으로 제시합니다. 학습자는 어떤 단어가 다른 단어를 열어주는지, 어떤 클러스터가 함께 속하는지, 지식에 어디에 틈이 있는지 볼 수 없습니다. NetworkGraph는 어휘의 이 "지도 뷰"를 제공하여 언어 학습을 암기에서 탐험으로 변환합니다.

**사용 시기**:
- 분석 대시보드에서 시간에 따른 어휘 네트워크 성장 표시
- 특정 단어를 검토하여 연어 및 관련 형태 확인
- 학습 기회 식별(고립된 노드는 어휘 격차 암시)
- 형태론적 가족 시각화(동사 활용, 명사 파생)
- 의미 도메인을 통한 진행 표시(의료 어휘 클러스터, 법률 용어 클러스터)

---

### 설계 철학: 물리학을 은유로 (The Design Philosophy: Physics as Metaphor)

#### 왜 힘 기반 방향 레이아웃인가?

이 컴포넌트는 **힘 기반 방향 그래프 알고리즘**(때로 "힘 시뮬레이션" 또는 "스프링-전기 모델"이라고도 함)을 사용합니다:
- 노드는 하전 입자처럼 서로 밀어냅니다 (**쿨롱의 법칙(Coulomb's Law)**)
- 엣지는 스프링처럼 연결된 노드를 끌어당깁니다 (**훅의 법칙(Hooke's Law)**)
- 중심 중력이 그래프가 표류하는 것을 방지합니다

이는 자연스럽고 유기적인 레이아웃을 만듭니다:
- 강하게 연결된 단어는 함께 클러스터링
- 약하게 연결된 단어는 떨어져 표류
- 전체 구조가 어휘 지식의 토폴로지를 드러냄

**물리학 은유는 교육학적으로 의미가 있습니다**: "함께 속하는" 단어는 문자 그대로 화면에서 서로를 향해 끌립니다. PMI 점수는 엣지 두께로 가시화됩니다. 학습자는 "patient"와 "medication"이 강한 관계를 가지고 있는 반면, "patient"와 "motorcycle"은 없다는 것을 *볼* 수 있습니다.

#### 순수 TypeScript, D3 없음 (Pure TypeScript, No D3)

중요한 아키텍처 결정: 이 컴포넌트는 D3.js(이러한 시각화를 위한 표준 라이브러리)에 의존하지 않고 순수 TypeScript로 자체 힘 시뮬레이션을 처음부터 구현합니다.

**왜 D3를 피하는가?**
1. **번들 크기**: D3는 크다(~100KB 압축). 힘 시뮬레이션만은 ~2KB에 불과.
2. **학습 곡선**: D3의 API는 복잡하기로 유명. 이 구현은 투명함.
3. **Electron 호환성**: 순수 TypeScript는 폴리필 없이 어디서든 실행.
4. **디버깅**: 문제가 생기면 물리 코드가 바로 거기에서 검사 가능.
5. **커스터마이징**: PMI 가중치가 스프링 상수로 어떻게 변환되는지 정확히 제어.

트레이드오프는 D3의 광범위한 레이아웃 및 헬퍼 에코시스템을 사용할 수 없다는 것이지만, 이 특정 사용 사례(힘 기반 방향 어휘 네트워크)에서 커스텀 구현은 LOGOS가 필요로 하는 것을 정확히 제공합니다.

---

### 마이크로스케일: 직접 관계 (Microscale: Direct Relationships)

#### 의존성 (이 컴포넌트가 필요로 하는 것)

**`src/renderer/components/ui/index.ts`**: 디자인 시스템 컴포넌트
- `GlassCard`: 빈 상태 및 래핑된 카드 변형을 위한 컨테이너
- `GlassBadge`: 숙달 수준 색상을 보여주는 범례 표시기
- `GlassButton`: NetworkGraphCard 변형의 새로고침 버튼

이것들이 유일한 외부 React 컴포넌트 의존성입니다. 시각화 자체는 네이티브 Canvas API를 사용합니다.

**브라우저 API**:
- `CanvasRenderingContext2D`: 모든 렌더링은 DOM 요소가 아닌 HTML5 Canvas를 통해 이루어짐
- `requestAnimationFrame`: 부드러운 물리 애니메이션 루프 구동
- `window.devicePixelRatio`: 고 DPI (Retina) 디스플레이 스케일링 처리

#### 의존자 (이 컴포넌트가 필요한 것)

**`src/renderer/components/analytics/ProgressDashboard.tsx`** (형제 - 향후 통합)
- 대시보드는 현재 숙달 분포와 병목 현상을 표시
- NetworkGraph는 통계와 함께 어휘 토폴로지를 보여주기 위해 통합될 예정

**`src/core/state/component-search-engine.ts`**: 데이터 소스
- `buildNetworkGraph()` 메서드가 `NetworkNode[]`와 `NetworkEdge[]` 생성
- 이 데이터가 NetworkGraph의 `nodes`와 `edges` props로 흐름
- 검색 엔진이 ComponentObjectState 관계(연어, 형태론적 가족)를 그래프 형식으로 변환

**향후 의존자**:
- 단어 상세 뷰(특정 단어 주변 네트워크 표시)
- 학습 경로 시각화(선수 조건 체인 표시)
- 의미 도메인 탐험기(특정 어휘 클러스터로 줌)

#### 데이터 흐름 (Data Flow)

```
ComponentObjectState records (from database)
        |
        v
[ComponentSearchEngine.buildNetworkGraph()]
        |
        | Extracts: collocations (with PMI), morphological family,
        |           semantic neighbors, prerequisite relations
        v
NetworkGraphView { nodes: NetworkNode[], edges: NetworkEdge[] }
        |
        | Adapter transformation (type mapping)
        v
NetworkGraphProps { nodes: GraphNode[], edges: GraphEdge[] }
        |
        v
[NetworkGraph Component]
        |
        +-- initializeSimulation() --> SimNode[], SimEdge[]
        |
        +-- simulationStep() --> Position updates (physics)
        |
        +-- renderGraph() --> Canvas draw calls
        |
        +-- findNodeAtPosition() --> Hit testing for interaction
        |
        v
Visual Output: Interactive force-directed graph on Canvas
```

---

### 매크로스케일: 시스템 통합 (Macroscale: System Integration)

#### 아키텍처 계층 (Architectural Layer)

NetworkGraph는 LOGOS의 **프레젠테이션 계층**, 특히 분석 시각화 서브시스템에 위치합니다:

```
Layer 5: Application Shell (routing, navigation)
Layer 4: Pages/Views (DashboardPage, SessionPage)
Layer 3: Feature Components (ProgressDashboard, SessionView)
Layer 2: Visualization Components (NetworkGraph, charts) <-- 현재 위치
Layer 1: Design System Primitives (GlassCard, GlassButton)
Layer 0: Canvas/DOM APIs
```

이것은 **순수 프레젠테이션 컴포넌트**입니다: 데이터(노드, 엣지)를 받고, 렌더링하며, 이벤트(onNodeClick, onNodeDoubleClick)를 발생시킵니다. 데이터가 어디서 오는지 또는 노드가 클릭되면 무슨 일이 일어나는지에 대한 지식이 없습니다.

#### 통계와 직관 사이의 다리 (The Bridge Between Statistics and Intuition)

NetworkGraph는 추상적인 코퍼스 통계와 인간 직관 사이의 중요한 **번역 계층**입니다:

```
ALGORITHMIC WORLD                    VISUAL WORLD
────────────────────────────────────────────────────────
PMI score: 4.7                 -->   두꺼운, 강조된 엣지
NPMI normalized: 0.72          -->   팽팽하게 당겨진 엣지(짧음)
Mastery stage: 3               -->   노드 크기: 18px, 녹색 채우기
Component: MORPH               -->   팔레트의 보라색
Collocation relation           -->   파란색 엣지
Morphological relation         -->   보라색 엣지
Semantic relation              -->   녹색 엣지
```

이 번역이 컴포넌트가 중요한 이유입니다: 보이지 않는 관계를 가시화합니다.

#### 숙달 시스템과의 통합 (Integration with Mastery System)

숙달 단계의 시각적 인코딩은 교육학적 목적을 수행합니다:

| 숙달 단계 | 시각적 인코딩 | 의미 |
|-----------|---------------|------|
| 0 (신규) | 작고 회색 노드 | 알려지지 않은 단어, 최근 도입됨 |
| 1 (학습 중) | 호박색 노드 | 인식되지만 안정적으로 회상되지 않음 |
| 2 (익숙함) | 파란색 노드 | 약간의 노력으로 회상 가능 |
| 3 (능숙) | 녹색 노드 | 안정적인 회상, 자동화에 근접 |
| 4 (숙달) | 크고 보라색 노드 | 완전히 자동화됨, 무의식적 검색 |

학습자는 즉시 볼 수 있습니다: "내 네트워크에는 몇 개의 큰 보라색 노드에 연결된 많은 작은 회색 노드가 있다." 이것은 자연스러운 진행을 드러냅니다: 허브 단어를 숙달하고, 그 다음 바깥쪽으로 확장.

#### 언어 구성 요소와의 통합 (Integration with Linguistic Components)

노드가 언어 구성 요소 유형(PHON, MORPH, LEX, SYNT, PRAG)으로 태그되면, 색상 팔레트가 해당 단어가 대표하는 언어 지식의 *측면*을 보여주도록 전환됩니다:

| 구성 요소 | 색상 | 의미 |
|-----------|------|------|
| PHON (Phonology, 음운론) | 분홍색 | 발음, 소리 패턴 |
| MORPH (Morphology, 형태론) | 보라색 | 단어 형성, 접두사, 접미사 |
| LEX (Lexical, 어휘) | 파란색 | 핵심 어휘 의미 |
| SYNT (Syntax, 통사론) | 녹색 | 문법적 사용 패턴 |
| PRAG (Pragmatics, 화용론) | 주황색 | 맥락적/사회적 사용 |

이를 통해 그래프는 *어떤 단어*가 연결되어 있는지뿐만 아니라 각 연결이 *어떤 종류의 지식*을 나타내는지 보여줄 수 있습니다.

#### NetworkGraph가 없으면 무엇이 망가지는가

이 컴포넌트가 실패하거나 제거되면:
1. **어휘 토폴로지 시각화 없음**: 학습자가 지식의 "지도"를 잃음
2. **연어 관계 보이지 않음**: PMI 데이터에 시각적 표현 없음
3. **형태론적 가족 보이지 않음**: 어근/파생 관계 숨겨짐
4. **진행이 추상적으로 느껴짐**: 공간적 구조 없는 통계
5. **학습이 고립되게 느껴짐**: 단어가 어떻게 연결되는지 감각 없음

NetworkGraph는 크리티컬 패스가 아니지만(앱은 이것 없이도 실행됨), LOGOS를 플래시카드 앱과 차별화하는 *탐험적 학습 경험*에 필수적입니다.

---

### 기술 개념 (평이한 언어) (Technical Concepts - Plain English)

#### 힘 기반 방향 그래프 / 힘 시뮬레이션 (Force-Directed Graph / Force Simulation)

**기술적**: 물리적 힘을 시뮬레이션하여 그래프 노드를 배치하는 알고리즘. 노드는 쿨롱의 법칙(F = k/r^2)을 통해 서로 밀어내고, 엣지는 훅의 법칙(F = -kx)을 따르는 스프링 역할을 합니다. 시스템은 힘이 균형을 이룰 때까지(평형) 반복합니다.

**평이한 언어**: 각 단어가 다른 자석을 밀어내는 작은 자석이지만, 일부 단어는 서로 끌어당기는 고무줄로 연결되어 있다고 상상하세요. 모든 자석을 놓으면, 밀고 당기는 힘이 균형을 이루는 구성으로 튀어오르다가 결국 안정됩니다. 강한 고무줄(높은 PMI)로 연결된 단어는 가까이 끝납니다. 연결이 없는 단어는 가장자리로 표류합니다.

**왜 사용하는가**: 수동 배치 없이 자연스럽고 읽기 쉬운 레이아웃을 생성합니다. 관련 단어가 자동으로 클러스터링됩니다. 레이아웃이 관계 강도를 시각적으로 *인코딩*합니다.

#### 캔버스 기반 렌더링 (Canvas-Based Rendering)

**기술적**: 각 시각적 요소에 대해 DOM 요소(SVG, div)를 생성하는 대신 즉시 모드 렌더링을 사용하여 HTML5 Canvas 2D 컨텍스트에 직접 그리기.

**평이한 언어**: 수백 개의 HTML 요소(단어당 하나, 선당 하나)를 만드는 대신, 실제 캔버스에 그림을 그리는 화가처럼 단일 "디지털 캔버스"에 직접 페인트합니다. 브라우저가 수백 개의 별도 요소를 관리할 필요가 없기 때문에 그릴 것이 많을 때 훨씬 빠릅니다.

**왜 사용하는가**: 어휘 네트워크는 수백 개의 노드를 가질 수 있습니다. Canvas는 이를 부드럽게 처리합니다. DOM 기반 렌더링(SVG)은 ~100개 노드를 넘으면 눈에 띄게 지연됩니다.

#### 히트 테스팅 (Hit Testing)

**기술적**: 기하학적 포함(일반적으로 노드의 경우 점-원 안에 있는지)을 확인하여 주어진 화면 좌표 아래에 있는 그래픽 요소(있는 경우)를 결정.

**평이한 언어**: 캔버스를 클릭하면, "단어를 클릭했나, 빈 공간을 클릭했나?"를 알아내야 합니다. 클릭에서 각 단어-원의 중심까지의 거리를 확인하여 이를 수행합니다. 거리가 원의 반지름보다 작으면, 그 단어를 클릭한 것입니다.

**왜 사용하는가**: Canvas는 DOM 요소처럼 "이 원 클릭" 이벤트가 내장되어 있지 않습니다. 사용자가 노드를 선택하고 상호 작용할 수 있도록 자체 클릭 감지를 구현합니다.

#### 알파 감쇠 (시뮬레이션 냉각) (Alpha Decay / Simulation Cooling)

**기술적**: 1.0에서 시작하여 매 프레임 지수적으로 감쇠하는(alpha *= 0.99) 계수(alpha)로, 시뮬레이션이 안정화될 때까지 모든 힘에 곱해져 점진적으로 움직임을 줄입니다.

**평이한 언어**: 물리 시뮬레이션이 "뜨거운" 상태로 시작한다고 상상하세요 - 모든 것이 에너지 넘치게 튀어다닙니다. 매 프레임, 열을 조금씩 낮춥니다. 결국, 시스템이 "냉각"되고 안정적인 배열로 정착합니다. 냉각 없이는 노드가 영원히 튀어다닐 것입니다.

**왜 사용하는가**: 부드럽고 유기적인 정착 애니메이션을 만듭니다. 그래프가 활성 상태로 시작하고, 레이아웃을 찾고, 그 다음 상호 작용을 위해 안정됩니다.

#### 고 DPI 스케일링 (devicePixelRatio) (High-DPI Scaling)

**기술적**: 디스플레이의 네이티브 해상도에서 렌더링하기 위해 window.devicePixelRatio로 캔버스 치수를 조정한 다음, 올바른 시각적 크기를 유지하기 위해 CSS를 통해 축소.

**평이한 언어**: 레티나 디스플레이는 일반 디스플레이의 2배 또는 3배 픽셀을 가집니다. 레티나 화면에서 600x400 캔버스를 그리면, 각 "가상 픽셀"이 2x2 또는 3x3 블록으로 표시되어 흐릿하게 보입니다. 1200x800으로 그리고 600x400으로 표시함으로써 모든 실제 픽셀을 사용하고 모든 것이 선명하게 보입니다.

**왜 사용하는가**: LOGOS는 데스크톱 사용자(Electron 앱)를 대상으로 하며, 많은 사용자가 고 DPI 디스플레이를 가지고 있습니다. 텍스트와 원은 선명해야 합니다.

#### PMI 가중치 스프링 (PMI-Weighted Springs)

**기술적**: 엣지 가중치(정규화된 PMI에서 파생)가 스프링 상수와 휴식 길이에 영향을 미쳐, 높은 PMI 연어는 더 강하고 짧은 스프링을 가집니다.

**평이한 언어**: "strong"과 "coffee" 사이의 고무줄은 두껍고 팽팽합니다(높은 PMI = 일반적인 연어). "strong"과 "bicycle" 사이의 고무줄은 얇고 느슨합니다(낮은 PMI = 드문 동시 발생). 시뮬레이션이 실행되면, "strong coffee"는 가까이 끝나고 "strong bicycle"는 거의 끌어당기지 않습니다.

**왜 사용하는가**: 통계적 관계(PMI 점수)를 시각적으로 직관적으로 만듭니다. 학습자는 숫자를 읽지 않고도 어떤 단어 쌍이 "밀접한지" 볼 수 있습니다.

---

### 설계 결정 및 근거 (Design Decisions & Rationale)

#### 왜 원형 초기 레이아웃인가? (Why Nodes-in-Circle Initial Layout?)

시뮬레이션을 초기화할 때, 노드는 무작위로 흩어지지 않고 원형으로 배치됩니다:

```typescript
const angle = (2 * Math.PI * i) / nodes.length;
const radius = Math.min(width, height) * 0.3;
```

**근거**:
1. **결정론적**: 같은 입력은 항상 같은 시작 구성을 생성
2. **대칭**: 어떤 방향으로도 초기 편향 없음
3. **가시적**: 모든 노드가 화면에서 시작, 캔버스 밖에 숨겨진 것 없음
4. **미적**: 원형 버스트에서 클러스터된 레이아웃으로의 전환이 시각적으로 아름다움

무작위 초기화는 때때로 노드를 화면 밖에 배치하거나 보기 흉한 초기 상태를 만듭니다.

#### 왜 반발 + 인력 + 중력인가? (Why Repulsion + Attraction + Gravity?)

힘 모델은 세 가지 힘을 결합합니다:

1. **반발(Repulsion)** (쿨롱): 노드 겹침 방지, 그래프 펼침
2. **인력(Attraction)** (스프링): 연결된 노드를 함께 끌어당김
3. **중심 중력(Center Gravity)**: 전체 그래프를 캔버스 중심에 유지

**반발 없이**: 모든 연결된 노드가 단일 점으로 붕괴.
**인력 없이**: 그래프가 무한정 바깥쪽으로 폭발.
**중력 없이**: 그래프가 시간이 지나면서 화면 밖으로 표류.

특정 상수(repulsionStrength: 5000, springStrength: 0.1, gravityStrength: 0.02)는 10-200개 노드의 어휘 네트워크에서 읽기 쉬운 레이아웃을 생성하도록 경험적으로 조정되었습니다.

#### 왜 물리 재개와 함께 상호작용 드래깅인가? (Why Interactive Dragging with Physics Resume?)

사용자가 노드를 드래그할 때, 물리 시뮬레이션이 증가된 알파로 재개됩니다:

```typescript
alphaRef.current = Math.max(alphaRef.current, 0.3);
```

**근거**: 노드를 드래그하면 관련 노드가 따라와야 합니다. 시뮬레이션을 "재가열"함으로써, 연결된 노드가 드래그에 자연스럽게 반응합니다. 대안(드래그 중 물리 동결)은 드래그가 네트워크와 연결이 끊어진 것처럼 느끼게 합니다.

#### 왜 노드 크기가 숙달을 인코딩하는가? (Why Node Size Encodes Mastery?)

```typescript
const masteryBonus = node.masteryStage * 2;
return base + masteryBonus; // 12 + (0-8) = 12-20px
```

**근거**: 숙달된 단어는 시각적 두드러짐을 받을 자격이 있습니다. 그들은 학습자 어휘 네트워크의 앵커입니다. 새 단어(단계 0)는 아직 확고하게 확립되지 않았기 때문에 작습니다. 이것은 학습자의 가장 강한 지식이 문자 그대로 두드러지는 자연스러운 시각적 계층 구조를 만듭니다.

#### 왜 SVG 대신 Canvas인가? (Why Canvas Over SVG?)

이 컴포넌트는 SVG 요소 대신 Canvas 2D 컨텍스트를 사용합니다. 트레이드오프:

**Canvas 장점**:
- 높은 노드 수(100+)에서 더 나은 성능
- 더 간단한 애니메이션 모델(매 프레임 모든 것을 다시 그리기만 하면 됨)
- 시뮬레이션 중 DOM 변형 오버헤드 없음

**Canvas 단점**:
- 히트 테스팅을 수동으로 구현해야 함
- 내장 접근성 없음(노드의 aria 레이블)
- CSS로 스타일링하기 어려움

수백 개의 단어를 포함할 수 있는 어휘 네트워크의 경우, Canvas 성능이 이깁니다.

#### 왜 헬퍼 유틸리티(collocationsToGraph, morphologyToGraph)를 포함하는가?

모듈은 LOGOS 데이터 구조를 그래프 형식으로 변환하는 유틸리티 함수를 익스포트합니다:

```typescript
export function collocationsToGraph(
  centerWord: string,
  collocations: Array<{ word: string; pmi: number; npmi: number }>,
  masteryMap?: Map<string, number>
): { nodes: GraphNode[]; edges: GraphEdge[] }
```

**근거**:
1. **편의성**: 일반적인 사용 사례(연어 표시, 형태론 표시)에 사전 제작된 변환기가 있음
2. **일관성**: 엣지 가중치가 균일하게 계산됨(NPMI 정규화)
3. **분리**: 그래프 렌더링 로직이 데이터 변환 로직과 분리되어 유지

---

### 상호작용 모델 (Interaction Model)

#### 마우스 상호작용

| 액션 | 결과 |
|------|------|
| 노드 위로 호버 | 커서가 포인터로 변경; 노드와 연결된 엣지 강조 |
| 노드 클릭 | `onNodeClick(nodeId)` 발생 - 일반적으로 단어 선택 |
| 노드 더블 클릭 | `onNodeDoubleClick(nodeId)` 발생 - 일반적으로 단어 상세 열기 |
| 노드 드래그 | 노드를 커서에 고정; 물리 재개; 관련 노드 따라옴 |
| 드래그 해제 | 노드 고정 해제; 물리가 새 평형으로 정착 |
| 빈 공간에서 이동 | 커서가 잡기 아이콘 표시(향후 팬 초대) |

#### 시각적 피드백

| 상태 | 시각적 처리 |
|------|-------------|
| 기본 노드 | 채워진 원, 구성 요소/숙달 색상, 아래 흰색 레이블 |
| 호버된 노드 | 방사형 글로우 효과; 더 큰 반지름; 더 굵은 레이블 |
| 선택된 노드 | 밝은 흰색 테두리(3px); 방사형 글로우; 더 굵은 레이블 |
| 연결된 엣지(선택/호버에) | 증가된 불투명도; 더 두꺼운 획 |
| 기본 엣지 | 반투명; 가중치에 비례하는 너비 |

---

### 빈 상태 처리 (Empty State Handling)

`nodes.length === 0`일 때, 컴포넌트는 빈 캔버스 대신 친근한 빈 상태를 렌더링합니다:

```jsx
<GlassCard className="network-graph-empty">
  <span>web emoji</span>
  <p>No lexical relationships to display.</p>
  <p>Start learning words to build your vocabulary network.</p>
</GlassCard>
```

**근거**: 빈 그래프는 혼란스럽습니다. 빈 상태는 *왜* 표시할 것이 없는지 설명하고 사용자가 그래프를 채울 액션(단어 학습)을 하도록 격려합니다.

---

### 이론적 기반과의 연결 (Connection to Theoretical Foundations)

#### PMI 시각화 (PMI Visualization)

NetworkGraph는 `src/core/pmi.ts`에서 계산된 PMI 관계를 직접 시각화합니다:

- 엣지 가중치 = 정규화된 NPMI 점수(0-1 범위)
- 엣지 색상 = 연어는 파란색
- 엣지 두께 = 가중치에 선형 비례
- 공간적 거리 = PMI에 반비례(높은 PMI = 더 가까운 노드)

사용자가 두꺼운 선으로 연결된 두 단어가 가까이 있는 것을 보면, 그들은 말 그대로 코퍼스 동시 발생의 통계적 속성인 높은 점별 상호 정보(pointwise mutual information)를 보고 있는 것입니다.

#### 형태론적 네트워크 (Morphological Networks)

보라색 엣지는 형태론적 가족 관계를 나타냅니다:

- 어근 "run"은 "runner," "running," "ran"에 연결
- 이러한 엣지는 고정된 가중치(0.7)를 가집니다. 형태론적 관계는 범주적이기 때문
- 색상이 통계적(PMI) 관계와 구별

#### 숙달 단계 통합 (Mastery Stage Integration)

노드 크기와 색상은 FSRS에서 파생된 숙달 단계를 직접 반영합니다:

- 단계는 리뷰 이력을 기반으로 `src/core/fsrs.ts`에서 계산
- `ComponentObjectState.masteryState.stage`에 저장
- 그래프에 `GraphNode.masteryStage`로 전달

시각적 표현은 추상적인 간격 반복 통계를 유형적으로 만듭니다.

---

### 성능 고려 사항 (Performance Considerations)

#### 애니메이션 프레임 예산 (Animation Frame Budget)

60fps에서 각 프레임은 ~16ms를 가집니다. 시뮬레이션 루프는 이 예산 내에서 완료되어야 합니다:

```
simulationStep(): ~1-2ms for 100 nodes (O(n^2) repulsion)
renderGraph(): ~2-5ms for 100 nodes + edges
React reconciliation: ~1ms (minimal, only state update)
```

총: ~4-8ms, ~200개 노드까지의 그래프에서 예산 안에 안전하게.

#### O(n^2) 반발 경고 (O(n^2) Repulsion Warning)

순진한 반발 계산은 모든 노드 쌍을 확인합니다:

```typescript
for (let i = 0; i < nodes.length; i++) {
  for (let j = i + 1; j < nodes.length; j++) {
    // compute repulsion
  }
}
```

이것은 O(n^2)로, 어휘 네트워크(<500개 노드)에는 허용되지만 더 큰 그래프에서는 지연됩니다. LOGOS가 1000개 이상의 노드 그래프가 필요하면, Barnes-Hut 근사(O(n log n))가 필요합니다.

#### 캔버스 레이어 캐싱 (Canvas Layer Caching)

현재, 전체 그래프가 시뮬레이션 중 매 프레임 다시 그려집니다. 향후 최적화 가능:
1. 엣지를 오프스크린 캔버스에 그리기(덜 움직임)
2. 노드와 즉각적인 엣지만 다시 그리기
3. 최종 표시를 위해 레이어 합성

이것은 엣지 수가 병목이 되면 도움이 될 것입니다.

---

### 변경 이력 (Change History)

#### 2026-01-04 - 초기 구현 (Initial Implementation)
- **변경 사항**: 순수 TypeScript 힘 시뮬레이션, Canvas 렌더링, 히트 테스팅, 상호작용 기능(호버, 클릭, 드래그)이 있는 NetworkGraph 컴포넌트 생성
- **이유**: LOGOS는 학습자가 지식의 구조를 이해하는 데 도움이 되도록 어휘 관계(PMI 연어, 형태론적 가족)를 시각화하는 방법이 필요했음
- **영향**: 어휘 학습의 "네트워크 뷰" 활성화; 추상적인 통계적 관계(PMI)를 시각적으로 직관적으로 만듦; 향후 그래프 기반 기능(학습 경로, 의미 도메인 탐험)의 기반 제공

#### 2026-01-04 - 헬퍼 컴포넌트 및 유틸리티 추가 (Added Helper Components and Utilities)
- **변경 사항**: NetworkGraphCard 래퍼와 변환 유틸리티(collocationsToGraph, morphologyToGraph) 추가
- **이유**: 일반적인 사용 사례에 사전 제작된 솔루션이 필요; 카드 래퍼가 새로고침 기능과 함께 일관된 스타일링 제공
- **영향**: LOGOS 데이터 구조와의 통합 단순화; 일관된 엣지 가중치 계산 보장

---

### 향후 개선 사항 (Future Enhancements)

#### 계획됨 (Planned)
- **팬/줌(Pan/Zoom)**: 마우스 드래그(팬)와 휠(줌)로 대형 그래프 탐색
- **호버 시에만 노드 레이블(Node Labels on Hover Only)**: 호버할 때까지 레이블 숨겨 혼란 감소
- **엣지 레이블(Edge Labels)**: 엣지에 PMI 점수 또는 관계 유형 표시
- **클러스터 강조(Cluster Highlighting)**: 노드를 클릭하여 전체 연결된 클러스터 강조

#### 잠재적 (Potential)
- **애니메이션 전환(Animated Transitions)**: 노드/엣지가 변경될 때 부드러운 모핑
- **미니맵(Mini-map)**: 뷰포트 표시기가 있는 대형 그래프 개요
- **내보내기(Export)**: 그래프를 이미지(PNG) 또는 데이터(JSON)로 저장
- **접근성(Accessibility)**: 키보드 탐색, 그래프 구조에 대한 스크린 리더 지원

---

*이 문서는 다음을 미러링합니다: `src/renderer/components/analytics/NetworkGraph.tsx`*
*Shadow Map 방법론: 코드 설명이 아닌 의도의 서술적 설명*

