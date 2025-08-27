# Final Build Fixes for Hetzner Server

## 🚨 Apply These Fixes in Your Hetzner Console

Run these commands in your Hetzner web console to fix all remaining build errors:

### 1. Navigate to your project directory
```bash
cd /opt/cinetune/current
```

### 2. Fix Next.js Config Warning
```bash
sed -i 's/experimental: {/serverExternalPackages: ['\''@remotion\/renderer'\'', '\''@remotion\/cli'\''],/g' next.config.ts
sed -i '/serverComponentsExternalPackages: \[.*\]/d' next.config.ts
```

### 3. Fix Timeline Import Error
```bash
sed -i 's|from "@designcombo/timeline"|from "../utils/timeline"|g' src/features/editor/timeline/header.tsx
```

### 4. Fix TypeScript Event Listener Error
```bash
sed -i 's/player.addEventListener(eventName,/player.addEventListener(eventName as any,/g' src/features/editor/hooks/use-update-ansestors.tsx
```

### 5. Alternative Manual Fix (if sed commands don't work)

**Fix 1: Update next.config.ts**
```bash
nano next.config.ts
```
Replace:
```typescript
experimental: {
    serverComponentsExternalPackages: ['@remotion/renderer', '@remotion/cli']
},
```
With:
```typescript
serverExternalPackages: ['@remotion/renderer', '@remotion/cli'],
```

**Fix 2: Update timeline header import**
```bash
nano src/features/editor/timeline/header.tsx
```
Change line 12 from:
```typescript
import { TIMELINE_SCALE_CHANGED } from "@designcombo/timeline";
```
To:
```typescript
import { TIMELINE_SCALE_CHANGED } from "../utils/timeline";
```

**Fix 3: Fix event listener type error**
```bash
nano src/features/editor/hooks/use-update-ansestors.tsx
```
Change line 125 from:
```typescript
player.addEventListener(eventName, updateAnsestorsPointerEvents);
```
To:
```typescript
player.addEventListener(eventName as any, updateAnsestorsPointerEvents);
```

### 6. Try Building Again
```bash
npm run build
```

## 🎯 What These Fixes Do:

1. **Next.js Config**: Updates deprecated `experimental.serverComponentsExternalPackages` to `serverExternalPackages`
2. **Timeline Import**: Changes import from external package to local utils where we added the constant
3. **TypeScript Fix**: Adds type assertion to resolve event listener parameter type mismatch

## ✅ Expected Result:
After these fixes, you should see:
```
✓ Compiled successfully
```

## 🚀 If Build Succeeds, Continue With Deployment:

```bash
# Set up permissions
chown -R www-data:www-data /opt/cinetune
chmod -R 755 /opt/cinetune

# Start with PM2
su - www-data -c "cd /opt/cinetune/current && pm2 start ecosystem.config.js --env production"

# Save PM2 config
su - www-data -c "pm2 save"

# Check status
su - www-data -c "pm2 status"
```

These fixes should resolve all the build errors you encountered!