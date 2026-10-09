# CreateCommunityRoomRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** |  | [default to undefined]
**description** | **string** |  | [default to undefined]
**bannerAssetKey** | **string** |  | [default to undefined]
**axisTags** | **Array&lt;string&gt;** |  | [default to undefined]
**rules** | [**Array&lt;RuleRequest&gt;**](RuleRequest.md) |  | [default to undefined]
**ownerIntroduction** | **string** |  | [default to undefined]
**firstPost** | [**FirstPostRequest**](FirstPostRequest.md) |  | [default to undefined]

## Example

```typescript
import { CreateCommunityRoomRequest } from './api';

const instance: CreateCommunityRoomRequest = {
    name,
    description,
    bannerAssetKey,
    axisTags,
    rules,
    ownerIntroduction,
    firstPost,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
