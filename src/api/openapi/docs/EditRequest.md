# EditRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**question** | **string** |  | [default to undefined]
**conceptSummary** | **string** |  | [default to undefined]
**modelAnswerMd** | **string** |  | [default to undefined]
**sourceRef** | **string** |  | [optional] [default to undefined]
**scheduledPublishAt** | **string** |  | [optional] [default to undefined]
**correctionReason** | **string** |  | [optional] [default to undefined]
**renders** | [**Array&lt;RenderInput&gt;**](RenderInput.md) |  | [default to undefined]

## Example

```typescript
import { EditRequest } from './api';

const instance: EditRequest = {
    question,
    conceptSummary,
    modelAnswerMd,
    sourceRef,
    scheduledPublishAt,
    correctionReason,
    renders,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
