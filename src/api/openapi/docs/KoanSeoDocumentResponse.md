# KoanSeoDocumentResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**resourceType** | **string** |  | [optional] [default to undefined]
**koanId** | **number** |  | [optional] [default to undefined]
**canonicalPath** | **string** |  | [optional] [default to undefined]
**category** | [**Category**](Category.md) |  | [optional] [default to undefined]
**question** | **string** |  | [optional] [default to undefined]
**conceptSummary** | **string** |  | [optional] [default to undefined]
**modelAnswerHtml** | **string** |  | [optional] [default to undefined]
**qnaQuestionId** | **number** |  | [optional] [default to undefined]
**publicAnswers** | [**Array&lt;Answer&gt;**](Answer.md) |  | [optional] [default to undefined]
**answerCount** | **number** |  | [optional] [default to undefined]
**publishedAt** | **string** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { KoanSeoDocumentResponse } from './api';

const instance: KoanSeoDocumentResponse = {
    resourceType,
    koanId,
    canonicalPath,
    category,
    question,
    conceptSummary,
    modelAnswerHtml,
    qnaQuestionId,
    publicAnswers,
    answerCount,
    publishedAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
