# CommunityRoomSeoControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getSeoDocument2**](#getseodocument2) | **GET** /api/v1/community/rooms/{roomId}/seo-document | 공개 공부방 SEO projection|

# **getSeoDocument2**
> BaseResponseRoomSeoDocumentResponse getSeoDocument2()

멤버 전용 글은 teaser만 포함

### Example

```typescript
import {
    CommunityRoomSeoControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomSeoControllerApi(configuration);

let roomId: number; // (default to undefined)

const { status, data } = await apiInstance.getSeoDocument2(
    roomId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **roomId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseRoomSeoDocumentResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 공개 방 SEO 문서 |  -  |
|**400** | roomId 형식 오류 |  -  |
|**404** | 활성 방 없음 |  -  |
|**500** | SEO projection 무결성 오류 |  -  |
|**503** | 공개 dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

