# CohortApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getMyCohorts**](#getmycohorts) | **GET** /api/v1/cohorts/me | |
|[**getSegmentProof**](#getsegmentproof) | **GET** /api/v1/cohorts/{cohortId}/segment-proof | |

# **getMyCohorts**
> BaseResponseMyCohortsResponse getMyCohorts()


### Example

```typescript
import {
    CohortApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CohortApi(configuration);

const { status, data } = await apiInstance.getMyCohorts();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseMyCohortsResponse**

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

# **getSegmentProof**
> BaseResponseSegmentProofResponse getSegmentProof()


### Example

```typescript
import {
    CohortApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CohortApi(configuration);

let cohortId: number; // (default to undefined)

const { status, data } = await apiInstance.getSegmentProof(
    cohortId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **cohortId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseSegmentProofResponse**

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

