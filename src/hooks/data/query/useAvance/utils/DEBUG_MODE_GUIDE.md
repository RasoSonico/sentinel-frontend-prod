# Debug Mode Guide

## 🎯 Overview

The Realm logging system has two modes:

1. **Production Mode** (default) - Minimal, essential logs only
2. **Debug Mode** - Comprehensive, detailed logs with full data

---

## 🔧 Enabling Debug Mode

### Method 1: Environment Variable (Recommended)

Add to your `.env` file:

```env
EXPO_PUBLIC_REALM_DEBUG=true
```

Then restart your dev server:

```bash
bunx expo start -c
bunx expo run:ios
```

### Method 2: Programmatically (Runtime)

In your app code (useful for dev tools):

```typescript
import { setRealmDebugMode } from 'src/hooks/data/query/useAvance/utils';

// Enable debug mode
setRealmDebugMode(true);

// Disable debug mode
setRealmDebugMode(false);

// Check current status
import { getRealmDebugMode } from 'src/hooks/data/query/useAvance/utils';
console.log('Debug mode:', getRealmDebugMode());
```

### Method 3: Dev Menu Toggle

Create a dev menu option:

```typescript
// DevMenu.tsx
import { setRealmDebugMode, getRealmDebugMode } from 'src/hooks/data/query/useAvance/utils';

function DevMenu() {
  const [debugEnabled, setDebugEnabled] = useState(getRealmDebugMode());
  
  const toggleDebug = () => {
    const newValue = !debugEnabled;
    setRealmDebugMode(newValue);
    setDebugEnabled(newValue);
  };
  
  return (
    <Switch
      value={debugEnabled}
      onValueChange={toggleDebug}
      label="Realm Debug Logs"
    />
  );
}
```

---

## 📊 Production Mode (Default)

### What You See

```
📡 Fetching Assigned Construction from API...
📊 API Response for Assigned Construction received
📝 Storing Assigned Construction in Realm...
📦 Prepared Assigned Construction data for Realm
✅ Successfully stored Assigned Construction in Realm
🔍 Verification - Assigned Construction: Found ✓
🎣 useAssignedConstruction: 💾 Cached
```

### Characteristics
- ✅ Shows operation flow
- ✅ Shows success/failure
- ✅ Shows data counts (arrays)
- ❌ Hides full JSON data
- ❌ Hides detailed state
- 🎯 **Minimal overhead**

---

## 🐛 Debug Mode

### What You See

```
📡 Fetching Assigned Construction from API...
📊 API Response for Assigned Construction: {
  "id": "123",
  "name": "Project Alpha",
  "description": "Main project",
  "location": "Mexico City",
  ...
}
📝 Storing Assigned Construction in Realm...
📦 Prepared Assigned Construction data for Realm: {
  "id": "123",
  "name": "Project Alpha",
  "budget": "1000000",
  "status": "IN_PROGRESS",
  ...
}
✅ Successfully stored Assigned Construction in Realm
🔍 Verification - Assigned Construction exists in Realm: true
🔍 Verification - Assigned Construction data: {...}
🎣 useAssignedConstruction
  🌐 Network status: ONLINE
  💾 Realm instance: Available
  📦 Cached object from Realm: Found
  📦 Cached data: {...}
  📊 React Query state: { isLoading: false, isSuccess: true }
```

### Characteristics
- ✅ Shows full JSON data
- ✅ Shows detailed state
- ✅ Shows React Query state
- ✅ Shows verification data
- ⚠️ **Higher log volume**

---

## 🎨 Log Output Comparison

### Production Mode
```typescript
// Concise, one-line logs
🎣 useAssignedConstruction: 💾 Cached
📊 API Response for Catalogs received
📏 Catalogs count: 5
🔍 Verification - Construction: Found ✓
```

### Debug Mode
```typescript
// Detailed, multi-line logs with data
🎣 useAssignedConstruction
  🌐 Network status: ONLINE
  💾 Realm instance: Available
  📦 Cached object from Realm: Found
  📦 Cached data: { id: "123", name: "Project Alpha" }
  
📊 API Response for Catalogs: [
  { id: 1, name: "Catalog A" },
  { id: 2, name: "Catalog B" },
  ...
]

🔍 Verification - Construction exists in Realm: true
🔍 Verification - Construction data: { id: "123", ... }
```

---

## ❗ Error Logging (Always Detailed)

**Important:** Errors always show full details, regardless of mode!

