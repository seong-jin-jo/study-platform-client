# PublicProfileResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**publicProfileUuid** | **string** |  | [optional] [default to undefined]
**nickname** | **string** |  | [optional] [default to undefined]
**profileImageUrl** | **string** |  | [optional] [default to undefined]
**simpleIntroduction** | **string** |  | [optional] [default to undefined]
**buildGoal** | **string** |  | [optional] [default to undefined]
**weeksTogether** | **number** |  | [optional] [default to undefined]
**weeksTogetherLabel** | **string** |  | [optional] [default to undefined]
**rooms** | [**CursorPageRoomItem**](CursorPageRoomItem.md) |  | [optional] [default to undefined]
**posts** | [**CursorPagePostItem**](CursorPagePostItem.md) |  | [optional] [default to undefined]
**canonicalPath** | **string** |  | [optional] [default to undefined]
**indexEligibility** | [**IndexEligibility**](IndexEligibility.md) |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { PublicProfileResponse } from './api';

const instance: PublicProfileResponse = {
    publicProfileUuid,
    nickname,
    profileImageUrl,
    simpleIntroduction,
    buildGoal,
    weeksTogether,
    weeksTogetherLabel,
    rooms,
    posts,
    canonicalPath,
    indexEligibility,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
