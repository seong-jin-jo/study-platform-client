# CommunitySeoControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getSeoDocument4**](#getseodocument4) | **GET** /api/v1/community/posts/{postId}/seo-document | |

# **getSeoDocument4**
> BaseResponseCommunitySeoDocumentResponse getSeoDocument4()


### Example

```typescript
import {
    CommunitySeoControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunitySeoControllerApi(configuration);

let postId: number; // (default to undefined)

const { status, data } = await apiInstance.getSeoDocument4(
    postId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **postId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunitySeoDocumentResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

