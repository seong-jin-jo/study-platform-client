# KoanDetailResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**koanId** | **number** |  | [optional] [default to undefined]
**categorySlug** | **string** |  | [optional] [default to undefined]
**categoryName** | **string** |  | [optional] [default to undefined]
**question** | **string** |  | [optional] [default to undefined]
**answerCount** | **number** |  | [optional] [default to undefined]
**viewCount** | **number** |  | [optional] [default to undefined]
**publishedAt** | **string** |  | [optional] [default to undefined]
**conceptSummary** | **string** |  | [optional] [default to undefined]
**modelAnswerMd** | **string** |  | [optional] [default to undefined]
**qnaQuestionId** | **number** |  | [optional] [default to undefined]
**corrections** | [**Array&lt;KoanCorrectionResponse&gt;**](KoanCorrectionResponse.md) |  | [optional] [default to undefined]

## Example

```typescript
import { KoanDetailResponse } from './api';

const instance: KoanDetailResponse = {
    koanId,
    categorySlug,
    categoryName,
    question,
    answerCount,
    viewCount,
    publishedAt,
    conceptSummary,
    modelAnswerMd,
    qnaQuestionId,
    corrections,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
