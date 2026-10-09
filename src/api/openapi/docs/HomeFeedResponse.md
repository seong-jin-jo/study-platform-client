# HomeFeedResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**userName** | **string** |  | [optional] [default to undefined]
**streak** | [**Streak**](Streak.md) |  | [optional] [default to undefined]
**continueReading** | [**ContinueReading**](ContinueReading.md) |  | [optional] [default to undefined]
**myRooms** | [**Array&lt;MyRoom&gt;**](MyRoom.md) |  | [optional] [default to undefined]
**communityToday** | [**CommunityToday**](CommunityToday.md) |  | [optional] [default to undefined]
**newMembersWeek** | [**NewMembersWeek**](NewMembersWeek.md) |  | [optional] [default to undefined]
**discoveryFeed** | [**HomeDiscoveryFeedResponse**](HomeDiscoveryFeedResponse.md) |  | [optional] [default to undefined]
**countsAreExample** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { HomeFeedResponse } from './api';

const instance: HomeFeedResponse = {
    userName,
    streak,
    continueReading,
    myRooms,
    communityToday,
    newMembersWeek,
    discoveryFeed,
    countsAreExample,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
