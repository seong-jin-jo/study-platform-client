# Figma Cache Protocol

Eliminates redundant MCP calls across sessions by caching `get_design_context`, `get_variable_defs`, and `get_metadata` results. Referenced by `figma-fetch.md` Step F0, used by `dev-start`, `design-to-dev`, and `extract-common-component` skills.

---

## Cache File Locations

| Work type    | Cache file path                                     |
| ------------ | --------------------------------------------------- |
| Page / route | `docs/Figma/{route-slug}.cache.json`                |
| Component    | `docs/Figma/components/{component-slug}.cache.json` |

`{slug}` matches the slug used in the companion `docs/Figma/{slug}.md` spec doc. Cache files are **git-committed** (team-shared).

---

## Cache Schema (schemaVersion: 2)

```json
{
    "schemaVersion": 2,
    "figmaUrl": "https://www.figma.com/design/...",
    "fileKey": "abc123",
    "nodeId": "1234:5678",
    "nodeName": "Premium Study Page",
    "type": "page | component",
    "cachedAt": "2026-06-21",
    "screenshotLocalPath": "/public/{slug}/figma-ref.png",
    "root": {
        "designContext": {},
        "designContextTruncated": false,
        "variableDefs": {},
        "metadata": {}
    },
    "frames": [
        {
            "nodeId": "1234:5679",
            "nodeName": "Hero Section",
            "type": "FRAME | COMPONENT | INSTANCE | GROUP",
            "designContext": {},
            "variableDefs": {},
            "screenshotLocalPath": "/public/{slug}/hero.png",
            "truncated": false,
            "variants": {
                "Default": { "nodeId": "1234:5681", "designContext": {} },
                "Hover": { "nodeId": "1234:5682", "designContext": {} }
            },
            "children": [
                {
                    "nodeId": "1234:5680",
                    "nodeName": "CTA Button",
                    "type": "INSTANCE",
                    "designContext": {},
                    "variableDefs": {},
                    "screenshotLocalPath": null,
                    "truncated": false,
                    "variants": {},
                    "children": []
                }
            ]
        }
    ]
}
```

### `frames` 필드 규칙

- `frames`는 루트 노드의 **직접 자식 프레임 전체**를 배열로 나열. `get_metadata` children 순서 그대로.
- 각 항목 = F3에서 드릴한 `get_design_context` 결과.
- `variants`: Component with Variants이면 각 cell의 `designContext`를 키-값으로 기록. 없으면 `{}`.
- `children`: depth 2 이상 드릴된 nested INSTANCE/FRAME만 포함. 정적 노드 제외.
- `screenshotLocalPath`: 스크린샷 없으면 `null`.
- `variableDefs`: 바인딩 토큰 있을 때만 포함, 없으면 `{}`.

> **v1 → v2 마이그레이션**: `subSections` flat dict 폐기 → `frames` 트리로 대체.
> F0b에서 `schemaVersion !== 2`이면 cache miss → F1 재실행으로 자동 재빌드.
> }

```

**Asset URL handling before save:** Replace every Figma session-scoped URL (`https://www.figma.com/api/mcp/asset/*`) in `designContext` with the corresponding local `/public/{slug}/{filename}` path (already downloaded in Step F2). Never write raw Figma MCP URLs into the cache — they expire per session.

---

## Step F0: Cache Check (run before F1)

### F0a. Derive cache path

From the Figma URL, extract `fileKey` and `nodeId`:

```

https://www.figma.com/design/{fileKey}/...?node-id={nodeId}

```

Cache path: `docs/Figma/{slug}.cache.json` (page) or `docs/Figma/components/{slug}.cache.json` (component).

### F0b. Read and validate

Attempt `Read docs/Figma/{slug}.cache.json`:

| Check                                  | Pass     | Fail action                         |
| -------------------------------------- | -------- | ----------------------------------- |
| File exists                            | continue | cache miss → proceed to F1          |
| `schemaVersion === 2` | continue | treat as miss → F1 (rebuilds to v2) |
| `fileKey` + `nodeId` match current URL | continue | treat as miss → F1                  |
| `cachedAt` within 7 days               | continue | emit stale warning, continue anyway |

**Stale warning (age > 7 days):**

```

⚠ Figma cache is N days old (cachedAt: {date}). Using cached data.
Pass --refresh or say "피그마 다시 읽어줘" to force re-fetch.

````

### F0c. Cache hit — load and skip F1/F2

Load from cache:

| Cache field          | Maps to                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `root.designContext` | F1 `get_design_context` result                                                         |
| `root.variableDefs`  | F1 `get_variable_defs` result                                                          |
| `root.metadata`      | F1 `get_metadata` result                                                               |
| `frames[*]` | F3 sub-section drill results — skip all individual `get_design_context` calls  |
| `frames[*].variants.*` | F3b variant matrix results |
| `frames[*].children[*]` | F3f nested instance drill results |

**Screenshot check:**

- Attempt `Read {screenshotLocalPath}` (or `ls public/{slug}/figma-ref.png`)
- Exists → use as visual reference, skip `get_screenshot`
- Missing → call `get_screenshot` + download to `screenshotLocalPath`, update the cache JSON field

Proceed directly to F3 using cached metadata.

---

## Cache Write (after F1–F3)

After completing Steps F1–F3 in `figma-fetch.md`:

1. **Build the `frames` tree** from F3 results:
   - Iterate `root.metadata` children in order.
   - For each child, find the matching `get_design_context` result drilled in F3.
   - If F3b drilled variant cells → `frames[i].variants`.
   - If F3f drilled nested instances → `frames[i].children` (recursive).
   - Set `screenshotLocalPath` for frames that had `get_screenshot` called.
2. Replace all Figma asset URLs in `root.designContext` and every
   `frames[*].designContext` / `children[*].designContext`...designContext` with `/public/{slug}/{filename}` local paths.
3. Build and write `docs/Figma/{slug}.cache.json` per the schema above.
4. Stage for commit alongside `docs/Figma/{slug}.md`:
    ```bash
    git add docs/Figma/{slug}.cache.json docs/Figma/{slug}.md
    ```

---

## Cache Invalidation

| Trigger                                         | Action                          |
| ----------------------------------------------- | ------------------------------- |
| User says `--refresh`                           | Delete cache → treat as F0 miss |
| User says "피그마 다시 읽어줘" or "캐시 무효화" | Same                            |
| `fileKey` or `nodeId` mismatch                  | Auto-detected in F0b            |
| `schemaVersion` mismatch                        | Auto-detected in F0b            |

Manual invalidation:

```bash
rm docs/Figma/{slug}.cache.json
````

---

## What is NOT cached

| Data                                 | Reason                                               |
| ------------------------------------ | ---------------------------------------------------- |
| Raw Figma MCP asset URLs             | Session-scoped, expire per session                   |
| `get_screenshot` URL                 | Session-scoped — download the file, store local path |
| Live swagger DTO schema              | Always re-fetch; backend may change between sessions |
| Variant sub-sections not yet drilled | Only added to cache after F3 runs them               |
