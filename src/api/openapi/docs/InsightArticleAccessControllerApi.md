# InsightArticleAccessControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getAccess1**](#getaccess1) | **GET** /api/v1/insight/articles/by-slug/{slug}/access | |

# **getAccess1**
> InsightApiResponseLegacyArticleAccessResponse getAccess1()


### Example

```typescript
import {
    InsightArticleAccessControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightArticleAccessControllerApi(configuration);

let slug: string; // (default to undefined)

const { status, data } = await apiInstance.getAccess1(
    slug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **slug** | [**string**] |  | defaults to undefined|


### Return type

**InsightApiResponseLegacyArticleAccessResponse**

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

