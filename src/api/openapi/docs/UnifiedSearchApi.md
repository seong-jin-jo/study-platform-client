# UnifiedSearchApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getSearchHealth**](#getsearchhealth) | **GET** /api/v1/admin/operations/search-health | |
|[**search**](#search) | **GET** /api/v1/search | |

# **getSearchHealth**
> BaseResponseSearchHealthResponse getSearchHealth()


### Example

```typescript
import {
    UnifiedSearchApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UnifiedSearchApi(configuration);

let windowDays: number; // (optional) (default to undefined)

const { status, data } = await apiInstance.getSearchHealth(
    windowDays
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **windowDays** | [**number**] |  | (optional) defaults to undefined|


### Return type

**BaseResponseSearchHealthResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **search**
> BaseResponseSearchResponse search()


### Example

```typescript
import {
    UnifiedSearchApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new UnifiedSearchApi(configuration);

let q: string; // (default to undefined)
let cursor: string; // (optional) (default to undefined)
let size: number; // (optional) (default to undefined)
let types: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.search(
    q,
    cursor,
    size,
    types
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **q** | [**string**] |  | defaults to undefined|
| **cursor** | [**string**] |  | (optional) defaults to undefined|
| **size** | [**number**] |  | (optional) defaults to undefined|
| **types** | [**string**] |  | (optional) defaults to undefined|


### Return type

**BaseResponseSearchResponse**

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

