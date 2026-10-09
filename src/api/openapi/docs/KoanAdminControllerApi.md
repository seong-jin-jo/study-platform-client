# KoanAdminControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**cancelSchedule**](#cancelschedule) | **POST** /api/v1/admin/koans/{koanId}/cancel-schedule | |
|[**edit**](#edit) | **PATCH** /api/v1/admin/koans/{koanId} | |
|[**inventory**](#inventory) | **GET** /api/v1/admin/koans/inventory | |
|[**list**](#list) | **GET** /api/v1/admin/koans | |
|[**publish**](#publish) | **POST** /api/v1/admin/koans/{koanId}/publish | |
|[**reject**](#reject) | **POST** /api/v1/admin/koans/{koanId}/reject | |
|[**viewed**](#viewed) | **POST** /api/v1/admin/koans/{koanId}/viewed | |

# **cancelSchedule**
> ApiEnvelopeMapStringObject cancelSchedule()


### Example

```typescript
import {
    KoanAdminControllerApi,
    Configuration,
    OAuth2User
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAdminControllerApi(configuration);

let koanId: number; // (default to undefined)
let principal: OAuth2User; // (default to undefined)

const { status, data } = await apiInstance.cancelSchedule(
    koanId,
    principal
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **koanId** | [**number**] |  | defaults to undefined|
| **principal** | **OAuth2User** |  | defaults to undefined|


### Return type

**ApiEnvelopeMapStringObject**

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

# **edit**
> ApiEnvelopeMapStringObject edit(editRequest)


### Example

```typescript
import {
    KoanAdminControllerApi,
    Configuration,
    OAuth2User,
    EditRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAdminControllerApi(configuration);

let koanId: number; // (default to undefined)
let principal: OAuth2User; // (default to undefined)
let editRequest: EditRequest; //

const { status, data } = await apiInstance.edit(
    koanId,
    principal,
    editRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **editRequest** | **EditRequest**|  | |
| **koanId** | [**number**] |  | defaults to undefined|
| **principal** | **OAuth2User** |  | defaults to undefined|


### Return type

**ApiEnvelopeMapStringObject**

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

# **inventory**
> ApiEnvelopeMapStringObject inventory()


### Example

```typescript
import {
    KoanAdminControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAdminControllerApi(configuration);

const { status, data } = await apiInstance.inventory();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiEnvelopeMapStringObject**

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

# **list**
> ApiEnvelopeMapStringObject list()


### Example

```typescript
import {
    KoanAdminControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAdminControllerApi(configuration);

let status: string; // (optional) (default to 'REVIEW_PENDING')
let page: number; // (optional) (default to 0)
let size: number; // (optional) (default to 20)

const { status, data } = await apiInstance.list(
    status,
    page,
    size
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **status** | [**string**] |  | (optional) defaults to 'REVIEW_PENDING'|
| **page** | [**number**] |  | (optional) defaults to 0|
| **size** | [**number**] |  | (optional) defaults to 20|


### Return type

**ApiEnvelopeMapStringObject**

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

# **publish**
> ApiEnvelopeMapStringObject publish(publishRequest)


### Example

```typescript
import {
    KoanAdminControllerApi,
    Configuration,
    OAuth2User,
    PublishRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAdminControllerApi(configuration);

let koanId: number; // (default to undefined)
let principal: OAuth2User; // (default to undefined)
let publishRequest: PublishRequest; //

const { status, data } = await apiInstance.publish(
    koanId,
    principal,
    publishRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **publishRequest** | **PublishRequest**|  | |
| **koanId** | [**number**] |  | defaults to undefined|
| **principal** | **OAuth2User** |  | defaults to undefined|


### Return type

**ApiEnvelopeMapStringObject**

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

# **reject**
> ApiEnvelopeMapStringObject reject(rejectRequest)


### Example

```typescript
import {
    KoanAdminControllerApi,
    Configuration,
    OAuth2User,
    RejectRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAdminControllerApi(configuration);

let koanId: number; // (default to undefined)
let principal: OAuth2User; // (default to undefined)
let rejectRequest: RejectRequest; //

const { status, data } = await apiInstance.reject(
    koanId,
    principal,
    rejectRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **rejectRequest** | **RejectRequest**|  | |
| **koanId** | [**number**] |  | defaults to undefined|
| **principal** | **OAuth2User** |  | defaults to undefined|


### Return type

**ApiEnvelopeMapStringObject**

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

# **viewed**
> viewed()


### Example

```typescript
import {
    KoanAdminControllerApi,
    Configuration,
    OAuth2User
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAdminControllerApi(configuration);

let koanId: number; // (default to undefined)
let principal: OAuth2User; // (default to undefined)

const { status, data } = await apiInstance.viewed(
    koanId,
    principal
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **koanId** | [**number**] |  | defaults to undefined|
| **principal** | **OAuth2User** |  | defaults to undefined|


### Return type

void (empty response body)

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

