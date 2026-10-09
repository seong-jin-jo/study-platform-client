# QACourseSeedDevOnlyApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getState**](#getstate) | **GET** /api/v5/admin/qa/course-progress/state | 현재 수강 상태 조회|
|[**reset**](#reset) | **POST** /api/v5/admin/qa/course-progress/reset | 수강 상태 리셋|
|[**seed**](#seed) | **POST** /api/v5/admin/qa/course-progress/seed | 수강 상태 시드|

# **getState**
> BaseResponseQaCourseProgressStateResponse getState()

DEV 전용. courseId/memberId 에 대한 현재 진행/완주/뷰어 상태를 반환한다.

### Example

```typescript
import {
    QACourseSeedDevOnlyApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new QACourseSeedDevOnlyApi(configuration);

let courseId: number; // (default to undefined)
let memberId: number; // (default to undefined)

const { status, data } = await apiInstance.getState(
    courseId,
    memberId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **courseId** | [**number**] |  | defaults to undefined|
| **memberId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseQaCourseProgressStateResponse**

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

# **reset**
> BaseResponseQaCourseProgressStateResponse reset(qaCourseProgressResetRequest)

DEV 전용. 회원의 코스 진행/완주/등록/결제 기록을 제거해 미수강 상태로 되돌린다.

### Example

```typescript
import {
    QACourseSeedDevOnlyApi,
    Configuration,
    QaCourseProgressResetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new QACourseSeedDevOnlyApi(configuration);

let qaCourseProgressResetRequest: QaCourseProgressResetRequest; //

const { status, data } = await apiInstance.reset(
    qaCourseProgressResetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **qaCourseProgressResetRequest** | **QaCourseProgressResetRequest**|  | |


### Return type

**BaseResponseQaCourseProgressStateResponse**

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

# **seed**
> BaseResponseQaCourseProgressStateResponse seed(qaCourseProgressSeedRequest)

DEV 전용. 회원의 코스 수강 상태를 목표 상태로 직접 세팅한다(멱등).

### Example

```typescript
import {
    QACourseSeedDevOnlyApi,
    Configuration,
    QaCourseProgressSeedRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new QACourseSeedDevOnlyApi(configuration);

let qaCourseProgressSeedRequest: QaCourseProgressSeedRequest; //

const { status, data } = await apiInstance.seed(
    qaCourseProgressSeedRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **qaCourseProgressSeedRequest** | **QaCourseProgressSeedRequest**|  | |


### Return type

**BaseResponseQaCourseProgressStateResponse**

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

