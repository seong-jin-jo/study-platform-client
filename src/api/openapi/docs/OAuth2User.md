# OAuth2User


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**attributes** | **{ [key: string]: object | undefined; }** |  | [optional] [default to undefined]
**authorities** | [**Array&lt;GrantedAuthority&gt;**](GrantedAuthority.md) |  | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { OAuth2User } from './api';

const instance: OAuth2User = {
    attributes,
    authorities,
    name,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
