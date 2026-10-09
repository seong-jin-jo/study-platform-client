# CommunityRoomResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**roomId** | **number** |  | [optional] [default to undefined]
**cohortId** | **number** |  | [optional] [default to undefined]
**slug** | **string** |  | [optional] [default to undefined]
**code** | **string** |  | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**bannerUrl** | **string** |  | [optional] [default to undefined]
**axisTags** | [**Array&lt;AxisTag&gt;**](AxisTag.md) |  | [optional] [default to undefined]
**jobAxis** | [**Array&lt;AxisTag&gt;**](AxisTag.md) |  | [optional] [default to undefined]
**goalAxis** | [**Array&lt;AxisTag&gt;**](AxisTag.md) |  | [optional] [default to undefined]
**levelAxis** | [**Array&lt;AxisTag&gt;**](AxisTag.md) |  | [optional] [default to undefined]
**stats** | [**Stats**](Stats.md) |  | [optional] [default to undefined]
**memberCount** | **number** |  | [optional] [default to undefined]
**newPostsToday** | **number** |  | [optional] [default to undefined]
**liveSignal** | **boolean** |  | [optional] [default to undefined]
**membership** | [**Membership**](Membership.md) |  | [optional] [default to undefined]
**ownership** | [**Ownership**](Ownership.md) |  | [optional] [default to undefined]
**rules** | [**Array&lt;Rule&gt;**](Rule.md) |  | [optional] [default to undefined]
**revision** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { CommunityRoomResponse } from './api';

const instance: CommunityRoomResponse = {
    roomId,
    cohortId,
    slug,
    code,
    name,
    description,
    bannerUrl,
    axisTags,
    jobAxis,
    goalAxis,
    levelAxis,
    stats,
    memberCount,
    newPostsToday,
    liveSignal,
    membership,
    ownership,
    rules,
    revision,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
