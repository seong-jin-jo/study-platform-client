# AdminCohortApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**assignMember**](#assignmember) | **POST** /api/v5/admin/cohorts/{cohortId}/members | |
|[**createCohort**](#createcohort) | **POST** /api/v5/admin/cohorts | |
|[**listByType**](#listbytype) | **GET** /api/v5/admin/cohorts | |

# **assignMember**
> BaseResponseVoid assignMember(adminCohortMemberAssignRequest)


### Example

```typescript
import {
    AdminCohortApi,
    Configuration,
    AdminCohortMemberAssignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminCohortApi(configuration);

let cohortId: number; // (default to undefined)
let adminCohortMemberAssignRequest: AdminCohortMemberAssignRequest; //

const { status, data } = await apiInstance.assignMember(
    cohortId,
    adminCohortMemberAssignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **adminCohortMemberAssignRequest** | **AdminCohortMemberAssignRequest**|  | |
| **cohortId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseVoid**

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

# **createCohort**
> BaseResponseMapStringLong createCohort(adminCohortCreateRequest)


### Example

```typescript
import {
    AdminCohortApi,
    Configuration,
    AdminCohortCreateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminCohortApi(configuration);

let adminCohortCreateRequest: AdminCohortCreateRequest; //

const { status, data } = await apiInstance.createCohort(
    adminCohortCreateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **adminCohortCreateRequest** | **AdminCohortCreateRequest**|  | |


### Return type

**BaseResponseMapStringLong**

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

# **listByType**
> BaseResponseAdminCohortListResponse listByType()


### Example

```typescript
import {
    AdminCohortApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new AdminCohortApi(configuration);

let type: 'SEMINAR' | 'INTEREST'; // (default to undefined)

const { status, data } = await apiInstance.listByType(
    type
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **type** | [**&#39;SEMINAR&#39; | &#39;INTEREST&#39;**]**Array<&#39;SEMINAR&#39; &#124; &#39;INTEREST&#39;>** |  | defaults to undefined|


### Return type

**BaseResponseAdminCohortListResponse**

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

