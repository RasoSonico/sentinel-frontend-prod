# useAvance Architecture Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│                    (React Native Components)                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ imports hooks
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    useAvance Hooks Layer                         │
│                  src/hooks/data/query/useAvance/                 │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ useAvanceBase   │  │ useCatalogs...  │  │ usePartidas... │  │
│  │ useAssigned...  │  │ useConcepts...  │  │ useAdvances... │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬───────┘  │
│           │                     │                     │           │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
    ┌───────▼─────────┬──────────▼──────────┬─────────▼────────┐
    │                 │                      │                   │
    │ useRealm()      │ useNetworkStatus()  │ useQuery()       │
    │ useObject()     │                      │                   │
    │                 │                      │                   │
┌───▼──────────┐  ┌───▼──────────┐      ┌───▼─────────────┐   │
│    Realm     │  │   Network    │      │  React Query    │   │
│   Database   │  │   Monitor    │      │   (TanStack)    │   │
└───┬──────────┘  └──────────────┘      └────────┬────────┘   │
    │                                              │             │
    │ Reactive                                     │ Fetches     │
    │ Reads                                        │             │
    │                                              │             │
┌───▼───────────────────────────────────────────┬─▼──────────┐ │
│         Realm Object Store                    │  API Layer  │ │
│  ┌─────────────────────────────────────────┐  │             │ │
│  │ AvanceBaseResponse                      │  │ GET /base   │ │
│  │ CatalogsByConstructionResponse          │  │ GET /cats   │ │
│  │ PartidasByCatalogResponse               │  │ GET /parts  │ │
│  │ ConceptsByWorkItemResponse              │  │ GET /conc   │ │
│  │ AssignedConstructionResponse            │  │ GET /const  │ │
│  │ AvancesByCatalogResponse                │  │ GET /adv    │ │
│  └─────────────────────────────────────────┘  │             │ │
└───────────────────────────────────────────────┴─────────────┘ │
```

## 🔄 Data Flow

### Online Mode (Network Available)

```
1. Component calls hook
          ↓
2. Hook reads from Realm (useObject)
          ↓
3. Returns cached data immediately to UI
          ↓
4. Hook checks network status (isOnline = true)
          ↓
5. React Query fetches from API (background)
          ↓
6. API response received
          ↓
7. Data written to Realm (realm.write)
          ↓
8. Realm notifies subscribers (reactive)
          ↓
9. UI automatically re-renders with new data
```

### Offline Mode (No Network)

```
1. Component calls hook
          ↓
2. Hook reads from Realm (useObject)
          ↓
3. Returns cached data immediately to UI
          ↓
4. Hook checks network status (isOnline = false)
          ↓
5. React Query does NOT fetch (enabled: false)
          ↓
6. UI shows cached data with offline indicator
```

## 📊 Hook Anatomy

```typescript
┌────────────────────────────────────────────────────────────┐
│                    useAvanceBase()                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  const realm = useRealm()           ← Get Realm instance   │
│  const isOnline = useNetworkStatus() ← Check connectivity  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Reactive Realm Read                                 │  │
│  │ const cached = useObject(Schema, id)                │  │
│  │ ↳ Returns data immediately from Realm              │  │
│  │ ↳ Automatically updates when Realm changes         │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Network Orchestrator                                │  │
│  │ const q = useQuery(options)                         │  │
│  │ ↳ Only runs when online                            │  │
│  │ ↳ Fetches from API                                 │  │
│  │ ↳ Writes to Realm on success                       │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  return {                                                   │
│    ...q,                    ← React Query properties       │
│    data: cached,            ← Always from Realm            │
│    hasOfflineData: !!cached,← Flag for offline indicator   │
│    isInitialLoading: !cached && q.isPending ← Smart load   │
│  }                                                          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## 🎭 Hook Variants

