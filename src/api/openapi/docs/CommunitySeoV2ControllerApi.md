# CommunitySeoV2ControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getSeoDocument**](#getseodocument) | **GET** /api/v2/community/posts/{postId}/seo-document | 공개 커뮤니티 글 safe SEO projection|

# **getSeoDocument**
> BaseResponseCommunitySeoV2DocumentResponse getSeoDocument()

전역 글은 FULL, 방 글은 TEASER만 반환

### Example

```typescript
import {
    CommunitySeoV2ControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunitySeoV2ControllerApi(configuration);

let postId: number; // (default to undefined)

const { status, data } = await apiInstance.getSeoDocument(
    postId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **postId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunitySeoV2DocumentResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 공개 커뮤니티 SEO 문서 |  -  |
|**400** | postId 형식 오류 |  -  |
|**404** | 색인 가능한 글 없음 |  -  |
|**500** | SEO projection 무결성 오류 |  -  |
|**503** | 공개 dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

