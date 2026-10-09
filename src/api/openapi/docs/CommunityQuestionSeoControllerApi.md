# CommunityQuestionSeoControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getSeoDocument3**](#getseodocument3) | **GET** /api/v1/community/questions/{questionId}/seo-document | 공개 질문과 답변 SEO projection|

# **getSeoDocument3**
> BaseResponseQuestionSeoDocumentResponse getSeoDocument3()


### Example

```typescript
import {
    CommunityQuestionSeoControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityQuestionSeoControllerApi(configuration);

let questionId: number; // (default to undefined)

const { status, data } = await apiInstance.getSeoDocument3(
    questionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **questionId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseQuestionSeoDocumentResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 공개 질문 SEO 문서 |  -  |
|**400** | questionId 형식 오류 |  -  |
|**404** | 공개 질문 없음 |  -  |
|**500** | SEO projection 무결성 오류 |  -  |
|**503** | 공개 dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

