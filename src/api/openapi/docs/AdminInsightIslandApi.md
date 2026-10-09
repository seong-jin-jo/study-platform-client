# AdminInsightIslandApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**list1**](#list1) | **GET** /api/v1/admin/insight/islands | 섬 전체 조회 (DRAFT 포함)|
|[**update1**](#update1) | **PATCH** /api/v1/admin/insight/islands/{islandId} | 섬 이름·노출 순서·공개 여부 수정 (넘긴 항목만 바뀐다)|

# **list1**
> BaseResponseListAdminInsightIslandResponse list1()


### Example

```typescript
import {
    AdminInsightIslandApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminInsightIslandApi(configuration);

const { status, data } = await apiInstance.list1();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseListAdminInsightIslandResponse**

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

# **update1**
> BaseResponseAdminInsightIslandResponse update1(adminInsightIslandUpdateRequest)


### Example

```typescript
import {
    AdminInsightIslandApi,
    Configuration,
    AdminInsightIslandUpdateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminInsightIslandApi(configuration);

let islandId: number; // (default to undefined)
let adminInsightIslandUpdateRequest: AdminInsightIslandUpdateRequest; //

const { status, data } = await apiInstance.update1(
    islandId,
    adminInsightIslandUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **adminInsightIslandUpdateRequest** | **AdminInsightIslandUpdateRequest**|  | |
| **islandId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseAdminInsightIslandResponse**

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

