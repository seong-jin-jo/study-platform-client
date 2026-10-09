# IntakeRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**categorySlug** | **string** |  | [default to undefined]
**question** | **string** |  | [default to undefined]
**conceptSummary** | **string** |  | [default to undefined]
**modelAnswerMd** | **string** |  | [default to undefined]
**sourceRef** | **string** |  | [optional] [default to undefined]
**scheduledPublishAt** | **string** |  | [optional] [default to undefined]
**renders** | [**Array&lt;RenderInput&gt;**](RenderInput.md) |  | [default to undefined]
**reviewVerdicts** | [**Array&lt;VerdictInput&gt;**](VerdictInput.md) |  | [default to undefined]

## Example

```typescript
import { IntakeRequest } from './api';

const instance: IntakeRequest = {
    categorySlug,
    question,
    conceptSummary,
    modelAnswerMd,
    sourceRef,
    scheduledPublishAt,
    renders,
    reviewVerdicts,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