```
┌─────────────────────────────────────────────────────────────┐
│                    Hook Variant Types                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Main Hook (Network-Aware)                               │
│     useAvanceBase()                                         │
│     ├─ Reads from Realm                                     │
│     ├─ Fetches from API when online                         │
│     └─ Returns data + React Query state                     │
│                                                              │
│  2. FromRealm Hook (Direct Access)                          │
│     useAvanceBaseFromRealm()                                │
│     ├─ Only reads from Realm                                │
│     ├─ Never fetches from API                               │
│     └─ Returns Realm object (reactive)                      │
│                                                              │
│  3. Query Options (Shareable)                               │
│     avanceBaseOptions(realm, isOnline)                      │
│     └─ Factory for React Query options                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 Network States

```
┌──────────────────┐         ┌──────────────────┐
│   Online Mode    │         │  Offline Mode    │
├──────────────────┤         ├──────────────────┤
│                  │         │                  │
│ 1. Read Realm ✓  │         │ 1. Read Realm ✓  │
│ 2. Fetch API  ✓  │         │ 2. Fetch API  ✗  │
│ 3. Update Realm✓ │         │ 3. Update Realm✗ │
│ 4. Show Data  ✓  │         │ 4. Show Cache ✓  │
│                  │         │ 5. Show Badge ✓  │
│                  │         │                  │
│ Loading: 🔄      │         │ Loading: 💾      │
│ Spinner shown    │         │ Instant cached   │
│ if no cache      │         │ data shown       │
│                  │         │                  │
└──────────────────┘         └──────────────────┘
```

## 🗂️ Component Patterns

### Pattern 1: Single Component
```
┌─────────────────────────────────────────┐
│          MyComponent                     │
│  ┌───────────────────────────────────┐  │
│  │ const { data, hasOfflineData }   │  │
│  │   = useAvanceBase()              │  │
│  │                                  │  │
│  │ if (!data) return <Empty />      │  │
│  │                                  │  │
│  │ return (                         │  │
│  │   <>                             │  │
│  │     {hasOfflineData && <Badge/>} │  │
│  │     <Display data={data} />      │  │
│  │   </>                            │  │
│  │ )                                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Pattern 2: Parent-Child
```
┌─────────────────────────────────────────┐
│          ParentScreen                    │
│  ┌───────────────────────────────────┐  │
│  │ useAvanceBase() ← Controls fetch │  │
│  └───────────────────────────────────┘  │
│              ↓ renders                   │
│  ┌──────────────────┬─────────────────┐ │
│  │   HeaderComp     │    BodyComp     │ │
│  │ FromRealm() ✓    │  FromRealm() ✓  │ │
│  │ (reactive read)  │  (reactive read)│ │
│  └──────────────────┴─────────────────┘ │
└─────────────────────────────────────────┘
```

## 📈 State Management Flow

```
User Action → Hook Call → Realm Read → UI Update
                ↓
         Network Check
                ↓
         ┌──────┴──────┐
         │             │
      Online        Offline
         │             │
    Fetch API      Use Cache
         │             │
    Write Realm    Show Badge
         │             │
    Auto Update    Continue
         │             │
         └──────┬──────┘
                ↓
           User Sees Data
```

## 🔌 Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                  useAvance Ecosystem                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Dependencies:                                           │
│  ├─ @realm/react (useRealm, useObject)                 │
│  ├─ @tanstack/react-query (useQuery, queryOptions)     │
│  ├─ src/hooks/utils/useNetworkStatus                   │
│  ├─ src/hooks/data/api/avanceApi                       │
│  └─ src/realm/* (Schema definitions)                   │
│                                                          │
│  Integrates With:                                        │
│  ├─ RealmProvider (Schema registration)                │
│  ├─ QueryClient (React Query configuration)            │
│  ├─ API Client (HTTP requests)                         │
│  └─ Network Info (Connectivity detection)              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Key Features Visualization

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Offline    │   │  Reactive   │   │   Type      │
│   First     │   │   Updates   │   │   Safe      │
├─────────────┤   ├─────────────┤   ├─────────────┤
│ Works with  │   │ Auto UI     │   │ Full TS     │
│ no network  │   │ refresh on  │   │ support     │
│ using cache │   │ data change │   │ IntelliSense│
└─────────────┘   └─────────────┘   └─────────────┘

┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Modular    │   │  Documented │   │  Backward   │
│ Structure   │   │  Thoroughly │   │  Compatible │
├─────────────┤   ├─────────────┤   ├─────────────┤
│ One file    │   │ 4 complete  │   │ Old imports │
│ per hook    │   │ docs files  │   │ still work  │
│ Easy to find│   │ w/ examples │   │ (deprecated)│
└─────────────┘   └─────────────┘   └─────────────┘
```

---

This architecture provides a robust, offline-first, reactive data layer for your React Native application! 🎉
