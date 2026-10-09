# CommunityRoomMembershipResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**joined** | **boolean** |  | [optional] [default to undefined]
**joinedRoomId** | **number** |  | [optional] [default to undefined]
**leftRoomId** | **number** |  | [optional] [default to undefined]
**memberCount** | **number** |  | [optional] [default to undefined]
**activeRoomCount** | **number** |  | [optional] [default to undefined]
**membershipRevision** | **number** |  | [optional] [default to undefined]
**activeRooms** | [**Array&lt;ActiveRoom&gt;**](ActiveRoom.md) |  | [optional] [default to undefined]

## Example

```typescript
import { CommunityRoomMembershipResponse } from './api';

const instance: CommunityRoomMembershipResponse = {
    joined,
    joinedRoomId,
    leftRoomId,
    memberCount,
    activeRoomCount,
    membershipRevision,
    activeRooms,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
