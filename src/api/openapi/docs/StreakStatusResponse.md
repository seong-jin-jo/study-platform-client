# StreakStatusResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**streakCount** | **number** |  | [optional] [default to undefined]
**todayCompleted** | **boolean** |  | [optional] [default to undefined]
**week** | [**Array&lt;DayDot&gt;**](DayDot.md) |  | [optional] [default to undefined]
**freezeCount** | **number** |  | [optional] [default to undefined]
**nextMilestone** | **number** |  | [optional] [default to undefined]
**milestoneReached** | **Array&lt;number&gt;** |  | [optional] [default to undefined]
**atRisk** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { StreakStatusResponse } from './api';

const instance: StreakStatusResponse = {
    streakCount,
    todayCompleted,
    week,
    freezeCount,
    nextMilestone,
    milestoneReached,
    atRisk,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
