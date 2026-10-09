# AdminInsightSyncApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getRun**](#getrun) | **GET** /api/v1/admin/insight/sync/runs/{runId} | 동기화 실행 결과 조회|
|[**synchronize**](#synchronize) | **POST** /api/v1/admin/insight/sync | 개념글 FULL/INCREMENTAL 동기화 또는 dry-run|

# **getRun**
> BaseResponseInsightSyncResponse getRun()


### Example

```typescript
import {
    AdminInsightSyncApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminInsightSyncApi(configuration);

let runId: number; // (default to undefined)

const { status, data } = await apiInstance.getRun(
    runId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **runId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseInsightSyncResponse**

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

# **synchronize**
> BaseResponseInsightSyncResponse synchronize(insightSyncRequest)


### Example

```typescript
import {
    AdminInsightSyncApi,
    Configuration,
    InsightSyncRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminInsightSyncApi(configuration);

let insightSyncRequest: InsightSyncRequest; //

const { status, data } = await apiInstance.synchronize(
    insightSyncRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **insightSyncRequest** | **InsightSyncRequest**|  | |


### Return type

**BaseResponseInsightSyncResponse**

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

