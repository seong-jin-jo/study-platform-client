# SavedResourcesApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getSavedResources**](#getsavedresources) | **GET** /api/v1/saved-resources | 내 저장 목록 조회|
|[**setSaved**](#setsaved) | **PUT** /api/v1/saved-resources/{resourceType}/{resourceKey} | 저장 desired state 지정|

# **getSavedResources**
> BaseResponseSavedResourceListResponse getSavedResources()


### Example

```typescript
import {
    SavedResourcesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new SavedResourcesApi(configuration);

let cursor: string; // (optional) (default to undefined)
let size: number; // (optional) (default to 20)
let types: Array<string>; // (optional) (default to undefined)

const { status, data } = await apiInstance.getSavedResources(
    cursor,
    size,
    types
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **cursor** | [**string**] |  | (optional) defaults to undefined|
| **size** | [**number**] |  | (optional) defaults to 20|
| **types** | **Array&lt;string&gt;** |  | (optional) defaults to undefined|


### Return type

**BaseResponseSavedResourceListResponse**

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

# **setSaved**
> BaseResponseSavedResourceMutationResponse setSaved(setSavedResourceRequest)


### Example

```typescript
import {
    SavedResourcesApi,
    Configuration,
    SetSavedResourceRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new SavedResourcesApi(configuration);

let resourceType: string; // (default to undefined)
let resourceKey: string; // (default to undefined)
let setSavedResourceRequest: SetSavedResourceRequest; //

const { status, data } = await apiInstance.setSaved(
    resourceType,
    resourceKey,
    setSavedResourceRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **setSavedResourceRequest** | **SetSavedResourceRequest**|  | |
| **resourceType** | [**string**] |  | defaults to undefined|
| **resourceKey** | [**string**] |  | defaults to undefined|


### Return type

**BaseResponseSavedResourceMutationResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

