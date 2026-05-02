# Parser Utilities - Quick Reference

## 🐛 Debug Mode (NEW!)

**Production Mode (Default):** Minimal logs, no data dumps
```bash
# Just run normally
bunx expo start
```

**Debug Mode:** Full logs with all data
```bash
# Via environment variable
EXPO_PUBLIC_REALM_DEBUG=true bunx expo start
```

```typescript
// Or programmatically
import { setRealmDebugMode } from "./utils";
setRealmDebugMode(true);  // Enable
setRealmDebugMode(false); // Disable
```

📖 **See [DEBUG_MODE_GUIDE.md](./DEBUG_MODE_GUIDE.md) for complete details**

---

## 📦 Import All Utilities

```typescript
import {
  // Construction
  parseConstructionForRealm,
  validateConstruction,
  DEFAULT_CONSTRUCTION,
  
  // Catalogs
  parseCatalogsForRealm,
  parseCatalogoItemForRealm,
  validateCatalog,
  
  // Partidas
  parsePartidasForRealm,
  parsePartidaItemForRealm,
  
  // Conceptos
  parseConceptosForRealm,
  parseConceptoItemForRealm,
  
  // AvanceBase
  parseAvanceBaseForRealm,
  validateAvanceBase,
  
  // Advances
  parseAdvancesForRealm,
  parseAdvanceForRealm,
  
  // Logging
  logApiFetchStart,
  logApiResponse,
  logRealmStoreStart,
  logRealmStoreSuccess,
  logRealmStoreError,
  logHookState,
  
  // Debug mode control
  setRealmDebugMode,
  getRealmDebugMode,
} from "./utils";
```

---

## 🎯 Standard Hook Pattern

```typescript
export const useEntity = () => {
  const realm = useRealm();
  const isOnline = useNetworkStatus();
  const cached = useObject(Schema, id);
  
  const q = useQuery({
    queryFn: async () => {
      // 1. Log fetch
      logApiFetchStart("Entity");
      
      // 2. Fetch from API
      const data = await getEntity();
      logApiResponse("Entity", data);
      
      // 3. Parse for Realm
      logRealmStoreStart("Entity");
      const parsed = parseEntityForRealm(data);
      
      // 4. Store
      realm.write(() => {
        realm.create("Entity", parsed, UpdateMode.Modified);
      });
      
      // 5. Log success
      logRealmStoreSuccess("Entity");
      
      return data;
    },
  });
  
  // Log hook state
  logHookState("useEntity", {
    isOnline,
    hasCached: !!cached,
  });
  
  return {
    ...q,
    data: cached ?? null,
    hasOfflineData: !!cached,
  };
};
```

---

## 📊 Console Log Emojis

- 📡 API fetch started
- 📊 API response received
- ⚠️ No data from API
- 📝 Realm storage started
- 📦 Data prepared for Realm
- ✅ Storage successful
- ❌ Storage error (always detailed)
- 🔍 Verification complete
- 🎣 Hook state
- 🌐 Network status
- 💾 Realm instance
- 📴 Offline mode
- 📏 Array length

---

## 🔧 Quick Parser Reference

| Data Type | Parser Function | Validates | Returns |
|-----------|----------------|-----------|---------|
| Construction | `parseConstructionForRealm()` | ✅ | `Partial<Construction>` |
| Catalogs | `parseCatalogsForRealm()` | ✅ | `CatalogoItem[]` |
| Partidas | `parsePartidasForRealm()` | ✅ | `PartidaItem[]` |
| Conceptos | `parseConceptosForRealm()` | ✅ | `ConceptoItem[]` |
| AvanceBase | `parseAvanceBaseForRealm()` | ✅ | `AvanceBaseResponse` |
| Advances | `parseAdvancesForRealm()` | ✅ | `PhysicalAdvanceResponse[]` |

---

## 📊 Log Output by Mode

### Production Mode (Default)
```
📡 Fetching Construction from API...
📊 API Response for Construction received
📝 Storing Construction in Realm...
📦 Prepared Construction data for Realm
✅ Successfully stored Construction in Realm
🔍 Verification - Construction: Found ✓
🎣 useConstruction: 💾 Cached
```

### Debug Mode (EXPO_PUBLIC_REALM_DEBUG=true)
```
📡 Fetching Construction from API...
📊 API Response for Construction: {
  "id": "123",
  "name": "Project Alpha",
  ...
}
📝 Storing Construction in Realm...
📦 Prepared Construction data for Realm: {
  "id": "123",
  "name": "Project Alpha",
  ...
}
✅ Successfully stored Construction in Realm
🔍 Verification - Construction exists: true
🔍 Verification - Construction data: {...}
🎣 useConstruction
  🌐 Network: ONLINE
  💾 Realm: Available
  📦 Cached: Found
  📦 Data: {...}
```

---

## ⚡ Quick Tips

1. **Always parse before storing** in Realm
2. **Use production mode by default** to avoid log overhead
3. **Enable debug mode when debugging** Realm issues
4. **Errors always show full details** regardless of mode
5. **Toggle debug mode at runtime** for quick debugging