```typescript
// Even in production mode, errors show everything
❌ Error storing Construction in Realm: TypeError: ...
Error message: Cannot read property 'id' of undefined
Error stack: at parseConstruction ...
Data attempted to store: {
  "id": null,  // ← Problem identified!
  "name": "Project"
}
```

This ensures you can always debug issues even in production.

---

## 🎯 When to Use Each Mode

### Use Production Mode When:
- ✅ Running the app normally
- ✅ Testing features
- ✅ In production/staging environments
- ✅ You don't need to see data details
- ✅ You want clean, readable logs

### Use Debug Mode When:
- 🐛 Debugging Realm issues
- 🐛 Investigating data flow
- 🐛 Checking API responses
- 🐛 Verifying data transformations
- 🐛 Troubleshooting cache behavior

---

## 💡 Pro Tips

### 1. Quick Toggle Script

Add to your `package.json`:

```json
{
  "scripts": {
    "debug:realm:on": "echo 'EXPO_PUBLIC_REALM_DEBUG=true' >> .env.local",
    "debug:realm:off": "echo 'EXPO_PUBLIC_REALM_DEBUG=false' >> .env.local"
  }
}
```

### 2. Dev Tools Integration

```typescript
// In your dev tools component
if (__DEV__) {
  // Add to global for easy console access
  global.realmDebug = {
    enable: () => setRealmDebugMode(true),
    disable: () => setRealmDebugMode(false),
    status: () => getRealmDebugMode(),
  };
}

// Then in console:
// > realmDebug.enable()
// > realmDebug.status()
```

### 3. Conditional Debug in Tests

```typescript
// In your test setup
beforeAll(() => {
  setRealmDebugMode(true); // Enable for all tests
});

afterAll(() => {
  setRealmDebugMode(false); // Disable after tests
});
```

---

## 📋 Environment Variable Options

```env
# Enable debug mode
EXPO_PUBLIC_REALM_DEBUG=true

# Disable debug mode (default)
EXPO_PUBLIC_REALM_DEBUG=false

# Not set = production mode (default)
# EXPO_PUBLIC_REALM_DEBUG=
```

---

## 🔍 Debugging Workflow

### Step 1: Start in Production Mode
Run your app normally with minimal logs.

### Step 2: Issue Detected?
If you see an error or unexpected behavior:

```
❌ Error storing Construction in Realm: ...
```

### Step 3: Enable Debug Mode

```bash
# Add to .env
echo 'EXPO_PUBLIC_REALM_DEBUG=true' >> .env

# Restart
bunx expo start -c
```

### Step 4: Reproduce Issue
Trigger the same action and see full data flow:

```
📊 API Response: { ... }  ← See what API sent
📦 Prepared data: { ... }  ← See what we tried to store
❌ Error: ...              ← See where it failed
```

### Step 5: Fix & Verify
After fixing, verify in debug mode, then disable:

```bash
# Disable debug mode
EXPO_PUBLIC_REALM_DEBUG=false
```

---

## ⚡ Performance Impact

### Production Mode
- **Overhead**: Minimal (~5-10ms per operation)
- **Log Volume**: ~5-8 lines per operation
- **Data Serialization**: Only for errors

### Debug Mode
- **Overhead**: Moderate (~20-50ms per operation)
- **Log Volume**: ~20-30 lines per operation
- **Data Serialization**: Full JSON stringify for all data

**Recommendation:** Use production mode by default, enable debug mode only when needed.

---

## 📝 Summary

| Feature | Production Mode | Debug Mode |
|---------|----------------|------------|
| Operation flow | ✅ | ✅ |
| Success/failure | ✅ | ✅ |
| Array counts | ✅ | ✅ |
| Full JSON data | ❌ | ✅ |
| Hook state | Summary | Detailed |
| React Query state | ❌ | ✅ |
| Verification data | Status only | Full data |
| Error details | ✅ Always | ✅ Always |
| Performance | Fast | Slower |
| Log volume | Low | High |

---

## 🚀 Quick Start

**For normal development:**
```bash
# Just run your app - production mode is default
bunx expo start
```

**For debugging Realm issues:**
```bash
# Enable debug mode
echo 'EXPO_PUBLIC_REALM_DEBUG=true' >> .env

# Restart with clean cache
bunx expo start -c
```

**For runtime toggling:**
```typescript
// In your code or console
import { setRealmDebugMode } from 'src/hooks/data/query/useAvance/utils';
setRealmDebugMode(true);
```

---

That's it! Clean logs by default, detailed logs when you need them. 🎉
