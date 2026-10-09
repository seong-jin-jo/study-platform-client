# InsightSyncResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**runId** | **number** |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]
**sourceTotal** | **number** |  | [optional] [default to undefined]
**pagesProcessed** | **number** |  | [optional] [default to undefined]
**projection** | [**ProjectionCounts**](ProjectionCounts.md) |  | [optional] [default to undefined]
**island** | [**IslandCounts**](IslandCounts.md) |  | [optional] [default to undefined]
**islandArticle** | [**IslandArticleCounts**](IslandArticleCounts.md) |  | [optional] [default to undefined]
**byCategory** | [**Array&lt;CategoryCount&gt;**](CategoryCount.md) |  | [optional] [default to undefined]
**warnings** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**cursor** | [**Cursor**](Cursor.md) |  | [optional] [default to undefined]

## Example

```typescript
import { InsightSyncResponse } from './api';

const instance: InsightSyncResponse = {
    runId,
    status,
    sourceTotal,
    pagesProcessed,
    projection,
    island,
    islandArticle,
    byCategory,
    warnings,
    cursor,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
