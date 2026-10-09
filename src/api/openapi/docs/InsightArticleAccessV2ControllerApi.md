# InsightArticleAccessV2ControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getAccess**](#getaccess) | **GET** /api/v2/insight/articles/by-slug/{slug}/access | |

# **getAccess**
> InsightApiResponseArticleAccessResponse getAccess()


### Example

```typescript
import {
    InsightArticleAccessV2ControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new InsightArticleAccessV2ControllerApi(configuration);

let slug: string; // (default to undefined)

const { status, data } = await apiInstance.getAccess(
    slug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **slug** | [**string**] |  | defaults to undefined|


### Return type

**InsightApiResponseArticleAccessResponse**

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

